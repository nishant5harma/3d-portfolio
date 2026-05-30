/** GitHub Pages project-site prefix (e.g. /3d-portfolio). Empty for local dev. */
export const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** Prefix a public asset path for GitHub Pages. */
export function withBasePath(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${basePath}${normalized}`;
}
