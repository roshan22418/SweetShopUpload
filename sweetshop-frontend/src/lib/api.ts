// "same-origin" (or an empty value) means: call /api/... on this site's own origin — used when next.config.ts
// proxies /api/* to the backend (BACKEND_URL), e.g. on Netlify, whose dashboard may not allow empty variables.
const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL;
export const API_URL = configuredApiUrl === "same-origin" ? "" : (configuredApiUrl ?? "http://localhost:8080");

// Product imageUrl can be either an absolute URL (pasted manually) or a
// backend-relative path like "/uploads/products/xxx.jpg" (from an upload) —
// only the latter needs the API host prepended.
export function resolveImageUrl(imageUrl: string): string {
  return /^https?:\/\//i.test(imageUrl) ? imageUrl : `${API_URL}${imageUrl}`;
}

export class ApiError extends Error {
  status: number;
  fieldErrors?: Record<string, string>;

  constructor(status: number, message: string, fieldErrors?: Record<string, string>) {
    super(message);
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

export const AUTH_STORAGE_KEY = "sweetshop_auth";
// Fired so AuthContext can keep its React state in sync when api.ts refreshes or drops the session.
export const AUTH_UPDATED_EVENT = "sweetshop:auth-updated";
export const AUTH_CLEARED_EVENT = "sweetshop:auth-cleared";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw).token as string;
  } catch {
    return null;
  }
}

// The access token is short-lived. When a call comes back 401 we trade the httpOnly refresh-token
// cookie for a new one. Concurrent 401s share one in-flight refresh — the server rotates the refresh
// token on every use, so two parallel refreshes would look like token theft and log the user out.
let refreshInFlight: Promise<boolean> | null = null;

function refreshAccessToken(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = doRefresh().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

async function doRefresh(): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/api/auth/refresh`, { method: "POST", credentials: "include" });
    if (!res.ok) {
      // 401/403 means the session is really over; a 5xx or network blip shouldn't log anyone out.
      if (res.status === 401 || res.status === 403) {
        localStorage.removeItem(AUTH_STORAGE_KEY);
        window.dispatchEvent(new Event(AUTH_CLEARED_EVENT));
      }
      return false;
    }
    const auth = await res.json();
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
    window.dispatchEvent(new CustomEvent(AUTH_UPDATED_EVENT, { detail: auth }));
    return true;
  } catch {
    return false;
  }
}

// Sends the request with the current access token; on a 401 for an authenticated call, refreshes
// once and retries. Auth endpoints themselves (e.g. a wrong-password 401) never trigger a refresh.
async function fetchWithAuth(
  path: string,
  buildInit: (token: string | null) => RequestInit,
): Promise<Response> {
  const send = () => fetch(`${API_URL}${path}`, { ...buildInit(getToken()), credentials: "include" });

  const hadToken = getToken() !== null;
  const res = await send();
  if (res.status !== 401 || !hadToken || path.startsWith("/api/auth/")) return res;

  return (await refreshAccessToken()) ? send() : res;
}

async function parseResponse<T>(res: Response): Promise<T> {
  if (res.status === 204) {
    return undefined as T;
  }

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const body = isJson ? await res.json() : null;

  if (!res.ok) {
    const message = body?.message || body?.error || `Request failed with status ${res.status}`;
    throw new ApiError(res.status, message, body?.errors);
  }

  return body as T;
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetchWithAuth(path, (token) => ({
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers as Record<string, string> | undefined),
    },
  }));
  return parseResponse<T>(res);
}

export async function apiUpload<T>(path: string, file: File): Promise<T> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetchWithAuth(path, (token) => ({
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : ({} as Record<string, string>),
    body: formData,
  }));

  return parseResponse<T>(res);
}
