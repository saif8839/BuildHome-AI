import Cart from "../models/cartModel.js"
import calculateTaxTotal from "../features/calculateTaxTotal.js"
import Order from "../models/orderModel.js"
import mongoose from "mongoose"
import {randomUUID} from "node:crypto"


const createOrder = async (req, res) => {
    const userId = req.user._id

    const { shippingAddress, paymentMethod } = req.body

    if (!["online", "cod"].includes(paymentMethod)) {
        res.status(400);
        throw new Error("Please select a valid payment method!");
    }

    // console.log(shippingAddress)

    if (!shippingAddress || typeof shippingAddress !== "object" || Array.isArray(shippingAddress)
    ) {
        res.status(400);
        throw new Error("Please provide a valid shipping address!");
    }

    // 2. Extract and validate address fields
    const { recipientName, email, phone, street, city, state, pincode, country = "India" } = shippingAddress;

    const requiredFields = { recipientName, email, phone, street, city, state, pincode };

    // 3. Check that required fields are non-empty strings
    for (const [field, value] of Object.entries(requiredFields)) {
        if (typeof value !== "string" || !value.trim()) {
            res.status(400);
            throw new Error(`${field} is required and must be valid text!`);
        }
    }

    // 4. Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
        res.status(400);
        throw new Error("Please provide a valid email address!");
    }
    // 5. Validate optional country
    if (typeof country !== "string" || !country.trim()) {
        res.status(400);
        throw new Error("Please provide a valid country!");
    }

    const cart = await Cart.findOne({ user: userId })

    if (!cart) {
        res.status(404)
        throw new Error("Cart Not Found!!!")
    }

    if (cart.products.length === 0) {
        res.status(400)
        throw new Error("No Products Found in Cart , add products to Create Order!!!")
    }

    await cart.populate("products.product")
    await cart.populate("appliedCoupons.coupon")

    // Cart Validation
    const inactiveProducts = cart.products.filter(
        (item) =>
            !item.product || item.product.isActive !== true
    );
    // console.log(inactiveProducts, inactiveProducts.length)

    if (inactiveProducts.length >= 1) {
        const inactiveProductsName = inactiveProducts.map(
            (item) => item.product?.productName ?? "Deleted product"
        );
        // console.log(inactiveProductsName)
        res.status(409)
        throw new Error(`These Products have been disabled by Vendor , please remove from the cart => ${inactiveProductsName.join(", ")}`)
    }

    const insufficientStockProducts = cart.products.filter(
        (item) => item.product.stock < item.quantity
    );

    if (insufficientStockProducts.length > 0) {
        const productNames = insufficientStockProducts.map((item) => item.product.productName)
        res.status(409);
        throw new Error(
            `Insufficient stock for: ${productNames.join(", ")}`
        );
    }

    // Coupon Validation
    const productVendorIds = cart.products.map(
        item => item.product.vendor.toString()
    );

    for (const applied of cart.appliedCoupons) {
        const coupon = applied.coupon
        const vendorId = applied.vendor.toString()

        if (!coupon) {
            res.status(409);
            throw new Error("An applied coupon no longer exists!");
        }

        // Check whether vendor has products in cart
        if (!productVendorIds.includes(vendorId)) {
            res.status(409);
            throw new Error(
                `Invalid coupon selection for vendor ${vendorId}`
            );
        }

        //check Coupon Ownership
        if (coupon.vendor.toString() !== vendorId) {
            res.status(409);
            throw new Error("Coupon does not belong to the selected vendor!");
        }

        if (!coupon.isActive) {
            res.status(409)
            throw new Error(`Coupon ${coupon.couponCode} is no longer active!`);
        }

        // Check expiration
        if (coupon.expiresAt && coupon.expiresAt <= new Date()) {
            res.status(409);
            throw new Error(
                `Coupon ${coupon.couponCode} has expired!`
            );
        }
    }

    const orderItems = cart.products.map(({ product, quantity }) => {
        const { _id, productName, price, vendor, unit } = product
        const subTotal = price * quantity
        // console.log(_id , productName , price , vendor ,unit , subTotal)
        return {
            product: _id,
            vendor: vendor,
            productName: productName,
            unit: unit,
            quantity: quantity,
            unitPrice: price,
            subTotal: subTotal
        }
    })

    // const orderItems
    const itemsByVendor = orderItems.reduce((acc, item) => {
        const vendorId = item.vendor.toString();
        if (!acc[vendorId]) {
            acc[vendorId] = [];
        }
        acc[vendorId].push(item);
        return acc;
    }, {});
    // console.log(sortByVendorProducts)

    // console.log(orderItems)

    const vendorOrders = Object.entries(itemsByVendor).map(([vendorId, items]) => {
        return {
            vendor: vendorId,
            items,
            itemsTotal: items.reduce((acc, { subTotal }) => acc += subTotal, 0),
        }
    })

    // const discountedVendorOrders = [];

    // const appliedCouponVendorIds = cart.appliedCoupons.map(appliedCoupon => appliedCoupon.vendor.toString())

    // // console.log(appliedCouponVendorIds)

    // for(const order of vendorOrders)
    // {
    //     if(!appliedCouponVendorIds.includes(order.vendor))
    //     {
    //         order.appliedCoupon = null
    //         discountedVendorOrders.push(order)
    //         continue
    //     }        

    //     const discountedOrder = cart.appliedCoupons.map((appliedCoupon)=>
    //     {
    //         if(appliedCoupon.vendor.toString() === order.vendor.toString())
    //         {
    //             return {
    //                 ...order,
    //                 appliedCoupon : appliedCoupon.coupon,
    //             }
    //         }
    //     }
    //     )
    //     const newOrder = discountedOrder[0]
    //     discountedVendorOrders.push(newOrder)
    // }

    // console.log(discountedVendorOrders)

    const discountedVendorOrders = vendorOrders.map((order) => {

        // Find the coupon belonging to this vendor
        const selectedCoupon = cart.appliedCoupons.find(
            (applied) =>
                applied.vendor.toString() === order.vendor
        );

        // If this vendor has no applied coupon
        if (!selectedCoupon) {
            return {
                ...order,
                discountTotal: 0,
                appliedCoupon: null
            };
        }

        // Get the populated Coupon document
        const aCoupon = selectedCoupon.coupon;

        if (!aCoupon) {
            throw new Error("Applied coupon no longer exists!");
        }

        let discountAmount = 0;

        // 4 calculate precentage Discount

        if (aCoupon.discountType === "percentage") {

            // 4. Calculate percentage discount
            discountAmount = (order.itemsTotal * aCoupon.couponDiscount) / 100;
        }
        else if (aCoupon.discountType === "fixed") {

            // 5. Calculate fixed discount
            discountAmount = Math.min(
                aCoupon.couponDiscount,
                order.itemsTotal
            );
        }
        else {
            // 6. Handle unexpected discount types
            throw new Error("Invalid coupon discount type!");
        }

        discountAmount = Math.round((discountAmount + Number.EPSILON) * 100) / 100;

        return {
            ...order,
            discountTotal: discountAmount,
            appliedCoupon: {
                coupon: aCoupon._id,
                couponCode: aCoupon.couponCode,
                discountType: aCoupon.discountType,
                discountAmount,
                eligibleSubtotal: order.itemsTotal
            }
        }
    });

    const vendorOrderWithDeliveryAndTax = discountedVendorOrders.map(order => ({
        ...order,
        deliveryCharge: 100,
        taxTotal: calculateTaxTotal(order.itemsTotal - order.discountTotal)
    }))

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
    // console.log(vendorOrdersWithTotals);

    const checkoutId = new mongoose.Types.ObjectId();

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

    const orderDocuments = vendorOrdersWithTotals.map(order => ({
        
        orderNumber : `ON-${randomUUID()}`,
        checkoutId,
        user : userId,
        vendor : order.vendor,
        items : order.items,
        shippingAddress : addressSnapshot,
        itemsTotal : order.itemsTotal,
        discountTotal : order.discountTotal,
        appliedCoupon : order.appliedCoupon,
        deliveryCharge : order.deliveryCharge,
        taxTotal : order.taxTotal,
        totalAmount : order.totalAmount,
        paymentMethod,
        paymentStatus : "pending",
        orderStatus : "pending"
    })
    )

    console.log(orderDocument)

    res.status(200).json({
        message: "Order Confirmed!!",
        cart
    })
}



const orderController = { createOrder }

export default orderController