
import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import dns from 'dns'
import User from "./models/userModel.js";
import Vendor from "./models/vendorModel.js";
import Category from "./models/categoryModel.js";
import Product from "./models/productModel.js";
import Coupon from "./models/couponModel.js";
import Cart from "./models/cartModel.js";
import readline from "node:readline/promises";
import { stdin, stdout } from "node:process";

dns.setServers(['8.8.8.8','8.8.4.4'])

const runSeed = async () => {
  try {
    // 1. Connect to MongoDB
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is missing from your .env file.");
    }

    await mongoose.connect(process.env.MONGO_URI);

    console.log("\nConnected to database:", mongoose.connection.name);

    // 2. Confirm before deleting data
    const rl = readline.createInterface({ input: stdin, output: stdout });

    const answer = await rl.question(
      "\nThis will delete existing development data except admin users.\n" +
      "Type RESET to continue: "
    );

    rl.close();

    if (answer !== "RESET") {
      console.log("Seed cancelled. No data was deleted.");
      return;
    }

    // 3. Find and preserve the existing admin
    const admin = await User.findOne({ role: "admin" });

    if (!admin) {
      throw new Error(
        "No admin account found. Register an admin first, then run the seed script."
      );
    }

    console.log("Preserving admin account:", admin.email);

    // 4. Clear old development data
    await Cart.deleteMany({});
    await Coupon.deleteMany({});
    await Product.deleteMany({});
    await Vendor.deleteMany({});
    await Category.deleteMany({});
    await User.deleteMany({
      _id: { $ne: admin._id },
    });

    console.log("Old development data cleared.");

    // 5. Create vendor-owner accounts
    const hashedPassword = await bcrypt.hash("Vendor@12345", 10);

    const vendorUsers = await User.create([
      {
        name: "BuildMart Supplies Owner",
        email: "vendor1@example.com",
        phone: "9000000001",
        password: hashedPassword,
        role: "vendor",
        isActive: true,
      },
      {
        name: "ProBuild Materials Owner",
        email: "vendor2@example.com",
        phone: "9000000002",
        password: hashedPassword,
        role: "vendor",
        isActive: true,
      },
    ]);

     const customerPassword = await bcrypt.hash("Customer@12345", 10);

    const customers = await User.create([
      {
        name: "Rahul Sharma",
        email: "rahul@example.com",
        phone: "9000000011",
        password: customerPassword,
        role: "user",
        isActive: true,
      },
      {
        name: "Priya Verma",
        email: "priya@example.com",
        phone: "9000000012",
        password: customerPassword,
        role: "user",
        isActive: true,
      },
      {
        name: "Aman Patel",
        email: "aman@example.com",
        phone: "9000000013",
        password: customerPassword,
        role: "user",
        isActive: true,
      },
    ]);

    // 6. Create categories
    const categories = await Category.create([
      { name: "Cement" },
      { name: "Bricks and Blocks" },
      { name: "Steel and TMT Bars" },
      { name: "Tiles" },
      { name: "Paints" },
    ]);

    const categoryByName = Object.fromEntries(
      categories.map(category => [category.name, category._id])
    );

    // 7. Create vendors
    const vendors = await Vendor.create([
      {
        user: vendorUsers[0]._id,
        businessName: "BuildMart Supplies",
        phone: vendorUsers[0].phone,
        email: "sales@buildmart.example.com",
        address: {
          street: "12 Industrial Area",
          city: "Indore",
          state: "Madhya Pradesh",
          pincode: "452001",
          country: "India",
        },
        category: [
          categoryByName["Cement"],
          categoryByName["Bricks and Blocks"],
          categoryByName["Steel and TMT Bars"],
        ],
        status: "active",
        isActive: true,
      },
      {
        user: vendorUsers[1]._id,
        businessName: "ProBuild Materials",
        phone: vendorUsers[1].phone,
        email: "sales@probuild.example.com",
        address: {
          street: "25 Commercial Road",
          city: "Indore",
          state: "Madhya Pradesh",
          pincode: "452002",
          country: "India",
        },
        category: [
          categoryByName["Tiles"],
          categoryByName["Paints"],
        ],
        status: "active",
        isActive: true,
      },
    ]);

    // 8. Create products
    // These image URLs are placeholders for development.
    await Product.create([
      {
        productName: "Portland Cement 50kg",
        description: "General-purpose cement for construction work.",
        brand: "BuildMart",
        price: 380,
        image: ["https://placehold.co/600x600?text=Cement"],
        category: categoryByName["Cement"],
        vendor: vendors[0]._id,
        stock: 200,
        unit: "bag",
        isActive: true,
      },
      {
        productName: "Red Clay Bricks",
        description: "Durable clay bricks for building walls.",
        brand: "BuildMart",
        price: 8,
        image: ["https://placehold.co/600x600?text=Bricks"],
        category: categoryByName["Bricks and Blocks"],
        vendor: vendors[0]._id,
        stock: 5000,
        unit: "piece",
        isActive: true,
      },
      {
        productName: "TMT Steel Bar",
        description: "Steel reinforcement bar for concrete structures.",
        brand: "BuildMart",
        price: 650,
        image: ["https://placehold.co/600x600?text=Steel"],
        category: categoryByName["Steel and TMT Bars"],
        vendor: vendors[0]._id,
        stock: 100,
        unit: "piece",
        isActive: true,
      },
      {
        productName: "Ceramic Floor Tiles",
        description: "Ceramic floor tiles for residential interiors.",
        brand: "ProBuild",
        price: 750,
        image: ["https://placehold.co/600x600?text=Tiles"],
        category: categoryByName["Tiles"],
        vendor: vendors[1]._id,
        stock: 150,
        unit: "box",
        isActive: true,
      },
      {
        productName: "Interior Wall Paint",
        description: "Interior wall paint for smooth wall finishes.",
        brand: "ProBuild",
        price: 1200,
        image: ["https://placehold.co/600x600?text=Paint"],
        category: categoryByName["Paints"],
        vendor: vendors[1]._id,
        stock: 80,
        unit: "liter",
        isActive: true,
      },
    ]);

    // 9. Create one coupon for each vendor
    await Coupon.create([
      {
        vendor: vendors[0]._id,
        couponCode: "BUILD10",
        couponDiscount: 10,
        discountType: "percentage",
        isActive: true,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
      {
        vendor: vendors[1]._id,
        couponCode: "PROBUILD100",
        couponDiscount: 100,
        discountType: "fixed",
        isActive: true,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    ]);

    console.log("\nSeed completed successfully!");
    console.log({
      preservedAdmin: admin.email,
      vendorAccounts: vendorUsers.length,
      categories: categories.length,
      vendors: vendors.length,
      products: 5,
      coupons: 2,
      carts: 0,
    });

    console.log("\nTest vendor login credentials:");
    console.log("Vendor 1: vendor1@example.com / Vendor@12345");
    console.log("Vendor 2: vendor2@example.com / Vendor@12345");
  } catch (error) {
    console.error("\nSeed failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

runSeed();
