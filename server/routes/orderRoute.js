import express from "express"
import orderController from "../controllers/orderController.js"
import protect from "../middlewares/authMiddleware.js"

const router = express.Router()


router.post("/create" , protect.forUser ,orderController.createOrder)

router.post("/cancel" , protect.forUser ,orderController.cancelCustomerOrders)





export default router