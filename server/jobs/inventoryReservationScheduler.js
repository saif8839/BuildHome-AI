
import cron from "node-cron";
import processExpiredReservations from "./inventoryReservationWorker.js";

let isRunning = false;

// Executes the worker safely
const runInventoryWorker = async () => {

    // Prevent overlapping executions
    if (isRunning) {
        console.log("Inventory worker is already running. Skipping.");
        return;
    }

    isRunning = true;

    try {
        console.log("Checking expired inventory reservations...");

        await processExpiredReservations();

    } catch (error) {
        console.error("Inventory worker error:", error.message);

    } finally {
        isRunning = false;
    }
};

const startInventoryReservationWorker = () => {

    // Run once immediately when the server starts
    void runInventoryWorker();

    // Schedule subsequent executions every minute
    cron.schedule(
        "0 * * * *",
        runInventoryWorker,
        {
            name: "inventory-reservation-worker",
            noOverlap: true
        }
    );

    console.log("Inventory reservation worker scheduled!");
};

export default startInventoryReservationWorker;
