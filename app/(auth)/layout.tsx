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
              // Storage can throw (blocked or private mode): the cookie fallback below still applies
              var stored = null;
              try { stored = localStorage.getItem('themePreference'); } catch (e) {}
              if (stored) {
                try {
                  var parsed = JSON.parse(stored);
                  themeName = parsed.themeName || 'ripit';
                  mode = parsed.mode || 'dark';
                  hasStored = true;
                  if (themeName === 'eink') mode = 'light';
                } catch (e) {}
              } else {
                // Fallback: check cookie (survives iOS localStorage eviction)
                // Keep in sync with THEMES/MODES in lib/theme.ts
                var VALID_THEMES = ['ripit','doom','catppuccin','cyber','forest','synthwave','dracula','github','clyde','ninety','blossom','okabe','eink'];
                var VALID_MODES = ['light','dark'];
                var cookies = document.cookie.split(';');
                for (var i = 0; i < cookies.length; i++) {
                  var parts = cookies[i].trim().split('=');
                  if (parts[0] === COOKIE_KEY && parts[1]) {
                    var vals = parts[1].split(':');
                    if (vals.length === 2 && VALID_THEMES.indexOf(vals[0]) !== -1 && VALID_MODES.indexOf(vals[1]) !== -1) {
                      themeName = vals[0];
                      mode = vals[0] === 'eink' ? 'light' : vals[1];
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
              // E-ink display (any theme): localStorage, else the cookie. Keep in sync with lib/display.ts
              var einkDisplay = null;
              try { einkDisplay = localStorage.getItem('einkDisplay'); } catch (e) {}
              if (einkDisplay !== 'true' && einkDisplay !== 'false') {
                var einkCookies = document.cookie.split(';');
                for (var j = 0; j < einkCookies.length; j++) {
                  var einkParts = einkCookies[j].trim().split('=');
                  if (einkParts[0] === 'eink_display') { einkDisplay = einkParts[1]; break; }
                }
              }
              if (einkDisplay === 'true') { root.dataset.display = 'eink'; } else { root.removeAttribute('data-display'); }
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
