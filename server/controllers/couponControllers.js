import mongoose from "mongoose";
import Coupon from "../models/couponModel.js";
import Cart from "../models/cartModel.js"

const getCoupons = async (req, res) => {
    const now = new Date();

    const coupons = await Coupon.find({
        isActive: true,
        $or: [
            { expiresAt: null },
            { expiresAt: { $gt: now } }
        ]
    })
        .populate("vendor", "businessName email phone")
        .sort({ createdAt: -1 });

    return res.status(200).json({
        message: "Currently available coupons.",
        count: coupons.length,
        coupons
    });
};

const applyCoupon = async (req, res) => {
    const userId = req.user._id

    const { vendorId, couponCode } = req.body

    if (typeof vendorId !== "string" || !mongoose.isValidObjectId(vendorId)) {
        res.status(401)
        throw new Error("Please Provide a Valid Vendor Id")
    }

    if (typeof couponCode !== "string" || !couponCode.trim()) {
        res.status(409)
        throw new Error("Please provide a Coupon Code!!!")
    }

    const normalizedCode = couponCode.trim().toUpperCase();

    const coupon = await Coupon.findOne({
        vendor: vendorId,
        couponCode: normalizedCode
    });

    if (!coupon) {
        res.status(409)
        throw new Error("Couldn't Find the Applied Coupon , please retry after a while!!!")
    }

    if (!coupon.isActive) {
        res.status(409);
        throw new Error("This coupon is currently inactive!");
    }

    if (coupon.expiresAt && coupon.expiresAt <= new Date()) {
        res.status(409);
        throw new Error("This coupon has expired!");
    }

    const cart = await Cart.findOne({ user: userId })

    if (!cart) {
        res.status(404)
        throw new Error("No Such Cart Exist , add Prdoucts to Cart To apply Coupon")
    }

    if (cart.products.length === 0) {
        res.status(404)
        throw new Error("No products Found in The Cart, add Prdoucts to Cart To apply Coupon")
    }

    await cart.populate("products.product")

    const couponVendorProducts = cart.products.filter(
        (item) =>
            item.product &&
            item.product.vendor.toString() === vendorId &&
            item.product.isActive === true
    );

    // console.log(couponVendorProducts)

    if (couponVendorProducts.length === 0) {
        res.status(404)
        throw new Error("No active products from this vendor exist in your cart!")
    }

    const existingCouponIndex = cart.appliedCoupons.findIndex(
        (item) => item.vendor.toString() === vendorId
    );

    const appliedCoupon = {
        vendor: coupon.vendor,
        coupon: coupon._id
    }


    if (existingCouponIndex === -1) {
        cart.appliedCoupons.push(appliedCoupon)
    }
    else {
        cart.appliedCoupons.set(existingCouponIndex, appliedCoupon);
    }

    await cart.save();

    await cart.populate("appliedCoupons.coupon");

    // console.log(appliedCoupon)
    // console.log(cart.appliedCoupons)

    res.status(200).json({
        count: cart.appliedCoupons.length,
        message: "Coupon Applied Successfully",
        coupons: cart.appliedCoupons
    })

}


const removeCoupon = async (req, res) => {
    const userId = req.user._id;
    const { vendorId } = req.body;

    // 1. Validate vendor ID
    if (
        typeof vendorId !== "string" ||
        !mongoose.isValidObjectId(vendorId)
    ) {
        res.status(400);
        throw new Error("Please provide a valid vendor ID!");
    }

    // 2. Find customer's cart
    const cart = await Cart.findOne({ user: userId });

    if (!cart) {
        res.status(404);
        throw new Error("Cart not found!");
    }

    // 3. Find coupon belonging to this vendor
    const existingCouponIndex = cart.appliedCoupons.findIndex(
        item => item.vendor.toString() === vendorId
    );

    if (existingCouponIndex === -1) {
        res.status(404);
        throw new Error("No applied coupon found for this vendor!");
    }

    // 4. Remove the coupon
    cart.appliedCoupons.splice(existingCouponIndex, 1);

    // 5. Save updated cart
    await cart.save();

    return res.status(200).json({
        count: cart.appliedCoupons.length,
        message: "Coupon removed successfully!",
        appliedCoupons: cart.appliedCoupons
    });
};


const couponController = { getCoupons, applyCoupon , removeCoupon };

export default couponController;