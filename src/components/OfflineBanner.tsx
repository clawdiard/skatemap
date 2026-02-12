import { useOnlineStatus } from '../hooks/useOnlineStatus';

export function OfflineBanner() {
  const online = useOnlineStatus();
  if (online) return null;
  return (
    <div className="bg-yellow-500 text-black text-center text-sm py-1 px-2 font-medium">
      📡 You're offline — showing cached data
    </div>
  );
}
