import Order from "../models/orderModel.js";
import releaseExpiredCheckout from "../services/inventoryService.js";

const processExpiredReservations = async () => {

    try {
        const now = new Date();

        const expiredCheckoutIds = await Order.distinct(
            "checkoutId",
            {
                paymentMethod: "online",
                paymentStatus: "pending",
                orderStatus: "pending",
                inventoryStatus: "reserved",
                reservationExpiresAt: {
                    $lte: now
                }
            }
        );

        console.log(
            `Found ${expiredCheckoutIds.length} expired checkouts`
        );

        for (const checkoutId of expiredCheckoutIds) {

            try {
                const released = await releaseExpiredCheckout(checkoutId);

                if (released) {
                    console.log(
                        `Inventory released for checkout: ${checkoutId}`
                    );
                }

            } catch (error) {
                console.error(
                    `Failed to release checkout ${checkoutId}:`,
                    error.message
                );
            }
        }

    } catch (error) {
        console.error(
            "Failed to process expired reservations:",
            error.message
        );
    }
};

export default processExpiredReservations;