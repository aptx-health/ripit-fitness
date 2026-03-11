import { useSyncExternalStore } from 'react';

function subscribe(callback: () => void): () => void {
  const observer = new MutationObserver(() => callback());
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-mode'],
  });
  return () => observer.disconnect();
}

function getSnapshot(): 'light' | 'dark' {
  return (document.documentElement.dataset.mode as 'light' | 'dark') || 'dark';
}

function getServerSnapshot(): 'light' | 'dark' {
  return 'dark';
}

export function useThemeMode(): 'light' | 'dark' {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
