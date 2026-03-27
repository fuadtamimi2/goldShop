const router = require("express").Router();
const GoldPurchase = require("../models/GoldPurchase");
const Customer = require("../models/Customer");
const protect = require("../middleware/auth");
const asyncHandler = require("../utils/asyncHandler");

function roundNumber(value, precision = 4) {
    return Number(Number(value || 0).toFixed(precision));
}

function normalizePayload(payload = {}) {
    const weight = Number(payload.weight || 0);
    const externalReferenceBuyPricePerGram = Number(payload.externalReferenceBuyPricePerGram || 0);
    const purchasePricePerGram = Number(payload.purchasePricePerGram || 0);
    const estimatedResaleValue = roundNumber(weight * externalReferenceBuyPricePerGram);
    const totalPurchaseAmount = roundNumber(weight * purchasePricePerGram);

    return {
        customerId: payload.customerId,
        ref: String(payload.ref || "").trim(),
        date: payload.date ? new Date(payload.date) : new Date(),
        karat: String(payload.karat || "").trim(),
        weight,
        externalReferenceBuyPricePerGram,
        purchasePricePerGram,
        estimatedResaleValue,
        totalPurchaseAmount,
        expectedMargin: roundNumber(estimatedResaleValue - totalPurchaseAmount),
        paymentMethod: String(payload.paymentMethod || "Cash"),
        notes: String(payload.notes || "").trim(),
    };
}

function validatePayload(payload) {
    if (!payload.customerId) return "customerId is required";
    if (!Number.isFinite(payload.weight) || payload.weight <= 0) return "weight must be greater than 0";
    if (!Number.isFinite(payload.externalReferenceBuyPricePerGram) || payload.externalReferenceBuyPricePerGram < 0) {
        return "externalReferenceBuyPricePerGram must be 0 or more";
    }
    if (!Number.isFinite(payload.purchasePricePerGram) || payload.purchasePricePerGram < 0) {
        return "purchasePricePerGram must be 0 or more";
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
        const payload = normalizePayload(req.body);
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
            ...payload,
        });

        await doc.populate("customerId", "name phone email");
        res.status(201).json({ item: doc });
    })
);

module.exports = router;