import { getLevelInfo, type ReputationLevel } from '../services/reputation';

interface ReputationBadgeProps {
  reputation: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  showPoints?: boolean;
}

const SIZE_CLASSES = {
  sm: 'text-sm px-1.5 py-0.5',
  md: 'text-base px-2 py-1',
  lg: 'text-lg px-3 py-1.5',
};

const LEVEL_COLORS: Record<ReputationLevel, string> = {
  rookie: 'bg-gray-700/60 border-gray-500 text-gray-300',
  regular: 'bg-orange-800/60 border-orange-500 text-orange-300',
  local: 'bg-yellow-800/60 border-yellow-500 text-yellow-300',
  legend: 'bg-purple-800/60 border-purple-400 text-purple-200',
};

export function ReputationBadge({ reputation, size = 'md', showLabel = true, showPoints = false }: ReputationBadgeProps) {
  const info = getLevelInfo(reputation);
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border font-medium ${SIZE_CLASSES[size]} ${LEVEL_COLORS[info.level]}`}
    >
      <span>{info.badge}</span>
      {showLabel && <span>{info.label}</span>}
      {showPoints && <span className="opacity-70 text-xs ml-0.5">({reputation})</span>}
    </span>
  );
}
