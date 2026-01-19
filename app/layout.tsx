import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Rajdhani } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                // Check localStorage first, fall back to system preference
                const stored = localStorage.getItem('darkMode');
                let isDark;

                if (stored !== null) {
                  isDark = stored === 'true';
                } else {
                  isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                }

                if (isDark) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }

                // Listen for system preference changes only if no user preference is stored
                if (stored === null) {
                  const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
                  const updateDarkMode = (e) => {
                    if (e.matches) {
                      document.documentElement.classList.add('dark');
                    } else {
                      document.documentElement.classList.remove('dark');
                    }
                  };
                  darkModeMediaQuery.addEventListener('change', updateDarkMode);
                }
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${rajdhani.variable} antialiased`}
      >
        <div id="splash-screen" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: '#000000',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          transition: 'opacity 0.3s ease-out',
        }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '20px',
          }}>
            <img
              src="/icon-512.png"
              alt="Ripit"
              style={{
                width: '200px',
                height: '200px',
                animation: 'pulse 2s ease-in-out infinite',
              }}
            />
            <div style={{
              fontFamily: 'var(--font-rajdhani)',
              fontSize: '48px',
              fontWeight: 700,
              color: '#EA580C',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              textShadow: '2px 2px 0 rgba(0, 0, 0, 0.5), 0 0 20px rgba(234, 88, 12, 0.3)',
            }}>
              RIPIT
            </div>
          </div>
          <div style={{
            position: 'absolute',
            bottom: '40px',
            left: '20px',
            right: '20px',
            height: '6px',
            backgroundColor: '#27272A',
            borderRadius: '0',
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              backgroundColor: '#EA580C',
              boxShadow: '0 0 20px rgba(234, 88, 12, 0.8)',
              animation: 'loadBar 2s ease-in-out infinite',
            }}></div>
          </div>
        </div>
        <style dangerouslySetInnerHTML={{
          __html: `
            @keyframes pulse {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.85; }
            }
            @keyframes loadBar {
              0% { width: 0%; }
              50% { width: 70%; }
              100% { width: 100%; }
            }
          `,
        }} />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const splash = document.getElementById('splash-screen');
                if (!splash) return;

                // Check if running as PWA
                const isPWA = window.matchMedia('(display-mode: standalone)').matches ||
                              window.navigator.standalone === true;

                // Check if mobile device
                const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                                window.innerWidth <= 768;

                // Only show splash on mobile PWA
                if (!isPWA || !isMobile) {
                  splash.style.display = 'none';
                  return;
                }

                function hideSplash() {
                  if (splash && splash.style.display !== 'none') {
                    splash.style.opacity = '0';
                    setTimeout(function() {
                      splash.style.display = 'none';
                    }, 300);
                  }
                }

                // Hide splash on DOMContentLoaded
                if (document.readyState === 'loading') {
                  document.addEventListener('DOMContentLoaded', hideSplash);
                } else {
                  hideSplash();
                }

                // Fallback: always hide after 3 seconds max
                setTimeout(hideSplash, 3000);
              })();
            `,
          }}
        />
        {children}
      </body>
    </html>
  );
}
