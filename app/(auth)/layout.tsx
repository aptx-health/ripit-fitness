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
              root.dataset.theme = 'ripit';
              var isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
              root.dataset.mode = isDark ? 'dark' : 'light';
              if (isDark) { root.classList.add('dark'); } else { root.classList.remove('dark'); }
              var mql = window.matchMedia('(prefers-color-scheme: dark)');
              mql.addEventListener('change', function(e) {
                root.dataset.mode = e.matches ? 'dark' : 'light';
                if (e.matches) { root.classList.add('dark'); } else { root.classList.remove('dark'); }
              });
            })();
          `,
        }}
      />
      {children}
    </>
  )
}
