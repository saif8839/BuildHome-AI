import mongoose from "mongoose"
import Order from "../models/orderModel.js"
import Payment from "../models/paymentModel.js"
import { randomUUID } from "node:crypto";

const createPayment = async (req, res) => {

    if (process.env.NODE_ENV === "production") {
        res.status(404);
        throw new Error("Mock payments are disabled in production.");
    }

    const userId = req.user._id
    const { checkoutId } = req.body;

    if (!mongoose.isValidObjectId(checkoutId)) {
        res.status(400)
        throw new Error("Please provide a valid checkout ID!");
    }

    const orders = await Order.find({
        user: userId,
        checkoutId
    })

    if (orders.length === 0) {
        res.status(404);
        throw new Error("No orders found for this checkout!");
    }

    const isOnlineCheckout = orders.every((order) => order.paymentMethod === "online")

    if (!isOnlineCheckout) {
        res.status(400)
        throw new Error("This checkout is not eligible for online payment!");
    }

    // Check payment Status
    const hasPendingPayment = orders.every((order) => order.paymentStatus === "pending")

    if (!hasPendingPayment) {
        res.status(409);
        throw new Error("One or more orders are not awaiting payment!");
    }

    // Check order status
    const hasPendingOrders = orders.every(
        (order) => order.orderStatus === "pending"
    );

    if (!hasPendingOrders) {
        res.status(409);
        throw new Error("One or more orders are no longer pending!");
    }

    const now = new Date();

    // Check inventory reservation
    const hasValidReservations = orders.every(
        (order) =>
            order.inventoryStatus === "reserved" &&
            order.reservationExpiresAt &&
            order.reservationExpiresAt > now
    );

    if (!hasValidReservations) {
        res.status(409);
        throw new Error("Inventory reservation has expired or is invalid!");
    }

    // Calculate total payment amount in paise

    const amountPaise = orders.reduce(
        (total, order) => {

            const orderAmountPaise = Math.round(
                order.totalAmount * 100
            );

            return total + orderAmountPaise;

        },
        0
    );

    if (
        !Number.isSafeInteger(amountPaise) ||
        amountPaise <= 0
    ) {
        res.status(400);
        throw new Error("Invalid payment amount!");
    }

    const existingPayment = await Payment.findOne({
        checkoutId,
        user: userId,
        provider: "mock",
        status: "created"
    });

    if (existingPayment) {
        return res.status(200).json({
            success: true,
            message: "Payment already initiated!",
            payment: {
                paymentId: existingPayment._id,
                checkoutId: existingPayment.checkoutId,
                provider: existingPayment.provider,
                providerOrderId: existingPayment.providerOrderId,
                amountPaise: existingPayment.amountPaise,
                currency: existingPayment.currency,
                status: existingPayment.status
            }
        });
    }

    const providerOrderId = `MOCK-${randomUUID()}`

    const paymentDoc = {
        checkoutId, user: userId, provider: "mock", providerOrderId, amountPaise, currency: "INR", status: "created"
    }

    const payment = await Payment.create(paymentDoc)

    const paymentResponse = {
        paymentId: payment._id,
        checkoutId: payment.checkoutId,
        provider: payment.provider,
        providerOrderId: payment.providerOrderId,
        amountPaise: payment.amountPaise,
        currency: payment.currency,
        status: payment.status
    };

    res.status(201).json({
        success: true,
        message: "Payment initiated successfully!",
        payment: paymentResponse
    });
}




const completeMockPayment = async (req, res) => {

    if (process.env.NODE_ENV === "production") {
        res.status(404);
        throw new Error("Mock payments are disabled in production.");
    }

    const userId = req.user._id

    const { paymentId, result } = req.body

    if (!mongoose.isValidObjectId(paymentId)) {
        res.status(400)
        throw new Error("Invalid PaymentId")
    }

    if (!["success", "failure"].includes(result)) {
        res.status(400)
        throw new Error("Provide Valid Result")
    }

    const session = await mongoose.startSession()

    let payment;
    let orders = [];
    const now = new Date();

    const providerPaymentId = result === "success" ? `MOCK-PAY-${randomUUID()}` : null;
    const capturedAt = result === "success" ? now : null;

    try {
        await session.withTransaction(async () => {
            payment = await Payment.findOne({
                user: userId,
                _id: paymentId,
                provider: "mock"
            }).session(session)

            if (!payment) {
                res.status(404)
                throw new Error("Payment Not Found!")
            }

            if (payment.status !== "created") {
                res.status(409);
                throw new Error(
                    `Payment cannot be completed. Current status: ${payment.status}`
                );
            }

            orders = await Order.find({
                checkoutId: payment.checkoutId,
                user: userId
            }).session(session)

            if (orders.length === 0) {
                res.status(404)
                throw new Error("No orders found for this payment!");
            }

            for (const order of orders) {
                const paymentStatus = order.paymentStatus
                const inventoryStatus = order.inventoryStatus
                const reservationExpiresAt = order.reservationExpiresAt

                if (paymentStatus !== "pending") {
                    res.status(409)
                    throw new Error(`Can not complete Payment Current Payment Status : ${paymentStatus}`)
                }

                if (inventoryStatus !== "reserved") {
                    res.status(409)
                    throw new Error(`can not complete Paymrnt , inventory status : ${inventoryStatus}`)
                }

                if (!reservationExpiresAt || reservationExpiresAt <= now) {
                    res.status(409);
                    throw new Error("Payment reservation has expired!");
                }

                if (order.paymentMethod !== "online") {
                    res.status(409);
                    throw new Error("This order is not eligible for online payment!");
                }

                if (order.orderStatus !== "pending") {
                    res.status(409);
                    throw new Error(
                        `Order cannot be paid. Current status: ${order.orderStatus}`
                    );
                }
            }

            const totalAmountPaise = orders.reduce(
                (total, order) => {
                    return total + Math.round(order.totalAmount * 100);
                },
                0
            );

            if (!Number.isSafeInteger(totalAmountPaise) || totalAmountPaise !== payment.amountPaise) {
                res.status(409)
                throw new Error(`Payment amount does not match checkout amount! , confirmed Total Amount => ${payment.amountPaise} ,Invalid Total Amount => ${totalAmountPaise}`)
            }

            if (result === "success") {

                const updatedPayment = await Payment.updateOne({
                    _id: payment._id,
                    user: userId,
                    provider: "mock",
                    status: "created"
                }, {
                    $set: {
                        status: "captured",
                        providerPaymentId,
                        capturedAt
                    }
                }, { session })

                if (updatedPayment.modifiedCount !== 1) {
                    res.status(409);
                    throw new Error("Payment was already processed!");
                }

                const updatedOrder = await Order.updateMany(
                    {
                        checkoutId: payment.checkoutId,
                        user: userId,
                        paymentMethod: "online",
                        paymentStatus: "pending",
                        orderStatus: "pending",
                        inventoryStatus: "reserved",
                        reservationExpiresAt: { $gt: now }
                    }, {
                    $set: {
                        paymentStatus: "paid",
                        inventoryStatus: "committed"
                    }
                }, { session })

                if (updatedOrder.modifiedCount !== orders.length) {
                    res.status(409);
                    throw new Error("Could not update all vendor orders!");
                }

            }
            else {
                const paymentUpdateResult = await Payment.updateOne(
                    {
                        _id: payment._id,
                        user: userId,
                        provider: "mock",
                        status: "created"
                    },
                    {
                        $set: {
                            status: "failed"
                        }
                    },
                    { session }
                );

                if (paymentUpdateResult.modifiedCount !== 1) {
                    res.status(409);
                    throw new Error("Payment was already processed!");
                }
            }

            // Fetch updated Payment
            payment = await Payment.findOne({
                _id: payment._id,
                user: userId
            }).session(session);

            // Fetch updated Orders
            orders = await Order.find({
                checkoutId: payment.checkoutId,
                user: userId
            }).session(session);    

        })

        return res.status(200).json({
            success: true,
            message: result === "success"
                ? "Mock payment completed successfully!"
                : "Mock payment failed. You can retry if your reservation is still active.",

            payment: {
                paymentId: payment._id,
                checkoutId: payment.checkoutId,
                provider: payment.provider,
                providerPaymentId: payment.providerPaymentId,
                amountPaise: payment.amountPaise,
                currency: payment.currency,
                status: payment.status,
                capturedAt: payment.capturedAt
            },

            orders: orders.map(order => ({
                orderId: order._id,
                orderNumber: order.orderNumber,
                paymentStatus: order.paymentStatus,
                inventoryStatus: order.inventoryStatus,
                orderStatus: order.orderStatus
            }))
        });

    }
    finally {
        await session.endSession()
    }


}

const paymentController = { createPayment, completeMockPayment }

export default paymentController


