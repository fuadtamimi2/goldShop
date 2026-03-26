const GOLD_API_URL = "https://api.gold-api.com/price/XAU";

export async function fetchSpotUsdPerOz() {
    const res = await fetch(GOLD_API_URL);
    if (!res.ok) {
        throw new Error("Unable to fetch live gold price.");
    }

    const data = await res.json();
    const price = Number(data?.price);
    if (!Number.isFinite(price) || price <= 0) {
        throw new Error("Invalid live gold price response.");
    }

    return {
        price,
        updatedAt: data?.updatedAt || null,
    };
}
