const AUDIO_EXTENSIONS = ['mp3', 'flac', 'wav', 'm4a', 'aac', 'aiff', 'aif', 'caf', 'mp4'];
function extension(name = '') { return name.split(/[?#]/)[0].split('.').pop().toLowerCase(); }
function isAudioFile(name) { return AUDIO_EXTENSIONS.includes(extension(name)); }
function qualityLabel(track) {
  const format = (track.format || extension(track.filename || track.uri) || 'Audio').toUpperCase();
  const lossless = track.codec ? ['PCM', 'ALAC', 'FLAC'].includes(track.codec) : format === 'FLAC';
  return `${format} · ${lossless ? 'LOSSLESS SOURCE' : 'ORIGINAL FILE'}`;
}
function qualityDescription(track, rate = 1) {
  const specifications = [qualityLabel(track)];
  if (track.sampleRate) specifications.push(`${track.sampleRate / 1000} kHz`);
  if (track.bitDepth) specifications.push(`${track.bitDepth}-bit`);
  if (track.channels) specifications.push(`${track.channels} channel${track.channels === 1 ? '' : 's'}`);
  return `${specifications.join(' · ')}\n\nVelvet plays the imported file directly. It does not re-encode, compress, or replace your audio with a stream.\n\n${(track.format || extension(track.filename || track.uri)).toLowerCase() === 'mp3' ? 'MP3 keeps its existing encoded quality; it cannot become lossless. ' : ''}Output quality and sample rate depend on iOS, your audio route, and your DAC/headphones. Bluetooth may use a lossy codec. Bit-perfect output is not guaranteed.${rate !== 1 ? `\n\nPlayback speed is ${rate}×. Choose 1× for original-speed playback.` : ''}`;
}
module.exports = { AUDIO_EXTENSIONS, extension, isAudioFile, qualityLabel, qualityDescription };
