import mongoose from "mongoose";
import { randomUUID } from "node:crypto";
import Order from "../models/orderModel.js";
import Payment from "../models/paymentModel.js";


const processOrderRefund = async (orderId) => {

    // 1. Validate Order ID
    if (!mongoose.isValidObjectId(orderId)) {
        throw new Error("Invalid Order ID!");
    }

    const session = await mongoose.startSession();

    // Generate mock refund reference outside transaction callback
    const refundId = `MOCK-REFUND-${randomUUID()}`;

    const refundedAt = new Date();

    try {

        const result = await session.withTransaction(async () => {

            // 2. Find eligible cancelled Order
            const order = await Order.findOne({
                _id: orderId,
                orderStatus: "cancelled",
                paymentMethod: "online",
                paymentStatus: "paid",
                refundStatus: "pending"
            }).session(session);

            if (!order) {
                throw new Error(
                    "Order not found or not eligible for refund!"
                );
            }

            // 3. Find the original captured Payment
            const payments = await Payment.find({
                checkoutId: order.checkoutId,
                user: order.user,
                status: {
                    $in: ["captured", "partially_refunded"]
                }
            }).session(session);

            if (payments.length !== 1) {
                throw new Error(
                    "Could not identify a unique captured Payment!"
                );
            }

            const payment = payments[0];

            // 4. Only mock refunds are supported currently
            if (payment.provider !== "mock") {
                throw new Error(
                    "Real payment provider refunds are not integrated yet!"
                );
            }

            if (!payment.providerPaymentId) {
                throw new Error("Original payment reference not found!");
            }

            // 5. Calculate refund amount in paise
            const refundAmountPaise = Math.round(
                (order.totalAmount + Number.EPSILON) * 100
            );

            if (
                !Number.isSafeInteger(refundAmountPaise) ||
                refundAmountPaise <= 0
            ) {
                throw new Error("Invalid refund amount!");
            }

            // 6. Calculate cumulative refunded amount
            const currentRefundedAmount =
                payment.refundedAmountPaise ?? 0;

            const newRefundedAmount =
                currentRefundedAmount + refundAmountPaise;

            if (
                !Number.isSafeInteger(newRefundedAmount) ||
                newRefundedAmount > payment.amountPaise
            ) {
                throw new Error(
                    "Refund amount exceeds the original payment amount!"
                );
            }

            // 7. Determine Payment status
            const newPaymentStatus =
                newRefundedAmount === payment.amountPaise
                    ? "refunded"
                    : "partially_refunded";

            // 8. Update Payment document
            const paymentUpdateResult = await Payment.updateOne(
                {
                    _id: payment._id,
                    status: payment.status,
                    refundedAmountPaise: currentRefundedAmount
                },
                {
                    $inc: {
                        refundedAmountPaise: refundAmountPaise
                    },
                    $set: {
                        status: newPaymentStatus
                    }
                },
                { session }
            );

            if (paymentUpdateResult.modifiedCount !== 1) {
                throw new Error("Payment refund update failed!");
            }

            // 9. Update Order document
            const orderUpdateResult = await Order.updateOne(
                {
                    _id: order._id,
                    orderStatus: "cancelled",
                    paymentStatus: "paid",
                    refundStatus: "pending"
                },
                {
                    $set: {
                        paymentStatus: "refunded",
                        refundStatus: "processed",
                        refundedAmount: order.totalAmount,
                        refundId,
                        refundedAt
                    }
                },
                { session }
            );

            if (orderUpdateResult.modifiedCount !== 1) {
                throw new Error("Order refund update failed!");
            }

            // 10. Fetch updated documents
            const updatedOrder = await Order.findById(order._id)
                .session(session);

            const updatedPayment = await Payment.findById(payment._id)
                .session(session);

            return {
                order: updatedOrder,
                payment: updatedPayment
            };

        });

        return result;

    } finally {
        await session.endSession();
    }
};


export default processOrderRefund;