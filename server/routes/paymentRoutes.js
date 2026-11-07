import express from "express"
import protect from "../middlewares/authMiddleware.js"
import paymentController from "../controllers/paymentController.js"

const router = express.Router()

router.post("/create", protect.forUser , paymentController.createPayment)
router.post("/mock/complete", protect.forUser , paymentController.completeMockPayment)

export default router   