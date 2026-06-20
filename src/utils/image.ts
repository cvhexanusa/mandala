export const getFotoUrl = (path: string | null | undefined, fallback: string = "/images/default/profile.jpg"): string => {
  if (!path) return fallback;
  if (path.startsWith("http")) return path;
  const baseUrl = import.meta.env.VITE_API_URL 
    ? import.meta.env.VITE_API_URL.replace('/api', '') 
    : 'http://localhost:3000';
  if (path.startsWith("/storage")) return `${baseUrl}${path}`;
  return `${baseUrl}/storage/${path}`;
};

export const getLogoUrl = (path: string | null | undefined): string => {
  return getFotoUrl(path, "");
};
