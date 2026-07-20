export const getFotoUrl = (path: string | null | undefined, fallback: string = "/images/user/default-avatar.svg"): string => {
  const defaultFallback = fallback && fallback !== "" ? fallback : "/images/user/default-avatar.svg";
  if (!path || path.trim() === "") return defaultFallback;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;

  const baseUrl = import.meta.env.VITE_API_URL 
    ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '') 
    : 'https://centralsimak.smakniscjr.sch.id';

  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  if (cleanPath.startsWith("/storage/")) {
    return `${baseUrl}${cleanPath}`;
  }
  return `${baseUrl}/storage${cleanPath}`;
};

export const getLogoUrl = (path: string | null | undefined): string => {
  return getFotoUrl(path, "");
};
