import adminController from "../controllers/adminController.js"
import express from "express"
import protect from "../middlewares/authMiddleware.js"
import refundController from "../controllers/refundController.js";

const router =  express.Router()


router.get("/users" , protect.forAdmin , adminController.getAllUsers )

router.get("/vendors" , protect.forAdmin , adminController.getAllVendors)

router.get("/products" , protect.forAdmin , adminController.getAllProducts)

router.get("/orders" , protect.forAdmin , adminController.getAllOrders)

router.get("/ratings" , protect.forAdmin , adminController.getAllRatings)

router.put("/users/:uid" , protect.forAdmin , adminController.updateUser)

router.put("/vendors/:vid" , protect.forAdmin , adminController.updateVendor)

router.post("/category/add" , protect.forAdmin , adminController.addProductCategory)

router.get("/category" , protect.forAdmin , adminController.getProductCategory)

router.put("/category/:did" , protect.forAdmin , adminController.removeProductCategory)

router.post("/orders/:oid/refund" , protect.forAdmin , refundController.processRefund)

router.get("/refunds/pending" , protect.forAdmin , refundController.getPendingRefunds)

router.get("/refunds/history" , protect.forAdmin , refundController.getRefundHistory)


export default router
