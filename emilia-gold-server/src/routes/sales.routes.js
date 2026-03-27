const router = require("express").Router();
const mongoose = require("mongoose");
const Sale = require("../models/Sale");
const Product = require("../models/Product");
const Customer = require("../models/Customer");
const Store = require("../models/Store");
const protect = require("../middleware/auth");
const asyncHandler = require("../utils/asyncHandler");
const { buildReceipt } = require("../services/receipt.service");
const { sendReceiptEmail } = require("../services/email.service");

// ─── helpers ─────────────────────────────────────────────────────────────────

function withSession(query, session) {
    return session ? query.session(session) : query;
}

function roundNumber(value, precision = 4) {
    return Number(Number(value || 0).toFixed(precision));
}

function normalizePaymentStatus(status) {
    return status || "Paid";
}

function normaliseItem(raw, product) {
    const quantitySold = Number(raw.quantitySold ?? raw.qty ?? 0);
    const soldWeight = Number(raw.soldWeight ?? raw.weightInGrams ?? raw.grams ?? 0);
    const baseGoldPricePerGram = Number(raw.baseGoldPricePerGram ?? raw.baseCostPerGram ?? 0);
    const markupPerGram = Number(raw.markupPerGram ?? product.markupPerGram ?? 0);
    const extraProfitPerGram = Number(raw.extraProfitPerGram ?? 0);

    if (!raw.productId) {
        throw new Error("Each sale item must include a productId");
    }

    if (!Number.isInteger(quantitySold) || quantitySold < 1) {
        throw new Error("Each sale item must have quantitySold of at least 1");
    }

    if (!Number.isFinite(soldWeight) || soldWeight <= 0) {
        throw new Error("Each sale item must have soldWeight greater than 0");
    }

    if (!Number.isFinite(baseGoldPricePerGram) || baseGoldPricePerGram < 0) {
        throw new Error("Each sale item must have a valid baseGoldPricePerGram");
    }

    if (!Number.isFinite(markupPerGram) || markupPerGram < 0) {
        throw new Error("Each sale item must have a valid markupPerGram");
    }

    if (!Number.isFinite(extraProfitPerGram)) {
        throw new Error("Each sale item must have a valid extraProfitPerGram");
    }

    const productName = String(raw.productName || product.name || raw.description || "").trim();
    if (!productName) {
        throw new Error("Each sale item must include a productName snapshot");
    }

    const minimumPricePerGram = roundNumber(baseGoldPricePerGram + markupPerGram);
    const finalPricePerGram = roundNumber(minimumPricePerGram + extraProfitPerGram);

    if (finalPricePerGram < 0) {
        throw new Error(`Final price per gram for \"${productName}\" cannot be negative`);
    }

    const baseValue = roundNumber(soldWeight * baseGoldPricePerGram);
    const markupValue = roundNumber(soldWeight * markupPerGram);
    const profitValue = roundNumber(soldWeight * extraProfitPerGram);
    const lineTotal = roundNumber(soldWeight * finalPricePerGram);

    return {
        productId: product._id,
        productName,
        description: productName,
        quantitySold,
        soldWeight: roundNumber(soldWeight),
        baseGoldPricePerGram: roundNumber(baseGoldPricePerGram),
        markupPerGram: roundNumber(markupPerGram),
        extraProfitPerGram: roundNumber(extraProfitPerGram),
        minimumPricePerGram,
        finalPricePerGram,
        baseValue,
        markupValue,
        profitValue,
        lineTotal,
        isBelowMinimum: finalPricePerGram < minimumPricePerGram,
    };
}

function computeTotals(items) {
    return {
        totalQuantity: items.reduce((sum, item) => sum + item.quantitySold, 0),
        totalWeight: roundNumber(items.reduce((sum, item) => sum + item.soldWeight, 0)),
        totalBaseValue: roundNumber(items.reduce((sum, item) => sum + item.baseValue, 0)),
        totalMarkupValue: roundNumber(items.reduce((sum, item) => sum + item.markupValue, 0)),
        totalProfitValue: roundNumber(items.reduce((sum, item) => sum + item.profitValue, 0)),
        subtotal: roundNumber(items.reduce((sum, item) => sum + item.lineTotal, 0)),
    };
}

// ─── core sale creation ───────────────────────────────────────────────────────

async function createSaleRecord({ req, payload, session = null }) {
    const {
        customerId,
        ref,
        date,
        paymentMethod,
        paymentStatus,
        notes,
    } = payload;

    const rawItems = payload.items || [];

    // ── 1. Validate customer ──────────────────────────────────────────────────
    if (!customerId) {
        throw new Error("A customer must be selected for every sale");
    }

    const customer = await withSession(
        Customer.findOne({ _id: customerId, storeId: req.user.storeId }),
        session
    );

    if (!customer) {
        throw new Error("Customer not found");
    }

    if (!rawItems.length) {
        throw new Error("At least one sale item is required");
    }

    const productIds = rawItems.map((item) => item.productId).filter(Boolean);
    const products = await withSession(
        Product.find({ _id: { $in: productIds }, storeId: req.user.storeId }),
        session
    );
    const productsById = new Map(products.map((product) => [String(product._id), product]));

    if (productsById.size !== new Set(productIds.map(String)).size) {
        throw new Error("One or more sale items reference products that do not exist in inventory");
    }

    const items = rawItems.map((raw) => {
        const product = productsById.get(String(raw.productId));
        if (!product) {
            throw new Error("Product not found in inventory");
        }
        return normaliseItem(raw, product);
    });

    const requestedByProduct = new Map();
    for (const item of items) {
        const key = String(item.productId);
        const current = requestedByProduct.get(key) || { quantitySold: 0, soldWeight: 0 };
        current.quantitySold += item.quantitySold;
        current.soldWeight = roundNumber(current.soldWeight + item.soldWeight);
        requestedByProduct.set(key, current);
    }

    for (const [productId, requested] of requestedByProduct.entries()) {
        const product = productsById.get(productId);
        if (!product) {
            throw new Error("Product not found in inventory");
        }

        if (product.quantity < requested.quantitySold) {
            throw new Error(
                `Insufficient quantity for \"${product.name}\". Requested ${requested.quantitySold}, available ${product.quantity}`
            );
        }

        if (product.totalWeight < requested.soldWeight) {
            throw new Error(
                `Insufficient total weight for \"${product.name}\". Requested ${requested.soldWeight}g, available ${roundNumber(product.totalWeight)}g`
            );
        }
    }

    for (const [productId, requested] of requestedByProduct.entries()) {
        const product = productsById.get(productId);
        product.quantity -= requested.quantitySold;
        product.totalWeight = roundNumber(Math.max(0, product.totalWeight - requested.soldWeight));
        await product.save(session ? { session } : undefined);
    }

    const totals = computeTotals(items);
    const finalTotal = totals.subtotal;

    await withSession(
        Customer.findByIdAndUpdate(customerId, {
            $inc: { totalSpent: finalTotal },
            $set: { lastPurchase: date ? new Date(date) : new Date() },
        }),
        session
    );

    const salePayload = {
        storeId: req.user.storeId,
        userId: req.user._id,
        customerId,
        ref: ref || undefined,
        date: date ? new Date(date) : undefined,
        items,
        ...totals,
        expectedMargin: totals.totalProfitValue,
        finalTotal,
        paymentMethod,
        paymentStatus: normalizePaymentStatus(paymentStatus),
        notes,
    };

    if (session) {
        const [sale] = await Sale.create([salePayload], { session });
        return sale;
    }

    return Sale.create(salePayload);
}

async function persistSaleWithFallback({ req, payload }) {
    const session = await mongoose.startSession();

    try {
        session.startTransaction();
        const sale = await createSaleRecord({ req, payload, session });
        await session.commitTransaction();
        return sale;
    } catch (err) {
        await session.abortTransaction().catch(() => undefined);

        const message = String(err.message || "");
        const standaloneMongo =
            message.includes("Transaction numbers are only allowed on a replica set member or mongos") ||
            message.includes("Transaction support");

        if (!standaloneMongo) throw err;

        return createSaleRecord({ req, payload });
    } finally {
        session.endSession();
    }
}

// ─── routes ───────────────────────────────────────────────────────────────────

// GET all sales for current store
router.get(
    "/",
    protect,
    asyncHandler(async (req, res) => {
        const filter = { storeId: req.user.storeId };

        if (req.query.status) filter.paymentStatus = req.query.status;
        if (req.query.customerId) filter.customerId = req.query.customerId;

        if (req.query.from || req.query.to) {
            filter.date = {};
            if (req.query.from) filter.date.$gte = new Date(req.query.from);
            if (req.query.to) {
                const toDate = new Date(req.query.to);
                toDate.setHours(23, 59, 59, 999);
                filter.date.$lte = toDate;
            }
        }

        const docs = await Sale.find(filter)
            .populate("customerId", "name phone email")
            .sort({ date: -1 })
            .limit(500);

        res.json({ items: docs });
    })
);

// GET single sale (with receipt data)
router.get(
    "/:id",
    protect,
    asyncHandler(async (req, res) => {
        const doc = await Sale.findOne({
            _id: req.params.id,
            storeId: req.user.storeId,
        }).populate("customerId", "name phone email");

        if (!doc) {
            res.status(404);
            throw new Error("Sale not found");
        }

        res.json({ item: doc });
    })
);

// GET receipt for a sale
router.get(
    "/:id/receipt",
    protect,
    asyncHandler(async (req, res) => {
        const sale = await Sale.findOne({
            _id: req.params.id,
            storeId: req.user.storeId,
        }).populate("customerId", "name phone email");

        if (!sale) {
            res.status(404);
            throw new Error("Sale not found");
        }

        const store = await Store.findById(req.user.storeId).select("name phone email");
        const receipt = buildReceipt({ sale, customer: sale.customerId, store });
        res.json({ receipt });
    })
);

// POST create sale — deducts inventory, requires customer
router.post(
    "/",
    protect,
    asyncHandler(async (req, res) => {
        const payload = req.body;
        const { customerId, items = [], paymentMethod, paymentStatus } = payload;

        if (!customerId) {
            res.status(400);
            throw new Error("customerId is required");
        }

        if (!items.length) {
            res.status(400);
            throw new Error("At least one item is required");
        }

        const allowedStatuses = ["Paid", "Pending", "Refunded"];
        if (paymentStatus && !allowedStatuses.includes(paymentStatus)) {
            res.status(400);
            throw new Error(`Status must be one of: ${allowedStatuses.join(", ")}`);
        }

        const allowedMethods = ["Cash", "Card", "Transfer", "Other"];
        if (paymentMethod && !allowedMethods.includes(paymentMethod)) {
            res.status(400);
            throw new Error(`paymentMethod must be one of: ${allowedMethods.join(", ")}`);
        }

        if (!payload.ref) {
            payload.ref = `TX-${Date.now().toString().slice(-6)}`;
        }

        const sale = await persistSaleWithFallback({ req, payload });

        // Populate customer for receipt
        await sale.populate("customerId", "name phone email");
        const store = await Store.findById(req.user.storeId).select("name phone email");
        const receipt = buildReceipt({ sale, customer: sale.customerId, store });

        res.status(201).json({ item: sale, receipt });
    })
);

// POST send receipt by email
router.post(
    "/:id/receipt/email",
    protect,
    asyncHandler(async (req, res) => {
        const sale = await Sale.findOne({
            _id: req.params.id,
            storeId: req.user.storeId,
        }).populate("customerId", "name phone email");

        if (!sale) {
            res.status(404);
            throw new Error("Sale not found");
        }

        const customer = sale.customerId;
        if (!customer?.email) {
            res.status(400);
            throw new Error("Customer does not have an email address on record");
        }

        const store = await Store.findById(req.user.storeId).select("name phone email");
        const receipt = buildReceipt({ sale, customer, store });
        const result = await sendReceiptEmail({ to: customer.email, receipt });

        res.json({ sent: result.sent, message: result.message || "Receipt dispatched" });
    })
);

// PATCH update sale status
router.patch(
    "/:id/status",
    protect,
    asyncHandler(async (req, res) => {
        const { status } = req.body;
        const allowed = ["Paid", "Pending", "Refunded"];

        if (!allowed.includes(status)) {
            res.status(400);
            throw new Error(`Status must be one of: ${allowed.join(", ")}`);
        }

        const doc = await Sale.findOne({
            _id: req.params.id,
            storeId: req.user.storeId,
        });

        if (!doc) {
            res.status(404);
            throw new Error("Sale not found");
        }

        doc.paymentStatus = status;
        const updated = await doc.save();
        res.json({ item: updated });
    })
);

module.exports = router;
