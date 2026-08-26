import express from "express"
import protect from "../middlewares/authMiddleware.js"
import vendorController from "../controllers/vendorController.js"
import upload from "../middlewares/imageUploadMiddleware.js"

const router = express.Router()


router.post("/request" , protect.forUser  , vendorController.becomeVendor)


router.post("/product" , protect.forUser , upload.array('image' , 5)  , vendorController.addProduct)

router.get("/product" , protect.forUser , vendorController.getMyProducts)

router.put("/product/:pid" , protect.forUser , upload.array('image' , 5)  , vendorController.updateMyProduct)

router.get("/profiles" , vendorController.getAllVendors)

router.get("/profiles/:vid" ,  vendorController.getSingleVendor)



export default router