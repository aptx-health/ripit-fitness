/**
 * Which nav tab is current for a path. Both the bottom nav and the desktop
 * header use this. The program builder pages (`/programs/new` and
 * `/programs/<id>/edit`) belong to the Library.
 */

const EXTRA_PATHS: Record<string, string[]> = {
  '/library': ['/programs/'],
}

export function isTabActive(tabHref: string, pathname: string): boolean {
  return [tabHref, ...(EXTRA_PATHS[tabHref] ?? [])].some((prefix) => pathname.startsWith(prefix))
}
