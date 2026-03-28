const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const protect = require("../middleware/auth");
const Store = require("../models/Store");

const router = express.Router();

// GET store by ID
router.get("/:id", protect, asyncHandler(async (req, res) => {
    const store = await Store.findById(req.params.id);
    if (!store) {
        return res.status(404).json({ error: "Store not found" });
    }
    res.json({ item: store });
}));

// GET store settings by ID
router.get("/:id/settings", protect, asyncHandler(async (req, res) => {
    const store = await Store.findById(req.params.id);
    if (!store) {
        return res.status(404).json({ error: "Store not found" });
    }
    res.json({ item: store.settings || {} });
}));

// PATCH store settings by ID
router.patch("/:id/settings", protect, asyncHandler(async (req, res) => {
    const store = await Store.findById(req.params.id);
    if (!store) {
        return res.status(404).json({ error: "Store not found" });
    }

    // Merge settings (don't overwrite entire object, just update fields)
    if (req.body) {
        store.settings = { ...store.settings, ...req.body };
    }

    await store.save();
    res.json({ item: store, settings: store.settings });
}));

// PUT store by ID (full update)
router.put("/:id", protect, asyncHandler(async (req, res) => {
    const store = await Store.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
    );
    if (!store) {
        return res.status(404).json({ error: "Store not found" });
    }
    res.json({ item: store });
}));

module.exports = router;
