const router = require("express").Router();
const Customer = require("../models/Customer");
const protect = require("../middleware/auth");
const asyncHandler = require("../utils/asyncHandler");

// GET all customers for current store
router.get(
  "/",
  protect,
  asyncHandler(async (req, res) => {
    const q = (req.query.q || "").trim();

    const filter = {
      storeId: req.user.storeId,
    };

    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: "i" } },
        { phone: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
        { city: { $regex: q, $options: "i" } },
      ];
    }

    const docs = await Customer.find(filter)
      .sort({ createdAt: -1 })
      .limit(200);

    res.json({ items: docs });
  })
);

// GET one customer by id (only from same store)
router.get(
  "/:id",
  protect,
  asyncHandler(async (req, res) => {
    const doc = await Customer.findOne({
      _id: req.params.id,
      storeId: req.user.storeId,
    });

    if (!doc) {
      res.status(404);
      throw new Error("Customer not found");
    }

    res.json({ item: doc });
  })
);

// POST create customer
router.post(
  "/",
  protect,
  asyncHandler(async (req, res) => {
    const { name, phone, idNumber, email, city, notes } = req.body;

    if (!name || !phone) {
      res.status(400);
      throw new Error("Name and phone are required");
    }

    const doc = await Customer.create({
      storeId: req.user.storeId,
      name,
      phone,
      idNumber,
      email,
      city,
      notes,
    });

    res.status(201).json({ item: doc });
  })
);

// PUT update customer
router.put(
  "/:id",
  protect,
  asyncHandler(async (req, res) => {
    const { name, phone, idNumber, email, city, notes, totalSpent, lastPurchase } = req.body;

    const doc = await Customer.findOne({
      _id: req.params.id,
      storeId: req.user.storeId,
    });

    if (!doc) {
      res.status(404);
      throw new Error("Customer not found");
    }

    if (name !== undefined) doc.name = name;
    if (phone !== undefined) doc.phone = phone;
    if (idNumber !== undefined) doc.idNumber = idNumber;
    if (email !== undefined) doc.email = email;
    if (city !== undefined) doc.city = city;
    if (notes !== undefined) doc.notes = notes;
    if (totalSpent !== undefined) doc.totalSpent = totalSpent;
    if (lastPurchase !== undefined) doc.lastPurchase = lastPurchase;

    const updated = await doc.save();

    res.json({ item: updated });
  })
);

// DELETE customer
router.delete(
  "/:id",
  protect,
  asyncHandler(async (req, res) => {
    const doc = await Customer.findOne({
      _id: req.params.id,
      storeId: req.user.storeId,
    });

    if (!doc) {
      res.status(404);
      throw new Error("Customer not found");
    }

    await doc.deleteOne();

    res.json({ message: "Customer deleted" });
  })
);

module.exports = router;