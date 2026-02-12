export function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export const featureIcons: Record<string, string> = {
  ledge: '🪨',
  rail: '🔩',
  stairs: '🪜',
  bank: '📐',
  bowl: '🥣',
  mini_ramp: '⛰️',
  flat_bar: '➖',
  manual_pad: '🟫',
  gap: '↔️',
  quarter_pipe: '🌊',
  flat_ground: '⬜',
};

export function statusBadge(status: string | null): { label: string; classes: string } {
  switch (status) {
    case 'dry':
      return { label: '✅ Dry', classes: 'bg-green-900/60 text-green-400 border-green-700' };
    case 'partially_wet':
      return { label: '🟡 Partially Wet', classes: 'bg-yellow-900/60 text-yellow-400 border-yellow-700' };
    case 'wet':
      return { label: '❌ Wet', classes: 'bg-red-900/60 text-red-400 border-red-700' };
    case 'closed':
      return { label: '🚫 Closed', classes: 'bg-gray-800 text-gray-400 border-gray-600' };
    default:
      return { label: '⚪ No Reports', classes: 'bg-gray-800 text-gray-400 border-gray-600' };
  }
}

export const boroughColors: Record<string, string> = {
  manhattan: 'bg-purple-900/50 text-purple-400 border-purple-700',
  brooklyn: 'bg-blue-900/50 text-blue-400 border-blue-700',
  queens: 'bg-yellow-900/50 text-yellow-400 border-yellow-700',
  bronx: 'bg-orange-900/50 text-orange-400 border-orange-700',
  staten_island: 'bg-teal-900/50 text-teal-400 border-teal-700',
};
