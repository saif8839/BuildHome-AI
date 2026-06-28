import express from "express"
import protect from "../middlewares/authMiddleware.js"
import vendorController from "../controllers/vendorController.js"
import upload from "../middlewares/imageUploadMiddleware.js"

const router = express.Router()


router.post("/request" , protect.forUser  , vendorController.becomeVendor)


router.post("/product/add" , protect.forUser , upload.array('image' , 5)  , vendorController.addProduct)

export default router