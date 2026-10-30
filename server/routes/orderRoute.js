import express from "express"
import orderController from "../controllers/orderController.js"
import protect from "../middlewares/authMiddleware.js"

const router = express.Router()


router.post("/create" , protect.forUser ,orderController.createOrder)


export default router