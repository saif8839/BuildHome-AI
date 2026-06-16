import adminController from "../controllers/adminController.js"
import express from "express"
import protect from "../middlewares/authMiddleware.js"

const router =  express.Router()


router.get("/users" , protect.forAdmin , adminController.getAllUsers )

router.get("/vendors" , protect.forAdmin , adminController.getAllVendors)

router.get("/products" , protect.forAdmin , adminController.getAllProducts)

router.get("/orders" , protect.forAdmin , adminController.getAllOrders)

router.get("/ratings" , protect.forAdmin , adminController.getAllRatings)

router.put("/users/:uid" , protect.forAdmin , adminController.updateUser)

router.put("/vendors/:vid" , protect.forAdmin , adminController.updateVendor)

router.put("/products/:pid" , protect.forAdmin , adminController.updateProduct)


export default router
