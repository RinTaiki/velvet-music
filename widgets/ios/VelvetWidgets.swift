import WidgetKit
import SwiftUI
import UIKit

extension View {
  @ViewBuilder func velvetAccessoryBackground() -> some View {
    if #available(iOS 17.0, *) { self.containerBackground(Color.clear, for: .widget) }
    else { self }
  }
}

struct VelvetEntry: TimelineEntry {
  let date: Date
  let title: String
  let artist: String
  let artwork: String?
  let playing: Bool
  let trackCount: Int
  static let placeholder = VelvetEntry(date: Date(), title: "Your own frequency", artist: "Open Velvet to add your music", artwork: nil, playing: false, trackCount: 0)
}

struct VelvetProvider: TimelineProvider {
  func placeholder(in context: Context) -> VelvetEntry { .placeholder }
  func getSnapshot(in context: Context, completion: @escaping (VelvetEntry) -> Void) { completion(read()) }
  func getTimeline(in context: Context, completion: @escaping (Timeline<VelvetEntry>) -> Void) {
    completion(Timeline(entries: [read()], policy: .after(Date().addingTimeInterval(30 * 60))))
  }
  private func read() -> VelvetEntry {
    guard let group = Bundle.main.object(forInfoDictionaryKey: "VelvetAppGroup") as? String,
      let directory = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: group),
      let data = try? Data(contentsOf: directory.appendingPathComponent("player.json")),
      let state = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { return .placeholder }
    return VelvetEntry(date: Date(), title: state["title"] as? String ?? "Velvet", artist: state["artist"] as? String ?? "Your library",
      artwork: state["artwork"] as? String, playing: state["playing"] as? Bool ?? false, trackCount: state["trackCount"] as? Int ?? 0)
  }
}

struct VelvetCover: View {
  let path: String?
  var body: some View {
    if let path, let image = UIImage(contentsOfFile: path) {
      Image(uiImage: image).resizable().scaledToFill()
    } else {
      ZStack {
        LinearGradient(colors: [Color(red: 0.5, green: 0.13, blue: 0.29), Color(red: 0.12, green: 0.09, blue: 0.2)], startPoint: .topLeading, endPoint: .bottomTrailing)
        Image(systemName: "music.note").font(.system(size: 30, weight: .light)).foregroundStyle(.white.opacity(0.8))
      }
    }
  }
}
struct VelvetWidgetView: View {
  @Environment(\.widgetFamily) var family
  let entry: VelvetEntry
  var body: some View {
    if #available(iOS 17.0, *) { content.containerBackground(Color(red: 0.09, green: 0.07, blue: 0.11), for: .widget) }
    else { content.padding().background(Color(red: 0.09, green: 0.07, blue: 0.11)) }
  }
  @ViewBuilder var content: some View {
    if family == .systemSmall {
      VStack(alignment: .leading, spacing: 7) {
        HStack { Text("VELVET").font(.system(size: 9, weight: .bold)).tracking(2); Spacer(); Image(systemName: "waveform").foregroundStyle(.pink) }
        VelvetCover(path: entry.artwork).frame(maxWidth: .infinity, maxHeight: .infinity).clipShape(RoundedRectangle(cornerRadius: 10))
        Text(entry.title).font(.system(size: 13, weight: .semibold)).lineLimit(1)
        Text(entry.artist).font(.system(size: 10)).foregroundStyle(.secondary).lineLimit(1)
      }.widgetURL(URL(string: "velvet://player?action=resume")).foregroundStyle(.white)
    } else {
      HStack(spacing: 15) {
        VelvetCover(path: entry.artwork).frame(width: 100, height: 110).clipShape(RoundedRectangle(cornerRadius: 14))
        VStack(alignment: .leading, spacing: 7) {
          Text(entry.playing ? "NOW PLAYING" : "PICK UP WHERE YOU LEFT OFF").font(.system(size: 8, weight: .bold)).tracking(1.2).foregroundStyle(.pink)
          Text(entry.title).font(.system(size: 17, weight: .bold)).lineLimit(1)
          Text(entry.artist).font(.system(size: 12)).foregroundStyle(.secondary).lineLimit(1)
          Spacer(minLength: 2)
          HStack(spacing: 25) {
            Link(destination: URL(string: "velvet://player?action=previous")!) { Image(systemName: "backward.end.fill") }
            Link(destination: URL(string: "velvet://player?action=resume")!) { Image(systemName: "play.circle.fill").font(.system(size: 29)).foregroundStyle(.pink) }
            Link(destination: URL(string: "velvet://player?action=next")!) { Image(systemName: "forward.end.fill") }
          }.font(.system(size: 16)).accessibilityLabel("Open Velvet to control playback")
        }
      }.widgetURL(URL(string: "velvet://player?action=open")).foregroundStyle(.white)
    }
  }
}
struct VelvetNowPlaying: Widget {
  let kind = "VelvetNowPlaying"
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: VelvetProvider()) { entry in VelvetWidgetView(entry: entry) }
      .configurationDisplayName("Velvet Player")
      .description("Your latest song and a shortcut to resume your saved queue.")
      .supportedFamilies([.systemSmall, .systemMedium])
  }
}
struct VelvetLockWidget: Widget {
  let kind = "VelvetQuickResume"
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: VelvetProvider()) { entry in
      HStack(spacing: 8) {
        VelvetCover(path: entry.artwork).frame(width: 36, height: 36).clipShape(RoundedRectangle(cornerRadius: 6))
        VStack(alignment: .leading, spacing: 2) { Text(entry.title).font(.headline).lineLimit(1); Text(entry.artist).font(.caption).lineLimit(1) }
        Spacer(minLength: 0)
        Image(systemName: "play.fill")
      }.widgetURL(URL(string: "velvet://player?action=resume")).velvetAccessoryBackground()
    }.configurationDisplayName("Velvet · Resume")
      .description("Album cover, artist, and a shortcut back to your music.")
      .supportedFamilies([.accessoryRectangular])
  }
}
@main
struct VelvetWidgetBundle: WidgetBundle {
  var body: some Widget { VelvetNowPlaying(); VelvetLockWidget() }
}
