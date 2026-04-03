import { apiDelete, apiGet, apiPost, apiPut } from "./apiClient";

function normalizeDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

function normalizeCustomer(item = {}) {
  return {
    ...item,
    phone: normalizeDigits(item.phone),
    idNumber: normalizeDigits(item.idNumber),
    email: String(item.email || "").trim().toLowerCase(),
    city: String(item.city || "").trim(),
    notes: String(item.notes || "").trim(),
    totalSpent: Number(item.totalSpent || 0),
    lastPurchase: item.lastPurchase || null,
  };
}

function normalizePayload(payload = {}) {
  return {
    idNumber: normalizeDigits(payload.idNumber),
    name: String(payload.name || "").trim(),
    phone: normalizeDigits(payload.phone),
    city: String(payload.city || "").trim(),
    email: String(payload.email || "").trim().toLowerCase(),
    notes: String(payload.notes || "").trim(),
  };
}

export async function listCustomers(q = "") {
  const query = q.trim();
  const data = await apiGet(`/api/customers${query ? `?q=${encodeURIComponent(query)}` : ""}`);
  return (data.items || []).map(normalizeCustomer);
}

export async function getCustomerById(id) {
  const data = await apiGet(`/api/customers/${id}`);
  return normalizeCustomer(data.item);
}

export async function createCustomer(payload) {
  const data = await apiPost("/api/customers", normalizePayload(payload));
  return normalizeCustomer(data.item);
}

export async function updateCustomer(id, payload) {
  const data = await apiPut(`/api/customers/${id}`, normalizePayload(payload));
  return normalizeCustomer(data.item);
}

export async function deleteCustomer(id) {
  return apiDelete(`/api/customers/${id}`);
}
