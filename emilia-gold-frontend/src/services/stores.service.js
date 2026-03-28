import { apiGet, apiPatch } from "./apiClient";

export async function getStore(storeId) {
    const data = await apiGet(`/api/stores/${storeId}`);
    return data.item;
}

export async function getStoreSettings(storeId) {
    const data = await apiGet(`/api/stores/${storeId}/settings`);
    return data.item || {};
}

export async function updateStoreSettings(storeId, settings) {
    const data = await apiPatch(`/api/stores/${storeId}/settings`, settings);
    return data.settings || {};
}
