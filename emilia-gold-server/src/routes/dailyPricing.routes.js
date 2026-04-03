const router = require("express").Router();
const DailyPricing = require("../models/DailyPricing");
const protect = require("../middleware/auth");
const asyncHandler = require("../utils/asyncHandler");

function todayDateString() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate()
    ).padStart(2, "0")}`;
}

// GET /api/daily-pricing/today — check if today's pricing exists for this store
router.get(
    "/today",
    protect,
    asyncHandler(async (req, res) => {
        const pricingDate = todayDateString();
        const doc = await DailyPricing.findOne({
            storeId: req.user.storeId,
            pricingDate,
        });

        if (!doc) {
            return res.json({ exists: false, item: null });
        }

        res.json({ exists: true, item: doc });
    })
);

// GET /api/daily-pricing/latest — most recent record (used for "Use yesterday values")
router.get(
    "/latest",
    protect,
    asyncHandler(async (req, res) => {
        const doc = await DailyPricing.findOne({ storeId: req.user.storeId }).sort({
            pricingDate: -1,
            createdAt: -1,
        });

        res.json({ item: doc || null });
    })
);

// GET /api/daily-pricing — list recent records
router.get(
    "/",
    protect,
    asyncHandler(async (req, res) => {
        const docs = await DailyPricing.find({ storeId: req.user.storeId })
            .sort({ pricingDate: -1, createdAt: -1 })
            .limit(30);

        res.json({ items: docs });
    })
);

// POST /api/daily-pricing — create or update today's pricing
router.post(
    "/",
    protect,
    asyncHandler(async (req, res) => {
        const {
            globalGoldPricePerOunce,
            buyOffsetPerOunce,
            sellOffsetPerOunce,
            usdIlsExchangeRate,
            sourceLabel,
            pricingDate: requestedDate,
        } = req.body;

        if (!Number.isFinite(Number(globalGoldPricePerOunce)) || Number(globalGoldPricePerOunce) <= 0) {
            res.status(400);
            throw new Error("globalGoldPricePerOunce must be a positive number");
        }

        if (!Number.isFinite(Number(usdIlsExchangeRate)) || Number(usdIlsExchangeRate) <= 0) {
            res.status(400);
            throw new Error("usdIlsExchangeRate must be a positive number");
        }

        const pricingDate = requestedDate || todayDateString();

        // Upsert: replace the record for this date if it already exists
        const doc = await DailyPricing.findOneAndUpdate(
            { storeId: req.user.storeId, pricingDate },
            {
                storeId: req.user.storeId,
                pricingDate,
                globalGoldPricePerOunce: Number(globalGoldPricePerOunce),
                buyOffsetPerOunce: Number(buyOffsetPerOunce ?? 0),
                sellOffsetPerOunce: Number(sellOffsetPerOunce ?? 0),
                usdIlsExchangeRate: Number(usdIlsExchangeRate),
                snapshotTimestamp: new Date(),
                sourceLabel: String(sourceLabel || "manual"),
                createdBy: req.user._id,
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        res.status(201).json({ item: doc });
    })
);

module.exports = router;
