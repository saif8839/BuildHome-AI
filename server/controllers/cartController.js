import Cart from "../models/cartModel.js";
import Product from "../models/productModel.js";
import User from "../models/userModel.js"
import mongoose from "mongoose";

const getCart = async (req, res) => {
    const cart = await Cart.findOne({ user: req.user._id })

    if (!cart) {
        return res.status(200).json({
            productCount: 0,
            cart: {
                user: userId,
                products: []
            }
        });
    }

    await cart.populate("products.product")

    res.status(200).json(
        {
            productCount: cart.products.length,
            cart: cart
        }
    )

}


const addToCart = async (req, res) => {
    const userId = req.user._id;
    const { product, quantity } = req.body;

    // 1. Validate required fields
    if (
        !product ||
        quantity === undefined ||
        quantity === null ||
        quantity === ""
    ) {
        res.status(400);
        throw new Error("Product ID and quantity are required!");
    }

    // 2. Validate quantity
    const requestedQuantity = Number(quantity);

    if (
        !Number.isSafeInteger(requestedQuantity) ||
        requestedQuantity < 1
    ) {
        res.status(400);
        throw new Error("Quantity must be a positive whole number!");
    }

    // 3. Validate product ID
    if (!mongoose.isValidObjectId(product)) {
        res.status(400);
        throw new Error("Invalid product ID!");
    }

    // 4. Find product
    const productExist = await Product.findById(product);

    if (!productExist || !productExist.isActive) {
        res.status(404);
        throw new Error("Product not found or unavailable!");
    }

    // 5. Find cart or create a new one
    let cart = await Cart.findOne({ user: userId });

    if (!cart) {
        cart = new Cart({
            user: userId,
            products: [],
        });
    }

    // 6. Check whether product is already in cart
    const productIndex = cart.products.findIndex(
        (item) =>
            item.product.toString() === productExist._id.toString()
    );

    let finalQuantity;

    if (productIndex > -1) {
        // Existing product: increase quantity by exactly 1
        finalQuantity = cart.products[productIndex].quantity + 1;
    } else {
        // New product: use the quantity provided by the user
        finalQuantity = requestedQuantity;
    }

    // 7. Check available stock
    if (finalQuantity > productExist.stock) {
        res.status(400);
        throw new Error("Requested quantity exceeds available stock!");
    }

    // 8. Update cart
    if (productIndex > -1) {
        cart.products[productIndex].quantity = finalQuantity;
    } else {
        cart.products.push({
            product: productExist._id,
            quantity: requestedQuantity,
        });
    }

    // 9. Save and populate product details
    await cart.save();
    await cart.populate("products.product", "-image");

    return res.status(200).json({
        message: "Product added to cart successfully!",
        cart,
    });
};


const updateCart = async (req, res) => {
    const userId = req.user._id;
    const { product, quantity } = req.body;

    // 1. Validate input
    if (!product || quantity === undefined || quantity === null || quantity === "") {
        res.status(400)
        throw new Error("Product ID and quantity are required!")
    }

    // 2. Validate quantity
    const newQuantity = Number(quantity);

    if (!Number.isSafeInteger(newQuantity) || newQuantity < 1) {
        res.status(400);
        throw new Error("Quantity must be a positive whole number!");
    }

    // 3. Validate product ID
    if (!mongoose.isValidObjectId(product)) {
        res.status(400);
        throw new Error("Invalid product ID!");
    }

    const productExist = await Product.findById(product)

    if (!productExist || !productExist.isActive) {
        res.status(409)
        throw new Error("No Such Product Exists , Invalid Product Id..")
    }

    const cart = await Cart.findOne({ user: userId })

    if (!cart) {
        res.status(401)
        throw new Error("please Add To The Cart First!!!")
    }

    const productIndex = cart.products.findIndex((item) => item.product.toString() === product)

    if (productIndex === -1) {
        res.status(404);
        throw new Error("Product not found in your cart!");
    }

    // 7. Check stock
    if (newQuantity > productExist.stock) {
        res.status(400);
        throw new Error("Requested quantity exceeds available stock!");
    }

    cart.products[productIndex].quantity = newQuantity

    await cart.save()
    await cart.populate("products.product", "-image")

    res.status(200).json({
        message: "cart Updated Successfully!!!",
        cart: cart
    })

}

const removeFromCart = async (req, res) => {
    const userId = req.user._id;
    const { product } = req.body;

    // 1. Validate product ID
    if (!product) {
        res.status(400);
        throw new Error("Product ID is required!");
    }

    if (!mongoose.isValidObjectId(product)) {
        res.status(400);
        throw new Error("Invalid product ID!");
    }

    // 2. Find the logged-in user's cart
    const cart = await Cart.findOne({ user: userId });

    if (!cart) {
        res.status(404);
        throw new Error("Cart not found!");
    }

    // 3. Find the product inside the cart
    const productIndex = cart.products.findIndex(
        (item) => item.product.toString() === product
    );

    if (productIndex === -1) {
        res.status(404);
        throw new Error("Product not found in your cart!");
    }

    // 4. Remove the product from the cart
    cart.products.splice(productIndex, 1);

    // 5. Save the updated cart
    await cart.save();

    // 6. Populate product details
    await cart.populate("products.product");

    // 7. Send response
    return res.status(200).json({
        message: "Product removed from cart successfully!",
        cart,
    });
};

const clearCart = async (req, res) => {
    const userId = req.user._id;

    const cart = await Cart.findOne({ user: userId });

    if (!cart) {
        res.status(404);
        throw new Error("Cart not found!");
    }

    if (cart.products.length === 0) {
        res.status(200);
        throw new Error("No items to clear from the cart!");
    }

    cart.products = [];

    // Save the changes to MongoDB
    await cart.save();

    return res.status(200).json({
        message: "Cart has been cleared successfully!",
        cart,
    });
}

const cartController = {
    addToCart, updateCart, getCart, removeFromCart, clearCart
}

export default cartController