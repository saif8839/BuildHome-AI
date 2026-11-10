import express, { Router } from "express"
import testController from "../controllers/testContoller.js"
import inventoryController from "../controllers/inventoryController.js";
import protect from "../middlewares/authMiddleware.js"
const router = express.Router();


router.post(
    "/debug/release-expired",
    protect.forUser,
    inventoryController.testReleaseExpiredCheckout
);



router.get("/orders" , testController.getAllCreatedOrders)


export default router




