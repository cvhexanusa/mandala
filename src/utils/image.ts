export const getFotoUrl = (path: string | null | undefined, fallback: string = "/images/user/default-avatar.svg"): string => {
  const defaultFallback = fallback && fallback !== "" ? fallback : "/images/user/default-avatar.svg";
  if (!path || path.trim() === "") return defaultFallback;
  
  if (path.startsWith("http://") || path.startsWith("https://")) {
    if (!path.includes("/storage/")) {
      return path;
    }
  }

  const baseUrl = import.meta.env.VITE_API_URL 
    ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '') 
    : 'https://centralsimak.smakniscjr.sch.id';

  // Extract path portion starting with /storage if there's any absolute URL in it
  let cleanPath = path;
  const storageIndex = path.indexOf('/storage/');
  if (storageIndex !== -1) {
    cleanPath = path.substring(storageIndex);
  } else {
    cleanPath = path.startsWith('/') ? path : `/${path}`;
  }

  let fullPath = cleanPath.startsWith("/storage/") ? `${baseUrl}${cleanPath}` : `${baseUrl}/storage${cleanPath}`;

  // Clean old token parameter if any and append the fresh one from localStorage
  const token = localStorage.getItem('auth_token');
  if (token) {
    const urlWithoutToken = fullPath.replace(/([?&])token=[^&]*(&|$)/, '$1').replace(/[?&]$/, '');
    const separator = urlWithoutToken.includes('?') ? '&' : '?';
    fullPath = `${urlWithoutToken}${separator}token=${token}`;
  }

  return fullPath;
};

export const getLogoUrl = (path: string | null | undefined): string => {
  return getFotoUrl(path, "");
};
