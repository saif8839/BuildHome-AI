import express from "express"
import protect from "../middlewares/authMiddleware.js"
import vendorController from "../controllers/vendorController.js"

const router = express.Router()


router.post("/request" , protect.forUser  , vendorController.becomeVendor)



export default router