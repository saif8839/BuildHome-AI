import express from "express"
import productController from "../controllers/productController.js"
import protect from "../middlewares/authMiddleware.js"


const router = express.Router()


router.get("/" , protect.forUser , productController.getProducts)

router.get("/:pid" , protect.forUser , productController.getSingleProduct)


export default router 