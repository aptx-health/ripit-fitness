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
              var COOKIE_KEY = 'theme_pref';
              var themeName = 'ripit';
              var mode = 'dark';
              var hasStored = false;
              var stored = localStorage.getItem('themePreference');
              if (stored) {
                try {
                  var parsed = JSON.parse(stored);
                  themeName = parsed.themeName || 'ripit';
                  mode = parsed.mode || 'dark';
                  hasStored = true;
                } catch (e) {}
              } else {
                // Fallback: check cookie (survives iOS localStorage eviction)
                var cookies = document.cookie.split(';');
                for (var i = 0; i < cookies.length; i++) {
                  var parts = cookies[i].trim().split('=');
                  if (parts[0] === COOKIE_KEY && parts[1]) {
                    var vals = parts[1].split(':');
                    if (vals.length === 2) {
                      themeName = vals[0];
                      mode = vals[1];
                      hasStored = true;
                      try { localStorage.setItem('themePreference', JSON.stringify({ themeName: themeName, mode: mode })); } catch (e) {}
                    }
                    break;
                  }
                }
                if (!hasStored) {
                  mode = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                }
              }
              root.dataset.theme = themeName;
              root.dataset.mode = mode;
              if (mode === 'dark') { root.classList.add('dark'); } else { root.classList.remove('dark'); }
              // Ensure cookie is always in sync
              if (hasStored) {
                document.cookie = COOKIE_KEY + '=' + themeName + ':' + mode + ';path=/;max-age=31536000;SameSite=Lax';
              }
              if (!hasStored && !window.__authThemeListenerAttached) {
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
