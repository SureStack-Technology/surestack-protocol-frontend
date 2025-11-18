const BACKEND_CANDIDATES = [
  import.meta.env.VITE_BACKEND_URL,
  import.meta.env.VITE_API_BASE_URL,
  import.meta.env.VITE_BACKEND_API,
  import.meta.env.VITE_SERVER_URL,
  import.meta.env.VITE_API_URL,
  import.meta.env.VITE_APP_BACKEND_URL,
  "http://localhost:5001",
];

function normalizeBaseUrl(base) {
  if (!base) return "";
  return String(base).replace(/\/+$/, "");
}

export function getBackendBaseUrl() {
  const candidate = BACKEND_CANDIDATES.find((value) => value && String(value).trim().length > 0);
  return normalizeBaseUrl(candidate || "http://localhost:5001");
}

export async function fetchActiveValidatorsFromBackend(options = {}) {
  const { signal } = options || {};
  const baseUrl = getBackendBaseUrl();

  if (!baseUrl) {
    return { active: [], count: 0 };
  }

  try {
    const response = await fetch(`${baseUrl}/validators/active`, {
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


