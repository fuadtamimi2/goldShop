require("dotenv").config();

const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const { connectDB } = require("./config/db");

const authRoutes = require("./routes/auth.routes");
const customersRoutes = require("./routes/customers.routes");
const productsRoutes = require("./routes/products.routes");
const salesRoutes = require("./routes/sales.routes");

const errorHandler = require("./middleware/errorHandler");

const app = express();

// Core middleware
app.use(express.json());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
    credentials: true,
  })
);
app.use(morgan("dev"));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/customers", customersRoutes);
app.use("/api/products", productsRoutes);
app.use("/api/sales", salesRoutes);

// Health check route
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    time: new Date().toISOString(),
  });
});


// Error handler (must be last middleware)

app.use(errorHandler);


// Server start

const PORT = process.env.PORT || 5000;

connectDB(process.env.MONGO_URI)
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ DB connection failed:", err.message);
  });