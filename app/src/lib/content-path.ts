export function parseContentPath(id: string): {
  category?: string;
  subcategory?: string;
  slug: string;
} {
  const segments = id.split("/");
  if (segments.length === 1) return { slug: segments[0] };
  if (segments.length === 2) return { category: segments[0], slug: segments[1] };
  return {
    category: segments[0],
    subcategory: segments[1],
    slug: segments.slice(2).join("/"),
  };
}
