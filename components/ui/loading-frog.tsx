interface LoadingFrogProps {
  size?: number;
  speed?: number;
}

export function LoadingFrog({ size = 64, speed = 1 }: LoadingFrogProps) {
  const endPosition = -(size * 5);

  return (
    <div
      className="loading-frog"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        backgroundImage: 'url(/green-frog-squat-1.png)',
        backgroundSize: `${size * 5}px ${size}px`,
        backgroundRepeat: 'no-repeat',
        animation: `frog-squat ${speed}s steps(5) infinite`,
        // @ts-ignore - CSS custom property
        '--frog-end-position': `${endPosition}px`,
      }}
    />
  );
}
