import express from "express"
import userController from "../controllers/authController.js"
import protect from "../middlewares/authMiddleware.js"

const router = express.Router()



router.post("/register" , userController.registerUser)

router.post("/login" , userController.loginUser)

router.post("/private" , protect.forUser , userController.privateController)

export default router


