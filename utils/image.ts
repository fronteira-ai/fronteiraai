// Seed-era placeholder images (database/seed/update_images.js) render as an
// obviously-fake gray box next to real merchant photos — worse for trust
// than simply showing the site's own "Sem imagem" empty state. Treat them
// as no image everywhere a product photo is displayed.
const PLACEHOLDER_IMAGE_HOSTS = ["placehold.co"];

export function isRealProductImage(url: string | null | undefined): url is string {
  if (!url) return false;
  return !PLACEHOLDER_IMAGE_HOSTS.some((host) => url.includes(host));
}

export function resolveProductImage(url: string | null | undefined): string | null {
  return isRealProductImage(url) ? url : null;
}
