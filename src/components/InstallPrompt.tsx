import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(() => localStorage.getItem('pwa-install-dismissed') === 'true');
  const [visitCount] = useState(() => {
    const count = parseInt(localStorage.getItem('pwa-visit-count') || '0', 10) + 1;
    localStorage.setItem('pwa-visit-count', String(count));
    return count;
  });

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!deferredPrompt || dismissed || visitCount < 2) return null;

  const install = async () => {
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setDeferredPrompt(null);
    else {
      setDismissed(true);
      localStorage.setItem('pwa-install-dismissed', 'true');
    }
  };

  const dismiss = () => {
    setDismissed(true);
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 bg-slate-800 border border-green-500 rounded-lg p-4 flex items-center justify-between z-50 shadow-lg">
      <span className="text-sm text-white">📲 Install ParkCheck for quick access</span>
      <div className="flex gap-2">
        <button onClick={dismiss} className="text-xs text-slate-400 hover:text-white">Dismiss</button>
        <button onClick={install} className="text-xs bg-green-500 text-black px-3 py-1 rounded font-medium hover:bg-green-400">Install</button>
      </div>
    </div>
  );
}
