/**
 * Which nav tab is current for a path. Both the bottom nav and the desktop
 * header use this. A program's detail page belongs to Training until TL3 adds
 * the Library tab.
 */

const EXTRA_PATHS: Record<string, string[]> = {
  '/training': ['/library/programs'],
}

export function isTabActive(tabHref: string, pathname: string): boolean {
  return [tabHref, ...(EXTRA_PATHS[tabHref] ?? [])].some((prefix) => pathname.startsWith(prefix))
}
