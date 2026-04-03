
const RAW_BASE = import.meta.env.VITE_API_URL || "";
const BASE = RAW_BASE.endsWith("/") ? RAW_BASE.slice(0, -1) : RAW_BASE;

function buildBaseCandidates(base) {
  const out = [base];

  if (!base) return out;

  if (base.includes("localhost")) {
    out.push(base.replace("localhost", "127.0.0.1"));
  }

  if (base.includes("127.0.0.1")) {
    out.push(base.replace("127.0.0.1", "localhost"));
  }

  return [...new Set(out)];
}

function authHeaders() {
  const token = localStorage.getItem("eg_token");
  return token
    ? { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
    : { "Content-Type": "application/json" };
}

async function handleResponse(res) {
  const contentType = res.headers.get("content-type") || "";
  let body = {};

  try {
    if (contentType.includes("application/json")) {
      body = await res.json();
    } else {
      const raw = await res.text();
      body = raw ? { message: raw } : {};
    }
  } catch {
    body = {};
  }

  if (!res.ok) {
    const serverMessage = body.message || body.error;
    const fallback = `Request failed (${res.status} ${res.statusText})`;
    throw new Error(serverMessage || fallback);
  }

  return body;
}

async function request(path, options = {}) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const bases = buildBaseCandidates(BASE);
  let lastError = null;

  for (const base of bases) {
    const url = `${base}${normalizedPath}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    try {
      const res = await fetch(url, {
        ...options,
        headers: {
          ...authHeaders(),
          ...(options.headers || {}),
        },
        signal: controller.signal,
      });
      clearTimeout(timeout);
      return handleResponse(res);
    } catch (err) {
      clearTimeout(timeout);
      lastError = err;
    }
  }

  const isTimeout = lastError?.name === "AbortError";
  const tried = bases.map((base) => `${base}${normalizedPath}`).join(", ");
  const reason = isTimeout ? "Request timed out" : "Failed to fetch";
  throw new Error(`${reason}. Check VITE_API_URL/backend availability. Tried: ${tried}`);
}

export async function apiGet(path) {
  return request(path, { method: "GET" });
}

export async function apiPost(path, body) {
  return request(path, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function apiPut(path, body) {
  return request(path, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function apiPatch(path, body) {
  return request(path, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function apiDelete(path) {
  return request(path, {
    method: "DELETE",
  });
}

export { BASE };

