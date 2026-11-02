function restoreSession(saved, tracks) {
  if (!saved || !Array.isArray(saved.queue)) return null;
  const known = new Set(tracks.map(t => t.id));
  const queue = saved.queue.filter(id => typeof id === 'string' && known.has(id));
  if (!queue.length) return null;
  const originalIndex = Number.isInteger(saved.index) ? Math.max(0, saved.index) : 0;
  const currentId = saved.queue[originalIndex];
  const index = Math.min(saved.queue.slice(0, originalIndex).filter(id => known.has(id)).length, queue.length - 1);
  const originalQueue = Array.isArray(saved.originalQueue) ? saved.originalQueue.filter(id => known.has(id)) : [];
  return { queue, index, position: known.has(currentId) && Number.isFinite(saved.position) ? Math.max(0, saved.position) : 0,
    repeat: ['off', 'all', 'one'].includes(saved.repeat) ? saved.repeat : 'off', shuffle: saved.shuffle === true,
    originalQueue: originalQueue.length ? originalQueue : [...queue] };
}
function parsePlayerLink(link) {
  try {
    const url = new URL(link);
    if (url.protocol !== 'velvet:' || url.hostname !== 'player') return null;
    const action = url.searchParams.get('action') || 'open';
    return ['open', 'resume', 'toggle', 'next', 'previous'].includes(action) ? action : null;
  } catch { return null; }
}
const nativeLoop = repeat => repeat === 'one' ? 'single' : repeat === 'all' ? 'all' : 'none';
const shouldDismissPlayer = (distance, velocity) => distance > 100 || distance > 28 && velocity > 0.85;
module.exports = { restoreSession, parsePlayerLink, nativeLoop, shouldDismissPlayer };
