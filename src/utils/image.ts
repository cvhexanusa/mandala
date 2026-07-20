export const getFotoUrl = (path: string | null | undefined, fallback: string = "/images/user/user-01.jpg"): string => {
  const defaultFallback = fallback && fallback !== "" ? fallback : "/images/user/user-01.jpg";
  if (!path) return defaultFallback;
  if (path.startsWith("http")) return path;
  const baseUrl = import.meta.env.VITE_API_URL 
    ? import.meta.env.VITE_API_URL.replace('/api', '') 
    : 'https://centralsimak.smakniscjr.sch.id';
  if (path.startsWith("/storage")) return `${baseUrl}${path}`;
  return `${baseUrl}/storage/${path}`;
};

export const getLogoUrl = (path: string | null | undefined): string => {
  return getFotoUrl(path, "");
};
