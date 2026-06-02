const BACKEND_CANDIDATES = [
  import.meta.env.VITE_BACKEND_URL,
  import.meta.env.VITE_API_BASE_URL,
  import.meta.env.VITE_BACKEND_API,
  import.meta.env.VITE_SERVER_URL,
  import.meta.env.VITE_API_URL,
  import.meta.env.VITE_APP_BACKEND_URL,
];

function normalizeBaseUrl(base) {
  if (!base) return "";
  return String(base).replace(/\/+$/, "");
}

/**
 * Backend base URL for API calls.
 * - Dev: if no VITE_* backend URL is set, use same-origin "" so Vite proxies `/api` → backend (avoids CORS / wrong port).
 * - Prod: require an env URL or fall back to localhost:5001 for self-hosted demos.
 */
export function getBackendBaseUrl() {
  const explicit = BACKEND_CANDIDATES.find((value) => value && String(value).trim().length > 0);
  if (explicit) {
    return normalizeBaseUrl(explicit);
  }
  if (import.meta.env.DEV) {
    return "";
  }
  return normalizeBaseUrl("http://localhost:5001");
}

export async function fetchActiveValidatorsFromBackend(options = {}) {
  const { signal } = options || {};
  const baseUrl = getBackendBaseUrl();

  if (!baseUrl) {
    return { active: [], count: 0 };
  }

  try {
    const response = await fetch(`${baseUrl}/api/validators/active`, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal,
    });

    if (!response.ok) {
      throw new Error(`backend responded ${response.status}`);
    }

    const payload = await response.json();
    const active = Array.isArray(payload.active)
      ? payload.active
          .filter(Boolean)
          .map((addr) => String(addr).toLowerCase())
      : [];
    const count = Number.isFinite(Number(payload.count))
      ? Number(payload.count)
      : active.length;

    return { active, count };
  } catch (error) {
    console.warn("[validatorApi] Failed to fetch active validators:", error);
    return { active: [], count: 0 };
  }
}


