export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function() {
              var root = document.documentElement;
              var themeName = 'ripit';
              var mode = 'dark';
              var stored = localStorage.getItem('themePreference');
              if (stored) {
                try {
                  var parsed = JSON.parse(stored);
                  themeName = parsed.themeName || 'ripit';
                  mode = parsed.mode || 'dark';
                } catch (e) {}
              } else {
                mode = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
              }
              root.dataset.theme = themeName;
              root.dataset.mode = mode;
              if (mode === 'dark') { root.classList.add('dark'); } else { root.classList.remove('dark'); }
              if (!stored && !window.__authThemeListenerAttached) {
                var mql = window.matchMedia('(prefers-color-scheme: dark)');
                mql.addEventListener('change', function(e) {
                  root.dataset.mode = e.matches ? 'dark' : 'light';
                  if (e.matches) { root.classList.add('dark'); } else { root.classList.remove('dark'); }
                });
                window.__authThemeListenerAttached = true;
              }
            })();
          `,
        }}
      />
      {children}
    </>
  )
}
