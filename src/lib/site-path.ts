/** Paths for GitHub Pages base (import.meta.env.BASE_URL). */

export function sitePath(relative: string): string {
  const rel = relative.replace(/^\//, '');
  return `${import.meta.env.BASE_URL}${rel}`;
}

export function normalizePathname(pathname: string): string {
  const base = import.meta.env.BASE_URL;
  if (base !== '/' && pathname.startsWith(base)) {
    const rest = pathname.slice(base.length);
    return rest.startsWith('/') ? rest : `/${rest}`;
  }
  return pathname;
}

export function isSitePath(relative: string): boolean {
  const want = sitePath(relative).replace(/\/$/, '');
  const current = window.location.pathname.replace(/\/$/, '');
  return current === want;
}
