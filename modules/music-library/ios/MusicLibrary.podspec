Pod::Spec.new do |s|
  s.name = 'MusicLibrary'
  s.version = '1.0.0'
  s.summary = 'User-selected folder import, artwork metadata, and AirPlay for Velvet'
  s.description = s.summary
  s.author = 'Velvet'
  s.homepage = 'https://expo.dev'
  s.license = { :type => 'MIT' }
  s.platforms = { :ios => '16.4' }
  s.source = { :git => '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.frameworks = 'AVFoundation', 'AVKit', 'MediaPlayer', 'UniformTypeIdentifiers', 'CryptoKit', 'WidgetKit'
  s.swift_version = '5.0'
  s.source_files = '**/*.{h,m,mm,swift}'
end
