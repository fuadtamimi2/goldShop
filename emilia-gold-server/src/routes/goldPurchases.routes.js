const router = require("express").Router();
const GoldPurchase = require("../models/GoldPurchase");
const Customer = require("../models/Customer");
const Store = require("../models/Store");
const DailyPricing = require("../models/DailyPricing");
const protect = require("../middleware/auth");
const asyncHandler = require("../utils/asyncHandler");
const { buildGoldPurchaseReceipt } = require("../services/receipt.service");

const TROY_OUNCE_TO_GRAM = 31.1034768;
const KARAT_RATIO = { "24K": 1.0, "22K": 22 / 24, "21K": 21 / 24, "18K": 18 / 24 };

function roundNumber(value, precision = 4) {
    return Number(Number(value || 0).toFixed(precision));
}

function computeKaratFactor(karat) {
    const k = String(karat || "").trim().toUpperCase();
    if (KARAT_RATIO[k] != null) return KARAT_RATIO[k];
    const num = parseFloat(k);
    if (Number.isFinite(num) && num > 0 && num <= 24) return num / 24;
    return 1.0;
}

/**
 * buyBasePricePerGram = (globalGoldPricePerOunce + buyOffsetPerOunce) / 31.1035 * karatFactor
 */
function computeBuyBasePrice(pricingSnapshot, karatFactor) {
    const global = Number(pricingSnapshot.globalGoldPricePerOunce || 0);
    const buyOffset = Number(pricingSnapshot.buyOffsetPerOunce || 0);
    return ((global + buyOffset) / TROY_OUNCE_TO_GRAM) * karatFactor;
}

function todayDateString() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function normalizePayload(payload = {}, pricingSnapshot = {}) {
    const weight = Number(payload.weight || 0);
    const karatFactor = computeKaratFactor(payload.karat);
    const buyBasePricePerGram = roundNumber(computeBuyBasePrice(pricingSnapshot, karatFactor));

    // Actual bought price entered by the shop (what they paid the customer)
    const actualBoughtPricePerGram = Number(
        payload.actualBoughtPricePerGram ??
        payload.boughtPricePerGram ??
        payload.purchasePricePerGram ??
        0
    );

    // For reference value (resale estimate), use the buyBasePricePerGram from snapshot
    // OR if a market override was sent explicitly, honour it
    const marketPricePerGram = Number(
        payload.marketPricePerGram ??
        payload.externalReferenceBuyPricePerGram ??
        buyBasePricePerGram
    );

    const estimatedResaleValue = roundNumber(weight * marketPricePerGram);
    const totalPurchaseAmount = roundNumber(weight * actualBoughtPricePerGram);
    // Revenue = what the shop could resell for minus what they paid
    const revenue = roundNumber(estimatedResaleValue - totalPurchaseAmount);

    return {
        customerId: payload.customerId,
        ref: String(payload.ref || "").trim(),
        date: payload.date ? new Date(payload.date) : new Date(),
        karat: String(payload.karat || "").trim(),
        weight,
        // Canonical fields
        marketPricePerGram,
        boughtPricePerGram: actualBoughtPricePerGram,
        estimatedResaleValue,
        totalPurchaseAmount,
        expectedRevenue: revenue,
        // Snapshot fields for historical accuracy
        globalGoldPricePerOunceSnapshot: roundNumber(pricingSnapshot.globalGoldPricePerOunce || 0),
        buyOffsetPerOunceSnapshot: roundNumber(pricingSnapshot.buyOffsetPerOunce || 0),
        usdIlsExchangeRateSnapshot: roundNumber(pricingSnapshot.usdIlsExchangeRate || 0),
        buyBasePricePerGramSnapshot: buyBasePricePerGram,
        revenueSnapshot: revenue,
        // Legacy mirrors
        externalReferenceBuyPricePerGram: marketPricePerGram,
        purchasePricePerGram: actualBoughtPricePerGram,
        expectedMargin: revenue,
        paymentMethod: String(payload.paymentMethod || "Cash"),
        notes: String(payload.notes || "").trim(),
    };
}

function validatePayload(payload) {
    if (!payload.customerId) return "customerId is required";
    if (!Number.isFinite(payload.weight) || payload.weight <= 0) return "weight must be greater than 0";
    if (!Number.isFinite(payload.boughtPricePerGram) || payload.boughtPricePerGram < 0) {
        return "boughtPricePerGram must be 0 or more";
    }
    if (!["Cash", "Card", "Transfer", "Other"].includes(payload.paymentMethod)) {
        return "paymentMethod must be Cash, Card, Transfer, or Other";
    }
    return "";
}

router.get(
    "/",
    protect,
    asyncHandler(async (req, res) => {
        const filter = { storeId: req.user.storeId };

        if (req.query.customerId) filter.customerId = req.query.customerId;
        if (req.query.karat) filter.karat = req.query.karat;

        const docs = await GoldPurchase.find(filter)
            .populate("customerId", "name phone email")
            .sort({ date: -1, createdAt: -1 })
            .limit(500);

        res.json({ items: docs });
    })
);

router.post(
    "/",
    protect,
    asyncHandler(async (req, res) => {
        // Fetch today's daily pricing snapshot
        const todayStr = todayDateString();
        const dailyPricing = await DailyPricing.findOne({
            storeId: req.user.storeId,
            pricingDate: todayStr,
        }).sort({ createdAt: -1 });

        const pricingSnapshot = dailyPricing
            ? {
                globalGoldPricePerOunce: dailyPricing.globalGoldPricePerOunce,
                buyOffsetPerOunce: dailyPricing.buyOffsetPerOunce,
                sellOffsetPerOunce: dailyPricing.sellOffsetPerOunce,
                usdIlsExchangeRate: dailyPricing.usdIlsExchangeRate,
            }
            : { globalGoldPricePerOunce: 0, buyOffsetPerOunce: 0, sellOffsetPerOunce: 0, usdIlsExchangeRate: 0 };

        const payload = normalizePayload(req.body, pricingSnapshot);
        const validationMessage = validatePayload(payload);

        if (validationMessage) {
            res.status(400);
            throw new Error(validationMessage);
        }

        const customer = await Customer.findOne({
            _id: payload.customerId,
            storeId: req.user.storeId,
        });

        if (!customer) {
            res.status(404);
            throw new Error("Customer not found");
        }

        const doc = await GoldPurchase.create({
            storeId: req.user.storeId,
            userId: req.user._id,
            dailyPricingId: dailyPricing?._id || null,
            ...payload,
        });

        await doc.populate("customerId", "name phone email");
        const store = await Store.findById(req.user.storeId).select("name phone email");
        const receipt = buildGoldPurchaseReceipt({ purchase: doc, customer: doc.customerId, store });
        res.status(201).json({ item: doc, receipt });
    })
);

// GET receipt for a gold purchase
router.get(
    "/:id/receipt",
    protect,
    asyncHandler(async (req, res) => {
        const doc = await GoldPurchase.findOne({
            _id: req.params.id,
            storeId: req.user.storeId,
        }).populate("customerId", "name phone email");

        if (!doc) {
            res.status(404);
            throw new Error("Gold purchase not found");
        }

        const store = await Store.findById(req.user.storeId).select("name phone email");
        const receipt = buildGoldPurchaseReceipt({ purchase: doc, customer: doc.customerId, store });
        res.json({ receipt });
    })
);

module.exports = router;