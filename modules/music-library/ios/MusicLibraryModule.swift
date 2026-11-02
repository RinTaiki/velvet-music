import ExpoModulesCore
import UIKit
import AVFoundation
import AVKit
import UniformTypeIdentifiers
import CryptoKit
import MediaPlayer
import AudioToolbox
import WidgetKit

public class MusicLibraryModule: Module {
  private var pickerDelegate: FolderPickerDelegate?

  public func definition() -> ModuleDefinition {
    Name("MusicLibrary")
    Constants(["widgetsEnabled": Bundle.main.object(forInfoDictionaryKey: "VelvetAppGroup") != nil])
    Events("trackCommand")

    OnCreate { _ = URLProtocol.registerClass(LocalArtworkProtocol.self) }

    AsyncFunction("pickFolder") { (promise: Promise) in
      guard self.pickerDelegate == nil else {
        promise.reject("PICKER_BUSY", "A folder picker is already open.")
        return
      }
      guard let presenter = self.appContext?.utilities?.currentViewController() else {
        promise.reject("NO_PRESENTER", "Cannot open Files right now.")
        return
      }
      let picker = UIDocumentPickerViewController(forOpeningContentTypes: [.folder], asCopy: false)
      picker.allowsMultipleSelection = false
      let delegate = FolderPickerDelegate { [weak self] url in
        self?.pickerDelegate = nil
        guard let url else { promise.resolve(nil); return }
        Task {
          do { promise.resolve(try await MusicImporter.importFolder(url)) }
          catch { promise.reject("IMPORT_FAILED", error.localizedDescription) }
        }
      }
      self.pickerDelegate = delegate
      picker.delegate = delegate
      presenter.present(picker, animated: true)
    }.runOnQueue(.main)

    AsyncFunction("importFiles") { (uris: [String]) -> [String: Any] in
      let urls = uris.compactMap { URL(string: $0) }
      return try await MusicImporter.importURLs(urls, name: "Imported music", folderId: nil)
    }

    AsyncFunction("updateWidgetState") { (state: [String: Any]) in
      guard let group = Bundle.main.object(forInfoDictionaryKey: "VelvetAppGroup") as? String,
        let directory = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: group) else {
        throw NSError(domain: "Velvet", code: 10, userInfo: [NSLocalizedDescriptionKey: "Rebuild Velvet with its widget extension and App Group to enable widgets."])
      }
      var snapshot = state
      if let uri = state["artworkUri"] as? String, let source = URL(string: uri), source.isFileURL {
        let documents = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0].resolvingSymlinksInPath().path + "/"
        let resolved = source.standardizedFileURL.resolvingSymlinksInPath()
        if resolved.path.hasPrefix(documents), FileManager.default.fileExists(atPath: resolved.path) {
          let name = SHA256.hash(data: Data(uri.utf8)).map { String(format: "%02x", $0) }.joined()
          let destination = directory.appendingPathComponent("cover-\(name).img")
          if !FileManager.default.fileExists(atPath: destination.path) { try Data(contentsOf: resolved).write(to: destination, options: .atomic) }
          snapshot["artwork"] = destination.path
        }
      }
      snapshot.removeValue(forKey: "artworkUri")
      snapshot["updatedAt"] = Date().timeIntervalSince1970
      try JSONSerialization.data(withJSONObject: snapshot).write(to: directory.appendingPathComponent("player.json"), options: .atomic)
      WidgetCenter.shared.reloadTimelines(ofKind: "VelvetNowPlaying")
      WidgetCenter.shared.reloadTimelines(ofKind: "VelvetQuickResume")
    }

    View(AirPlayRouteView.self) {}

  }
}

// URLSession doesn't load file:// artwork. This in-process protocol lets Expo
// load and cache it normally, without a server or fighting its metadata updates.
private class LocalArtworkProtocol: URLProtocol {
  override class func canInit(with request: URLRequest) -> Bool { request.url?.scheme == "velvet-artwork" }
  override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }
  override func startLoading() {
    guard let url = request.url else { return }
    let uri = URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems?.first(where: { $0.name == "uri" })?.value
    var data: Data?
    if let uri, let file = URL(string: uri), file.isFileURL {
      let root = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0].resolvingSymlinksInPath().path + "/"
      let resolved = file.standardizedFileURL.resolvingSymlinksInPath()
      if resolved.path.hasPrefix(root) { data = try? Data(contentsOf: resolved) }
    }
    if data == nil {
      let format = UIGraphicsImageRendererFormat(); format.scale = 1
      data = UIGraphicsImageRenderer(size: CGSize(width: 600, height: 600), format: format).image { context in
        UIColor(red: 0.25, green: 0.11, blue: 0.19, alpha: 1).setFill()
        context.fill(CGRect(x: 0, y: 0, width: 600, height: 600))
        let symbol = UIImage(systemName: "music.note", withConfiguration: UIImage.SymbolConfiguration(pointSize: 180))?.withTintColor(.white, renderingMode: .alwaysOriginal)
        symbol?.draw(in: CGRect(x: 210, y: 190, width: 180, height: 220))
      }.jpegData(compressionQuality: 0.85)
    }
    guard let data else { client?.urlProtocol(self, didFailWithError: URLError(.cannotDecodeContentData)); return }
    client?.urlProtocol(self, didReceive: URLResponse(url: url, mimeType: "image/jpeg", expectedContentLength: data.count, textEncodingName: nil), cacheStoragePolicy: .notAllowed)
    client?.urlProtocol(self, didLoad: data)
    client?.urlProtocolDidFinishLoading(self)
  }
  override func stopLoading() {}
}

private class FolderPickerDelegate: NSObject, UIDocumentPickerDelegate {
  let completion: (URL?) -> Void
  init(completion: @escaping (URL?) -> Void) { self.completion = completion }
  func documentPicker(_ controller: UIDocumentPickerViewController, didPickDocumentsAt urls: [URL]) { completion(urls.first) }
  func documentPickerWasCancelled(_ controller: UIDocumentPickerViewController) { completion(nil) }
}

class AirPlayRouteView: ExpoView {
  private let picker = AVRoutePickerView()
  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    picker.tintColor = .white
    picker.activeTintColor = UIColor(red: 0.98, green: 0.32, blue: 0.43, alpha: 1)
    picker.prioritizesVideoDevices = false
    addSubview(picker)
  }
  override func layoutSubviews() { super.layoutSubviews(); picker.frame = bounds }
}

private enum MusicImporter {
  static let extensions: Set<String> = ["mp3", "m4a", "aac", "wav", "aiff", "aif", "caf", "flac", "mp4"]
  static var documents: URL { FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0] }

  static func importFolder(_ folder: URL) async throws -> [String: Any] {
    let granted = folder.startAccessingSecurityScopedResource()
    defer { if granted { folder.stopAccessingSecurityScopedResource() } }
    var urls: [URL] = []
    var enumerationErrors: [String] = []
    guard let enumerator = FileManager.default.enumerator(at: folder,
      includingPropertiesForKeys: [.isRegularFileKey, .isSymbolicLinkKey], options: [.skipsHiddenFiles, .skipsPackageDescendants],
      errorHandler: { url, error in enumerationErrors.append("\(url.lastPathComponent): \(error.localizedDescription)"); return true }) else {
      throw NSError(domain: "Velvet", code: 1, userInfo: [NSLocalizedDescriptionKey: "This folder cannot be read. Download it from iCloud first and try again."])
    }
    for case let url as URL in enumerator {
      let values = try? url.resourceValues(forKeys: [.isRegularFileKey, .isSymbolicLinkKey])
      if values?.isSymbolicLink == true { enumerator.skipDescendants(); continue }
      if values?.isRegularFile == true && extensions.contains(url.pathExtension.lowercased()) { urls.append(url) }
    }
    var result = try await importURLs(urls.sorted { $0.path < $1.path }, name: folder.lastPathComponent,
      folderId: "folder-" + digest(Data(folder.absoluteString.utf8)))
    result["errors"] = (result["errors"] as? [String] ?? []) + enumerationErrors
    return result
  }

  static func importURLs(_ urls: [URL], name: String, folderId: String?) async throws -> [String: Any] {
    let fm = FileManager.default
    try fm.createDirectory(at: documents.appendingPathComponent("Music"), withIntermediateDirectories: true)
    try fm.createDirectory(at: documents.appendingPathComponent("Artwork"), withIntermediateDirectories: true)
    var tracks: [[String: Any]] = []
    var errors: [String] = []
    for url in urls {
      let access = url.startAccessingSecurityScopedResource()
      defer { if access { url.stopAccessingSecurityScopedResource() } }
      do {
        guard extensions.contains(url.pathExtension.lowercased()) else { continue }
        // NSFileCoordinator downloads/co-ordinates iCloud and third-party Files providers.
        let coordinator = NSFileCoordinator()
        var coordinationError: NSError?
        var copyError: Error?
        var imported: (String, String, Bool)?
        coordinator.coordinate(readingItemAt: url, options: [], error: &coordinationError) { readable in
          do {
            let id = try fileDigest(readable)
            let relative = "Music/\(id).\(url.pathExtension.lowercased())"
            let destination = documents.appendingPathComponent(relative)
            let created = !fm.fileExists(atPath: destination.path)
            if created {
              let temporary = documents.appendingPathComponent("Music/\(UUID().uuidString).partial")
              do { try fm.copyItem(at: readable, to: temporary); try fm.moveItem(at: temporary, to: destination) }
              catch { try? fm.removeItem(at: temporary); throw error }
            }
            imported = (id, relative, created)
          } catch { copyError = error }
        }
        if let error = coordinationError { throw error }
        if let error = copyError { throw error }
        guard let (id, relative, created) = imported else { continue }
        let asset = AVURLAsset(url: documents.appendingPathComponent(relative))
        guard (try? await asset.load(.isPlayable)) == true else {
          if created { try? fm.removeItem(at: documents.appendingPathComponent(relative)) }
          throw NSError(domain: "Velvet", code: 2, userInfo: [NSLocalizedDescriptionKey: "Unsupported or protected audio file."])
        }
        let metadata = (try? await asset.load(.commonMetadata)) ?? []
        var track: [String: Any] = ["id": id, "uri": relative, "filename": url.lastPathComponent,
          "title": url.deletingPathExtension().lastPathComponent, "artist": "Unknown artist", "album": "Imported music",
          "format": url.pathExtension.uppercased(),
          "addedAt": Date().timeIntervalSince1970 * 1000]
        // Read the source file's format, not the decoder's Float32 processing
        // format. Reading metadata does not alter or transcode the audio.
        if let audio = try? AVAudioFile(forReading: documents.appendingPathComponent(relative)) {
          let source = audio.fileFormat.streamDescription.pointee
          track["sampleRate"] = source.mSampleRate
          track["channels"] = source.mChannelsPerFrame
          if source.mBitsPerChannel > 0 { track["bitDepth"] = source.mBitsPerChannel }
          switch source.mFormatID {
          case kAudioFormatFLAC: track["codec"] = "FLAC"
          case kAudioFormatMPEGLayer3: track["codec"] = "MP3"
          case kAudioFormatLinearPCM: track["codec"] = "PCM"
          case kAudioFormatAppleLossless: track["codec"] = "ALAC"
          case kAudioFormatMPEG4AAC: track["codec"] = "AAC"
          default: break
          }
        }
        let parts = url.deletingPathExtension().lastPathComponent.components(separatedBy: " - ")
        if parts.count > 1 { track["artist"] = parts[0]; track["title"] = parts.dropFirst().joined(separator: " - ") }
        for item in metadata {
          switch item.commonKey {
          case .commonKeyTitle: if let text = try? await item.load(.stringValue), !text.isEmpty { track["title"] = text }
          case .commonKeyArtist: if let text = try? await item.load(.stringValue), !text.isEmpty { track["artist"] = text }
          case .commonKeyAlbumName: if let text = try? await item.load(.stringValue), !text.isEmpty { track["album"] = text }
          case .commonKeyArtwork:
            if let data = try? await item.load(.dataValue), let image = UIImage(data: data) {
              let path = "Artwork/\(id).jpg"
              let size = CGSize(width: 700, height: 700)
              let format = UIGraphicsImageRendererFormat(); format.scale = 1
              let thumbnail = UIGraphicsImageRenderer(size: size, format: format).image { _ in image.draw(in: CGRect(origin: .zero, size: size)) }
              if let jpg = thumbnail.jpegData(compressionQuality: 0.85) {
                do {
                  try jpg.write(to: documents.appendingPathComponent(path), options: .atomic)
                  track["artwork"] = path
                } catch { errors.append("\(url.lastPathComponent): artwork could not be saved.") }
              }
            }
          default: break
          }
        }
        if let duration = try? await asset.load(.duration) { let seconds = CMTimeGetSeconds(duration); if seconds.isFinite { track["duration"] = seconds } }
        tracks.append(track)
      } catch { errors.append("\(url.lastPathComponent): \(error.localizedDescription)") }
    }
    var result: [String: Any] = ["name": name, "tracks": tracks, "errors": errors]
    if let folderId { result["folderId"] = folderId }
    return result
  }

  static func digest(_ data: Data) -> String { SHA256.hash(data: data).map { String(format: "%02x", $0) }.joined() }
  static func fileDigest(_ url: URL) throws -> String {
    let handle = try FileHandle(forReadingFrom: url)
    defer { try? handle.close() }
    var hasher = SHA256()
    while let data = try handle.read(upToCount: 1024 * 1024), !data.isEmpty { hasher.update(data: data) }
    return hasher.finalize().map { String(format: "%02x", $0) }.joined()
  }
}
