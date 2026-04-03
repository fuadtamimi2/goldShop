const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const protect = require("../middleware/auth");
const Store = require("../models/Store");

const router = express.Router();

function ensureStoreAccess(req) {
    if (String(req.user.storeId) !== String(req.params.id)) {
        const err = new Error("Forbidden for this store");
        err.statusCode = 403;
        throw err;
    }
}

// GET store by ID
router.get("/:id", protect, asyncHandler(async (req, res) => {
    ensureStoreAccess(req);
    const store = await Store.findById(req.params.id);
    if (!store) {
        res.status(404);
        throw new Error("Store not found");
    }
    res.json({ item: store });
}));

// GET store settings by ID
router.get("/:id/settings", protect, asyncHandler(async (req, res) => {
    ensureStoreAccess(req);
    const store = await Store.findById(req.params.id);
    if (!store) {
        res.status(404);
        throw new Error("Store not found");
    }
    res.json({ item: store.settings || {} });
}));

// PATCH store settings by ID
router.patch("/:id/settings", protect, asyncHandler(async (req, res) => {
    ensureStoreAccess(req);
    const store = await Store.findById(req.params.id);
    if (!store) {
        res.status(404);
        throw new Error("Store not found");
    }

    // Merge settings (don't overwrite entire object, just update fields)
    if (req.body) {
        const nextSettings = { ...req.body };
        if (Object.prototype.hasOwnProperty.call(nextSettings, "defaultMarkupPerGram")) {
            delete nextSettings.defaultMarkupPerGram;
        }

        store.settings = { ...store.settings, ...nextSettings };
    }

    await store.save();
    res.json({ item: store, settings: store.settings });
}));

// PUT store by ID (full update)
router.put("/:id", protect, asyncHandler(async (req, res) => {
    ensureStoreAccess(req);
    const store = await Store.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
    );
    if (!store) {
        res.status(404);
        throw new Error("Store not found");
    }
    res.json({ item: store });
}));

module.exports = router;
