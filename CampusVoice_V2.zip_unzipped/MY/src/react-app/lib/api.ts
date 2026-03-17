// Central API helper — reads base URL from env, attaches JWT automatically
export const API_BASE = import.meta.env.VITE_API_URL ?? "";

export const getToken = () => localStorage.getItem("adminToken");

export const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${getToken()}`,
});

export const apiFetch = async (path: string, options?: RequestInit) => {
  const res = await fetch(`${API_BASE}${path}`, options);
  return res;
};

export const adminFetch = async (path: string, options?: RequestInit) => {
  return apiFetch(path, {
    ...options,
    headers: {
      ...(options?.headers ?? {}),
      Authorization: `Bearer ${getToken()}`,
      "Content-Type": "application/json",
    },
  });
};
