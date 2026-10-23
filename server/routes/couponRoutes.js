import express from "express"
import protect from "../middlewares/authMiddleware.js"
import couponController from "../controllers/couponControllers.js"


const router = express.Router()


router.get("/" , protect.forUser , couponController.getCoupons)


export default router