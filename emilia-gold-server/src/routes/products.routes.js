const router = require("express").Router();
const Product = require("../models/Product");
const protect = require("../middleware/auth");
const asyncHandler = require("../utils/asyncHandler");

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
        const { name, sku, category, grams, qty, costPrice, sellingPrice, notes } = req.body;

        if (!name) {
            res.status(400);
            throw new Error("Product name is required");
        }

        const doc = await Product.create({
            storeId: req.user.storeId,
            name,
            sku,
            category,
            grams,
            qty,
            costPrice,
            sellingPrice,
            notes,
        });

        res.status(201).json({ item: doc });
    })
);

// PUT update product
router.put(
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

        const fields = ["name", "sku", "category", "grams", "qty", "costPrice", "sellingPrice", "notes", "isActive"];
        for (const f of fields) {
            if (req.body[f] !== undefined) doc[f] = req.body[f];
        }

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
