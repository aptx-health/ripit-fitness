'use client';

import { useThemeMode } from '@/hooks/useThemeMode';

interface LoadingFrogProps {
  size?: number;
  speed?: number;
}

export function LoadingFrog({ size = 64, speed = 1 }: LoadingFrogProps) {
  const mode = useThemeMode();
  const endPosition = -(size * 5);

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
        // @ts-expect-error - CSS custom property
        '--frog-end-position': `${endPosition}px`,
      }}
    />
  );
}
