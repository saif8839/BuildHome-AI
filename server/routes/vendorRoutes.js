import express from "express"
import protect from "../middlewares/authMiddleware.js"
import vendorController from "../controllers/vendorController.js"

const router = express.Router()


router.post("/request" , protect.forUser  , vendorController.becomeVendor)


router.post("/product/add" , protect.forUser  , vendorController.addProduct)

export default router