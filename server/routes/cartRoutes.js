import express from "express"
import protect from "../middlewares/authMiddleware.js"
import cartController from "../controllers/cartController.js"

const router = express.Router()

router.get("/" , protect.forUser , cartController.getCart)
router.post("/add" ,protect.forUser , cartController.addToCart)
router.put("/update" ,protect.forUser , cartController.updateCart)
router.delete("/clear" , protect.forUser , cartController.clearCart) 
router.delete("/remove" , protect.forUser , cartController.removeFromCart)

export default router