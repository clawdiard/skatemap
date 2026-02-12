import NotificationSettings from '../components/NotificationSettings';
import { Link } from 'react-router-dom';

export default function SettingsPage() {
  return (
    <div className="dark min-h-screen bg-gray-950 text-gray-100">
      <header className="border-b border-gray-800 px-4 py-3">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <Link to="/" className="text-green-400 hover:text-green-300 text-sm">&larr; Home</Link>
          <h1 className="text-lg font-bold">Settings</h1>
        </div>
      </header>
      <main className="py-6">
        <NotificationSettings />
      </main>
    </div>
  );
}
