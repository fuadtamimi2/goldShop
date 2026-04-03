const router = require("express").Router();
const Product = require("../models/Product");
const protect = require("../middleware/auth");
const asyncHandler = require("../utils/asyncHandler");

function toNumber(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizePayload(payload = {}) {
    const extraProfitPerGram = toNumber(
        payload.extraProfitPerGram ?? payload.productProfitPerGram ?? payload.markupPerGram,
        0
    );

    return {
        name: String(payload.name || "").trim(),
        sku: String(payload.sku || "").trim(),
        category: String(payload.category || "").trim(),
        productType: String(payload.productType || "").trim(),
        karat: String(payload.karat || "").trim(),
        quantity: toNumber(payload.quantity ?? payload.qty, 0),
        totalWeight: toNumber(payload.totalWeight ?? payload.grams, 0),
        extraProfitPerGram,
        // Keep writing legacy field for existing clients and old records.
        markupPerGram: extraProfitPerGram,
        baseCostPerGram: toNumber(payload.baseCostPerGram ?? payload.costPrice, 0),
        notes: String(payload.notes || "").trim(),
        isActive: payload.isActive !== false,
    };
}

function validateNumbers({ quantity, totalWeight, extraProfitPerGram, baseCostPerGram }) {
    if (!Number.isInteger(quantity) || quantity < 0) return "quantity must be a whole number that is 0 or more";
    if (totalWeight < 0) return "totalWeight must be 0 or more";
    if (extraProfitPerGram < 0) return "extraProfitPerGram must be 0 or more";
    if (baseCostPerGram < 0) return "baseCostPerGram must be 0 or more";
    if (quantity === 0 && totalWeight > 0) return "totalWeight must be 0 when quantity is 0";
    if (quantity > 0 && totalWeight <= 0) return "totalWeight must be greater than 0 when quantity is above 0";
    return "";
}

// GET all products for current store
router.get(
    "/",
    protect,
    asyncHandler(async (req, res) => {
        const q = (req.query.q || "").trim();
        const filter = { storeId: req.user.storeId };

        if (q) {
            filter.$or = [
                { name: { $regex: q, $options: "i" } },
                { sku: { $regex: q, $options: "i" } },
                { category: { $regex: q, $options: "i" } },
                { productType: { $regex: q, $options: "i" } },
                { karat: { $regex: q, $options: "i" } },
            ];
        }

        if (req.query.active === "true") filter.isActive = true;

        const docs = await Product.find(filter).sort({ createdAt: -1 }).limit(500);
        res.json({ items: docs });
    })
);

// GET single product
router.get(
    "/:id",
    protect,
    asyncHandler(async (req, res) => {
        const doc = await Product.findOne({
            _id: req.params.id,
            storeId: req.user.storeId,
        });
        if (!doc) {
            res.status(404);
            throw new Error("Product not found");
        }
        res.json({ item: doc });
    })
);

// POST create product
router.post(
    "/",
    protect,
    asyncHandler(async (req, res) => {
        const payload = normalizePayload(req.body);

        if (!payload.name) {
            res.status(400);
            throw new Error("Product name is required");
        }

        const numberValidation = validateNumbers(payload);
        if (numberValidation) {
            res.status(400);
            throw new Error(numberValidation);
        }

        if (payload.sku) {
            const dupSku = await Product.findOne({
                storeId: req.user.storeId,
                sku: payload.sku,
            });
            if (dupSku) {
                res.status(400);
                throw new Error("SKU already exists in your store");
            }
        }

        const doc = await Product.create({
            storeId: req.user.storeId,
            ...payload,
        });

        res.status(201).json({ item: doc });
    })
);

// PUT update product
router.put(
    "/:id",
    protect,
    asyncHandler(async (req, res) => {
        const payload = normalizePayload(req.body);
        const doc = await Product.findOne({
            _id: req.params.id,
            storeId: req.user.storeId,
        });
        if (!doc) {
            res.status(404);
            throw new Error("Product not found");
        }

        if (!payload.name) {
            res.status(400);
            throw new Error("Product name is required");
        }

        const numberValidation = validateNumbers(payload);
        if (numberValidation) {
            res.status(400);
            throw new Error(numberValidation);
        }

        if (payload.sku) {
            const dupSku = await Product.findOne({
                storeId: req.user.storeId,
                sku: payload.sku,
                _id: { $ne: doc._id },
            });
            if (dupSku) {
                res.status(400);
                throw new Error("SKU already exists in your store");
            }
        }

        Object.assign(doc, payload);

        const updated = await doc.save();
        res.json({ item: updated });
    })
);

// DELETE product
router.delete(
    "/:id",
    protect,
    asyncHandler(async (req, res) => {
        const doc = await Product.findOne({
            _id: req.params.id,
            storeId: req.user.storeId,
        });
        if (!doc) {
            res.status(404);
            throw new Error("Product not found");
        }
        await doc.deleteOne();
        res.json({ message: "Product deleted" });
    })
);

module.exports = router;
