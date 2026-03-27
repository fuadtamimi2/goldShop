const router = require("express").Router();
const Customer = require("../models/Customer");
const protect = require("../middleware/auth");
const asyncHandler = require("../utils/asyncHandler");

function normalizeDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

function isValidCustomerPhone(value) {
  const digits = normalizeDigits(value);
  return /^(052|059)\d{7}$/.test(digits);
}

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
    const cleanName = String(name || "").trim();
    const cleanPhone = normalizeDigits(phone);
    const cleanIdNumber = normalizeDigits(idNumber);

    if (!cleanName || !cleanPhone || !cleanIdNumber) {
      res.status(400);
      throw new Error("Name, phone and ID number are required");
    }

    if (!isValidCustomerPhone(cleanPhone)) {
      res.status(400);
      throw new Error("Phone must start with 052 or 059 and be 10 digits");
    }

    const doc = await Customer.create({
      storeId: req.user.storeId,
      name: cleanName,
      phone: cleanPhone,
      idNumber: cleanIdNumber,
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

    if (name !== undefined) {
      const cleanName = String(name || "").trim();
      if (!cleanName) {
        res.status(400);
        throw new Error("Name cannot be empty");
      }
      doc.name = cleanName;
    }

    if (phone !== undefined) {
      const cleanPhone = normalizeDigits(phone);
      if (!isValidCustomerPhone(cleanPhone)) {
        res.status(400);
        throw new Error("Phone must start with 052 or 059 and be 10 digits");
      }
      doc.phone = cleanPhone;
    }

    if (idNumber !== undefined) {
      const cleanIdNumber = normalizeDigits(idNumber);
      if (!cleanIdNumber) {
        res.status(400);
        throw new Error("ID number is required");
      }
      doc.idNumber = cleanIdNumber;
    }
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