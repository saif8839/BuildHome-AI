import Cart from "../models/cartModel.js"
import calculateTaxTotal from "../features/calculateTaxTotal.js"
import Order from "../models/orderModel.js"
import mongoose from "mongoose"
import { randomUUID } from "node:crypto"
import Product from "../models/productModel.js";


const createOrder = async (req, res) => {
    // 1. Extract user and request data
    const userId = req.user._id;
    const { shippingAddress, paymentMethod } = req.body;


    // 2. Validate payment method
    if (!["online", "cod"].includes(paymentMethod)) {
        res.status(400);
        throw new Error("Please select a valid payment method!");
    }

    // 3. Validate shipping address
    if (
        !shippingAddress ||
        typeof shippingAddress !== "object" ||
        Array.isArray(shippingAddress)
    ) {
        res.status(400);
        throw new Error("Please provide a valid shipping address!");
    }

    const {
        recipientName,
        email,
        phone,
        street,
        city,
        state,
        pincode,
        country = "India"
    } = shippingAddress;

    const requiredFields = {
        recipientName,
        email,
        phone,
        street,
        city,
        state,
        pincode
    };

    for (const [field, value] of Object.entries(requiredFields)) {
        if (typeof value !== "string" || !value.trim()) {
            res.status(400);
            throw new Error(`${field} is required and must be valid text!`);
        }
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email.trim())) {
        res.status(400);
        throw new Error("Please provide a valid email address!");
    }

    if (typeof country !== "string" || !country.trim()) {
        res.status(400);
        throw new Error("Please provide a valid country!");
    }

    // 4. Start MongoDB session
    const session = await mongoose.startSession();

    let createdOrders = [];

    try {

        await session.withTransaction(async () => {

            // 5. Fetch cart inside transaction
            const cart = await Cart.findOne({ user: userId })
                .session(session)
                .populate("products.product")
                .populate("appliedCoupons.coupon");


            // 6. Validate cart
            if (!cart) {
                res.status(404);
                throw new Error("Cart not found!");
            }

            if (cart.products.length === 0) {
                res.status(400);
                throw new Error("Your cart is empty!");
            }


            // Check whether products still exist and are active
            const unavailableProducts = cart.products.filter(
                (item) => !item.product || item.product.isActive !== true
            );

            if (unavailableProducts.length > 0) {

                const productNames = unavailableProducts.map(
                    (item) => item.product?.productName ?? "Deleted product"
                );

                res.status(409);
                throw new Error(
                    `These products are unavailable: ${productNames.join(", ")}`
                );
            }

            const productVendorIds = new Set(
                cart.products.map(
                    (item) => item.product.vendor.toString()
                )
            );

            // 2. Validate every applied coupon

            for (const applied of cart.appliedCoupons) {

                const coupon = applied.coupon;
                const vendorId = applied.vendor.toString();

                // Check whether coupon still exists

                if (!coupon) {
                    res.status(409);
                    throw new Error("An applied coupon no longer exists!");
                }

                // Check whether this vendor has products in the cart

                if (!productVendorIds.has(vendorId)) {
                    res.status(409);
                    throw new Error(
                        `Invalid coupon selection for vendor ${vendorId}`
                    );
                }

                // Check coupon ownership

                if (coupon.vendor.toString() !== vendorId) {
                    res.status(409);
                    throw new Error(
                        "Coupon does not belong to the selected vendor!"
                    );
                }

                // Check whether coupon is active

                if (coupon.isActive !== true) {
                    res.status(409);
                    throw new Error(
                        `Coupon ${coupon.couponCode} is no longer active!`
                    );
                }

                // Check expiration

                if (coupon.expiresAt && coupon.expiresAt <= new Date()) {
                    res.status(409);
                    throw new Error(
                        `Coupon ${coupon.couponCode} has expired!`
                    );
                }
            }


            // Reserve stock for every product
            // Important implementation detail
            // We are using for...of rather than Promise.all() because database operations inside a transaction should be performed sequentially rather than executed in parallel.

            for (const item of cart.products) {
                const updatedProduct = await Product.findOneAndUpdate(
                    {
                        _id: item.product._id,
                        isActive: true,
                        stock: { $gte: item.quantity }
                    },
                    {
                        $inc: { stock: -item.quantity }
                    },
                    {
                        session
                    }
                )

                if (!updatedProduct) {
                    res.status(409);
                    throw new Error(
                        `Insufficient stock or product unavailable: ${item.product.productName}`
                    );
                }


            }

            // Create order item snapshots from cart products

            const orderItems = cart.products.map(({ product, quantity }) => {

                const subTotal = product.price * quantity;

                return {
                    product: product._id,
                    vendor: product.vendor,
                    productName: product.productName,
                    unit: product.unit,
                    quantity: quantity,
                    unitPrice: product.price,
                    subTotal: subTotal
                };

            });

            const itemsByVendor = orderItems.reduce((acc, item) => {

                const vendorId = item.vendor.toString();

                if (!acc[vendorId]) {
                    acc[vendorId] = [];
                }

                acc[vendorId].push(item);

                return acc;

            }, {});

            const vendorOrders = Object.entries(itemsByVendor).map(
                ([vendorId, items]) => {

                    return {
                        vendor: vendorId,
                        items,
                        itemsTotal: items.reduce(
                            (acc, { subTotal }) => acc + subTotal,
                            0
                        )
                    };

                }
            );

            const discountedVendorOrders = vendorOrders.map((order) => {

                // Find the coupon selected for this vendor
                const selectedCoupon = cart.appliedCoupons.find(
                    (applied) => applied.vendor.toString() === order.vendor
                );


                // If no coupon was applied by this vendor
                if (!selectedCoupon) {
                    return {
                        ...order,
                        discountTotal: 0,
                        appliedCoupon: null
                    };
                }


                // Get the populated coupon document
                const coupon = selectedCoupon.coupon;

                let discountAmount = 0;


                // Calculate percentage discount
                if (coupon.discountType === "percentage") {

                    discountAmount =
                        (order.itemsTotal * coupon.couponDiscount) / 100;

                }

                // Calculate fixed discount
                else if (coupon.discountType === "fixed") {

                    discountAmount = Math.min(
                        coupon.couponDiscount,
                        order.itemsTotal
                    );

                }

                else {
                    res.status(409);
                    throw new Error("Invalid coupon discount type!");
                }

                // Round discount to two decimal places
                discountAmount = Math.round(
                    (discountAmount + Number.EPSILON) * 100
                ) / 100;


                return {
                    ...order,

                    discountTotal: discountAmount,

                    appliedCoupon: {
                        coupon: coupon._id,
                        couponCode: coupon.couponCode,
                        discountType: coupon.discountType,
                        discountAmount,
                        eligibleSubtotal: order.itemsTotal
                    }
                };

            });


            const vendorOrderWithDeliveryAndTax = discountedVendorOrders.map(
                (order) => ({
                    ...order,

                    // Temporary fixed delivery charge
                    deliveryCharge: 100,

                    // Calculate tax after discount
                    taxTotal: calculateTaxTotal(
                        order.itemsTotal - order.discountTotal
                    )
                })
            );


            const vendorOrdersWithTotals = vendorOrderWithDeliveryAndTax.map(
                (order) => {

                    const totalAmount =
                        order.itemsTotal -
                        order.discountTotal +
                        order.deliveryCharge +
                        order.taxTotal;

                    return {
                        ...order,
                        totalAmount: Math.round(
                            (totalAmount + Number.EPSILON) * 100
                        ) / 100
                    };
                }
            );

            // console.log(vendorOrdersWithTotals)

            const checkoutId = new mongoose.Types.ObjectId();

            const reservationExpiresAt =
                paymentMethod === "online"
                    ? new Date(Date.now() + 15 * 60 * 1000)
                    : null;

            const addressSnapshot = {
                recipientName: recipientName.trim(),
                email: email.trim().toLowerCase(),
                phone: phone.trim(),
                street: street.trim(),
                city: city.trim(),
                state: state.trim(),
                pincode: pincode.trim(),
                country: country.trim()
            };

            const orderDocuments = vendorOrdersWithTotals.map((order) => {

                return {
                    orderNumber: `ON-${randomUUID()}`,

                    checkoutId,

                    user: userId,
                    vendor: order.vendor,

                    items: order.items,

                    shippingAddress: addressSnapshot,

                    itemsTotal: order.itemsTotal,
                    discountTotal: order.discountTotal,
                    appliedCoupon: order.appliedCoupon,

                    deliveryCharge: order.deliveryCharge,
                    taxTotal: order.taxTotal,
                    totalAmount: order.totalAmount,

                    paymentMethod,
                    paymentStatus: "pending",
                    orderStatus: "pending",
                    inventoryStatus: "reserved",
                    reservationExpiresAt,

                };

            });

            // console.log(orderDocuments)

            // Save all vendor orders inside the transaction

            createdOrders = await Order.insertMany(orderDocuments, {
                session,
                ordered: true
            });

            cart.products = [];
            cart.appliedCoupons = [];

            await cart.save({ session });

            // Remaining checkout logic will go here.

        });

        res.status(201).json({
            success: true,
            message: "Orders created successfully!",
            checkoutId: createdOrders[0].checkoutId,
            orders: createdOrders
        });
        // Success response will be added later.

    } finally {
        await session.endSession();
    }
}




const orderController = { createOrder }

export default orderController