import { useState, useEffect, useCallback } from 'react';
import { isSignedIn, getUser, signOut, startDeviceFlow, type GitHubUser } from '../utils/auth';

export default function AuthButton() {
  const [user, setUser] = useState<GitHubUser | null>(getUser());
  const [flowActive, setFlowActive] = useState(false);
  const [deviceCode, setDeviceCode] = useState<{ code: string; uri: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isSignedIn()) setUser(getUser());
  }, []);

  const handleSignIn = useCallback(async () => {
    setFlowActive(true);
    setError(null);
    try {
      const u = await startDeviceFlow((code, uri) => {
        setDeviceCode({ code, uri });
      });
      setUser(u);
      setDeviceCode(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setFlowActive(false);
    }
  }, []);

  const handleSignOut = () => {
    signOut();
    setUser(null);
  };

  if (user) {
    return (
      <div className="flex items-center gap-2">
        <img src={user.avatar_url} alt={user.login} className="w-8 h-8 rounded-full" />
        <span className="text-sm text-gray-300">@{user.login}</span>
        <button
          onClick={handleSignOut}
          className="text-xs text-gray-500 hover:text-gray-300 ml-1"
        >
          Sign out
        </button>
      </div>
    );
  }

  if (flowActive && deviceCode) {
    return (
      <div className="text-center space-y-2 p-4 rounded-lg bg-gray-900 border border-gray-700">
        <p className="text-sm text-gray-300">
          Go to{' '}
          <a
            href={deviceCode.uri}
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-400 underline"
          >
            {deviceCode.uri}
          </a>
        </p>
        <p className="text-2xl font-mono font-bold text-white tracking-widest">
          {deviceCode.code}
        </p>
        <p className="text-xs text-gray-500">Enter this code to sign in with GitHub</p>
        <div className="flex items-center justify-center gap-1 text-gray-500">
          <span className="animate-pulse">●</span>
          <span className="text-xs">Waiting for authorization...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <button
        onClick={handleSignIn}
        disabled={flowActive}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 text-sm text-gray-200 transition disabled:opacity-50"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
        </svg>
        Sign in with GitHub
      </button>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
