const router = require("express").Router();
const mongoose = require("mongoose");
const Sale = require("../models/Sale");
const Product = require("../models/Product");
const Customer = require("../models/Customer");
const protect = require("../middleware/auth");
const asyncHandler = require("../utils/asyncHandler");

// GET all sales for current store
router.get(
    "/",
    protect,
    asyncHandler(async (req, res) => {
        const filter = { storeId: req.user.storeId };

        if (req.query.status) filter.status = req.query.status;
        if (req.query.customerId) filter.customerId = req.query.customerId;

        // Date range filter: ?from=YYYY-MM-DD&to=YYYY-MM-DD
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
            .populate("customerId", "name phone")
            .sort({ date: -1 })
            .limit(500);

        res.json({ items: docs });
    })
);

// GET single sale
router.get(
    "/:id",
    protect,
    asyncHandler(async (req, res) => {
        const doc = await Sale.findOne({
            _id: req.params.id,
            storeId: req.user.storeId,
        }).populate("customerId", "name phone");

        if (!doc) {
            res.status(404);
            throw new Error("Sale not found");
        }
        res.json({ item: doc });
    })
);

// POST create sale  — atomically deducts inventory qty for each linked product
router.post(
    "/",
    protect,
    asyncHandler(async (req, res) => {
        const {
            customerId,
            ref,
            date,
            items = [],
            totalILS,
            paymentMethod,
            status,
            notes,
        } = req.body;

        if (!totalILS || totalILS <= 0) {
            res.status(400);
            throw new Error("totalILS must be greater than 0");
        }

        if (!items.length) {
            res.status(400);
            throw new Error("At least one item is required");
        }

        // Validate each item has description and unitPrice
        for (const item of items) {
            if (!item.description) {
                res.status(400);
                throw new Error("Each item must have a description");
            }
            if (item.unitPrice == null || item.unitPrice < 0) {
                res.status(400);
                throw new Error("Each item must have a valid unitPrice");
            }
        }

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            // Deduct stock for any item that references a real product
            for (const item of items) {
                if (item.productId) {
                    const product = await Product.findOne({
                        _id: item.productId,
                        storeId: req.user.storeId,
                    }).session(session);

                    if (!product) {
                        throw new Error(`Product ${item.productId} not found`);
                    }

                    const deduct = item.qty || 1;
                    if (product.qty < deduct) {
                        throw new Error(`Insufficient stock for "${product.name}" (available: ${product.qty})`);
                    }

                    product.qty -= deduct;
                    await product.save({ session });
                }
            }

            // Update customer totalSpent + lastPurchase if linked
            if (customerId) {
                await Customer.findOneAndUpdate(
                    { _id: customerId, storeId: req.user.storeId },
                    {
                        $inc: { totalSpent: totalILS },
                        $set: { lastPurchase: date ? new Date(date) : new Date() },
                    },
                    { session }
                );
            }

            const [sale] = await Sale.create(
                [
                    {
                        storeId: req.user.storeId,
                        userId: req.user._id,
                        customerId: customerId || null,
                        ref,
                        date: date ? new Date(date) : undefined,
                        items,
                        totalILS,
                        paymentMethod,
                        status,
                        notes,
                    },
                ],
                { session }
            );

            await session.commitTransaction();
            session.endSession();

            res.status(201).json({ item: sale });
        } catch (err) {
            await session.abortTransaction();
            session.endSession();
            throw err;
        }
    })
);

// PATCH update sale status (e.g. mark as Refunded)
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

        doc.status = status;
        const updated = await doc.save();
        res.json({ item: updated });
    })
);

module.exports = router;
