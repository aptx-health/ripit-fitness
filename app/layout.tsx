import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Rajdhani } from "next/font/google";
import "./globals.css";
import { ThemeInitializer } from "@/components/ThemeInitializer";
import { ToastProvider } from "@/components/ToastProvider";

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
  viewportFit: "cover",
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
    <html lang="en" data-theme="ripit" data-mode="dark" className="dark" suppressHydrationWarning>
      <head>
        <link rel="preload" href="/green-frog-squat-1.png" as="image" type="image/png" />
        <link rel="preload" href="/green-frog-squat-1-light.png" as="image" type="image/png" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                // Theme System: Load preference with migration support
                const STORAGE_KEY = 'themePreference';
                const OLD_STORAGE_KEY = 'darkMode';
                const COOKIE_KEY = 'theme_pref';
                const DEFAULT_THEME = 'ripit';

                let themeName = DEFAULT_THEME;
                let mode = 'dark';
                let hasStored = false;

                // Check for new format first
                const stored = localStorage.getItem(STORAGE_KEY);
                if (stored) {
                  try {
                    const parsed = JSON.parse(stored);
                    themeName = parsed.themeName || DEFAULT_THEME;
                    mode = parsed.mode || 'dark';
                    hasStored = true;
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
                    hasStored = true;
                  } else {
                    // Fallback: check cookie (survives iOS localStorage eviction)
                    // Keep in sync with THEMES/MODES in lib/theme.ts
                    var VALID_THEMES = ['ripit','doom','catppuccin','cyber','forest','synthwave','dracula','github','clyde','ninety','blossom','okabe'];
                    var VALID_MODES = ['light','dark'];
                    var cookies = document.cookie.split(';');
                    for (var i = 0; i < cookies.length; i++) {
                      var parts = cookies[i].trim().split('=');
                      if (parts[0] === COOKIE_KEY && parts[1]) {
                        var vals = parts[1].split(':');
                        if (vals.length === 2 && VALID_THEMES.indexOf(vals[0]) !== -1 && VALID_MODES.indexOf(vals[1]) !== -1) {
                          themeName = vals[0];
                          mode = vals[1];
                          hasStored = true;
                          // Re-populate localStorage from cookie
                          try {
                            localStorage.setItem(STORAGE_KEY, JSON.stringify({ themeName: themeName, mode: mode }));
                          } catch (e) {}
                        }
                        break;
                      }
                    }
                    if (!hasStored) {
                      // Use system preference
                      mode = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                    }
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

                // Ensure cookie is always in sync (populates cookie for existing users)
                if (hasStored) {
                  document.cookie = COOKIE_KEY + '=' + themeName + ':' + mode + ';path=/;max-age=31536000;SameSite=Lax';
                }

                // Listen for system preference changes (only if no stored preference)
                if (!hasStored) {
                  const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
                  const updateMode = (e) => {
                    const newMode = e.matches ? 'dark' : 'light';
                    root.dataset.mode = newMode;
                    if (newMode === 'dark') {
                      root.classList.add('dark');
                    } else {
                      root.classList.remove('dark');
                    }
                    // Notify React components so theme toggle icon updates
                    window.dispatchEvent(new Event('themechange'));
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
        <ThemeInitializer />
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
