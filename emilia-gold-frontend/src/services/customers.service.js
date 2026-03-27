import customersSeed from "../data/customers";

const LS_KEY = "eg_customers";

// ---------- utils ----------
function safeParse(raw, fallback) {
  try {
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function isNonEmptyStr(v) {
  return typeof v === "string" && v.trim().length > 0;
}

function normalizeIdNumber(idNumber) {
  return String(idNumber || "").replace(/\D/g, "");
}

function normalizePhone(phone) {
  // keep digits only
  const digits = String(phone || "").replace(/\D/g, "");
  return digits;
}

function isValidPhone(phone) {
  const digits = normalizePhone(phone);
  return /^(052|059)\d{7}$/.test(digits);
}

function isValidEmail(email) {
  if (!isNonEmptyStr(email)) return true; // optional
  // simple sane regex
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function nextId(existing) {
  // generate next C-XXXX based on max existing
  const max = existing.reduce((m, c) => {
    const s = String(c.id || "");
    const n = Number(s.replace("C-", ""));
    return Number.isFinite(n) ? Math.max(m, n) : m;
  }, 1000);
  return `C-${max + 1}`;
}

function ensureArray(x) {
  return Array.isArray(x) ? x : [];
}

function normalizeCustomerRecord(record) {
  const idNumber = normalizeIdNumber(record?.idNumber);
  if (idNumber) {
    return { ...record, idNumber };
  }

  const fallback = String(record?.id || "").replace(/\D/g, "").padStart(9, "0").slice(-9);
  return { ...record, idNumber: fallback };
}

// ---------- persistence ----------
function initIfEmpty() {
  // Keep demo data simple: refresh always syncs from src/data/customers.js.
  localStorage.setItem(LS_KEY, JSON.stringify(customersSeed));
}

function loadAll() {
  initIfEmpty();
  const raw = localStorage.getItem(LS_KEY);
  const list = safeParse(raw, customersSeed);
  const arr = ensureArray(list);
  // If corrupted to non-array, reset
  if (!Array.isArray(list)) {
    localStorage.setItem(LS_KEY, JSON.stringify(customersSeed));
    return [...customersSeed];
  }
  const normalized = arr.map(normalizeCustomerRecord);
  const changed = JSON.stringify(arr) !== JSON.stringify(normalized);
  if (changed) {
    localStorage.setItem(LS_KEY, JSON.stringify(normalized));
  }
  return normalized;
}

function saveAll(list) {
  localStorage.setItem(LS_KEY, JSON.stringify(list));
  return list;
}

// ---------- validation ----------
function validateCustomerPayload(payload, { existing = [], forUpdate = false, currentId = null } = {}) {
  const idNumber = normalizeIdNumber(payload?.idNumber);
  const name = String(payload?.name || "").trim();
  const phone = String(payload?.phone || "").trim();
  const email = normalizeEmail(payload?.email);
  const city = String(payload?.city || "").trim();
  const notes = String(payload?.notes || "").trim();

  if (!idNumber) return { ok: false, message: "ID number is required." };

  if (idNumber.length < 6) {
    return { ok: false, message: "ID number looks too short." };
  }

  if (!isNonEmptyStr(name)) return { ok: false, message: "Name is required." };

  if (!isNonEmptyStr(phone)) {
    return { ok: false, message: "Phone is required." };
  }

  if (!isValidPhone(phone)) {
    return { ok: false, message: "Phone must start with 052 or 059 and be 10 digits." };
  }

  if (!isValidEmail(email)) {
    return { ok: false, message: "Email looks invalid." };
  }

  // duplicates (ignore self on update)
  const phoneDigits = normalizePhone(phone);
  if (phoneDigits) {
    const dupPhone = existing.find(
      (c) => c.id !== currentId && normalizePhone(c.phone) === phoneDigits
    );
    if (dupPhone) return { ok: false, message: "Phone already exists for another customer." };
  }

  if (email) {
    const dupEmail = existing.find(
      (c) => c.id !== currentId && normalizeEmail(c.email) === email
    );
    if (dupEmail) return { ok: false, message: "Email already exists for another customer." };
  }

  const dupIdNumber = existing.find(
    (c) => c.id !== currentId && normalizeIdNumber(c.idNumber) === idNumber
  );
  if (dupIdNumber) return { ok: false, message: "ID number already exists for another customer." };

  // return normalized fields (for consistent storage)
  return {
    ok: true,
    value: {
      idNumber,
      name,
      phone,
      email,
      city,
      notes,
    },
  };
}

// ---------- public API ----------
export function listCustomers(q = "") {
  const all = loadAll();
  const s = q.trim().toLowerCase();
  if (!s) return all;

  return all.filter((c) =>
    [c.name, c.phone, c.city, c.id, c.idNumber, c.email]
      .filter(Boolean)
      .some((x) => String(x).toLowerCase().includes(s))
  );
}

export function getCustomerById(id) {
  const all = loadAll();
  return all.find((c) => c.id === id) || null;
}

export function createCustomer(payload) {
  const all = loadAll();

  const check = validateCustomerPayload(payload, { existing: all, forUpdate: false });
  if (!check.ok) return { ok: false, message: check.message };

  const id = nextId(all);
  const next = {
    id,
    totalSpent: 0,
    lastPurchase: null,
    ...check.value,
  };

  saveAll([next, ...all]);
  return { ok: true, customer: next };
}

export function updateCustomer(id, patch) {
  const all = loadAll();
  const current = all.find((c) => c.id === id);
  if (!current) return { ok: false, message: "Customer not found." };

  const merged = { ...current, ...patch };

  const check = validateCustomerPayload(merged, { existing: all, forUpdate: true, currentId: id });
  if (!check.ok) return { ok: false, message: check.message };

  const updated = { ...current, ...merged, ...check.value };
  const next = all.map((c) => (c.id === id ? updated : c));

  saveAll(next);
  return { ok: true, customer: updated };
}

export function deleteCustomer(id) {
  const all = loadAll();
  const exists = all.some((c) => c.id === id);
  if (!exists) return { ok: false, message: "Customer not found." };

  const next = all.filter((c) => c.id !== id);
  saveAll(next);
  return { ok: true };
}

export function resetCustomersToSeed() {
  saveAll([...customersSeed]);
  return { ok: true };
}
