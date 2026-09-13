/** Keep authored public assets usable at both an origin root and a Pages subpath. */
export function publicAsset(path: string, base = import.meta.env.VITE_PUBLIC_ASSET_BASE || import.meta.env.BASE_URL): string {
  return path.startsWith('/assets/') ? `${base}${path.slice(1)}` : path;
}
