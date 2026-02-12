import { Link } from 'react-router-dom';
import { NotificationBell } from './NotificationBell';

export function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-gray-900/95 backdrop-blur border-b border-gray-800">
      <div className="flex items-center justify-between h-14 px-4 max-w-5xl mx-auto">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-xl font-bold bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent">
            ParkCheck
          </span>
        </Link>
        <div className="flex items-center gap-3 text-gray-400">
          <NotificationBell />
          <span className="text-sm">🛹 NYC</span>
        </div>
      </div>
    </header>
  );
}
