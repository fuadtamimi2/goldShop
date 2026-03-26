require("dotenv").config();

const { connectDB } = require("../config/db");
const Store = require("../models/Store");
const User = require("../models/User");

const seed = async () => {
  try {
    await connectDB(process.env.MONGO_URI);

    let store = await Store.findOne({ slug: "emilia-gold" });

    if (!store) {
      store = await Store.create({
        name: "Emilia Gold",
        slug: "emilia-gold",
        phone: "0590000000",
        email: "admin@emilia-gold.com",
      });
      console.log("Store created");
    } else {
      console.log("Store already exists");
    }

    let admin = await User.findOne({ email: "admin@emilia-gold.com" });

    if (!admin) {
      admin = await User.create({
        storeId: store._id,
        name: "Admin",
        email: "admin@emilia-gold.com",
        password: "123456",
        role: "owner",
      });
      console.log("Admin created");
    } else {
      console.log("Admin already exists");
    }

    console.log("Seeding complete");
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

seed();