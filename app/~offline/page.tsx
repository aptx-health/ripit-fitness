export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] p-4">
      <h1 className="text-2xl font-bold mb-2">You are offline</h1>
      <p className="text-[var(--color-text-secondary)]">
        Check your connection and try again.
      </p>
    </div>
  );
}
