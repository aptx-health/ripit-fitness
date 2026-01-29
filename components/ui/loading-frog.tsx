'use client';

import { useState, useEffect } from 'react';

interface LoadingFrogProps {
  size?: number;
  speed?: number;
}

export function LoadingFrog({ size = 64, speed = 1 }: LoadingFrogProps) {
  const [mode, setMode] = useState<'light' | 'dark'>('dark');
  const endPosition = -(size * 5);

  useEffect(() => {
    // Read the current mode from the document root
    const currentMode = document.documentElement.dataset.mode as 'light' | 'dark' || 'dark';
    setMode(currentMode);

    // Listen for mode changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'data-mode') {
          const newMode = document.documentElement.dataset.mode as 'light' | 'dark' || 'dark';
          setMode(newMode);
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-mode'],
    });

    return () => observer.disconnect();
  }, []);

  const spriteUrl = mode === 'light'
    ? '/green-frog-squat-1-light.png'
    : '/green-frog-squat-1.png';

  return (
    <div
      className="loading-frog"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        backgroundImage: `url(${spriteUrl})`,
        backgroundSize: `${size * 5}px ${size}px`,
        backgroundRepeat: 'no-repeat',
        animation: `frog-squat ${speed}s steps(5) infinite`,
        // @ts-ignore - CSS custom property
        '--frog-end-position': `${endPosition}px`,
      }}
    />
  );
}
