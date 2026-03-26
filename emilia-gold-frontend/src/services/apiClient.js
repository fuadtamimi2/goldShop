
const USE_MOCK = true;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function apiGet(url) {
  if (USE_MOCK) {
    await sleep(200);
    return { ok: true };
  }
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error(`GET ${url} failed`);
  return res.json();
}

export async function apiPost(url, body) {
  if (USE_MOCK) {
    await sleep(200);
    return { ok: true };
  }
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    credentials: "include",
  });
  if (!res.ok) throw new Error(`POST ${url} failed`);
  return res.json();
}
