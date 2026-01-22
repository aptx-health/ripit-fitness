import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Rajdhani } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const rajdhani = Rajdhani({
  weight: ['500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-rajdhani',
  display: 'swap',
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: "Ripit - Strength Training Tracker",
  description: "Track your strength training workouts",
  manifest: "/site.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Ripit",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                // Theme System: Load preference with migration support
                const STORAGE_KEY = 'themePreference';
                const OLD_STORAGE_KEY = 'darkMode';
                const DEFAULT_THEME = 'ripit';

                let themeName = DEFAULT_THEME;
                let mode = 'dark';

                // Check for new format first
                const stored = localStorage.getItem(STORAGE_KEY);
                if (stored) {
                  try {
                    const parsed = JSON.parse(stored);
                    themeName = parsed.themeName || DEFAULT_THEME;
                    mode = parsed.mode || 'dark';
                  } catch (e) {
                    console.error('Failed to parse theme preference:', e);
                  }
                } else {
                  // Migrate from old darkMode format
                  const oldValue = localStorage.getItem(OLD_STORAGE_KEY);
                  if (oldValue !== null) {
                    mode = oldValue === 'true' ? 'dark' : 'light';
                    // Save in new format
                    const preference = { themeName: DEFAULT_THEME, mode: mode };
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(preference));
                    // Remove old key
                    localStorage.removeItem(OLD_STORAGE_KEY);
                  } else {
                    // Use system preference
                    mode = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                  }
                }

                // Apply theme to document root
                const root = document.documentElement;
                root.dataset.theme = themeName;
                root.dataset.mode = mode;

                // Maintain legacy .dark class for backward compatibility
                if (mode === 'dark') {
                  root.classList.add('dark');
                } else {
                  root.classList.remove('dark');
                }

                // Listen for system preference changes (only if no stored preference)
                if (!stored && !localStorage.getItem(OLD_STORAGE_KEY)) {
                  const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
                  const updateMode = (e) => {
                    const newMode = e.matches ? 'dark' : 'light';
                    root.dataset.mode = newMode;
                    if (newMode === 'dark') {
                      root.classList.add('dark');
                    } else {
                      root.classList.remove('dark');
                    }
                  };
                  darkModeMediaQuery.addEventListener('change', updateMode);
                }
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${rajdhani.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
