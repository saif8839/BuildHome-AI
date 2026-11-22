import express from "express"
import ratingController from "../controllers/ratingController.js"
import protect from "../middlewares/authMiddleware.js"


const router = express.Router()

router.post("/:pid" ,protect.forUser, ratingController.createReview)

router.get("/:pid" ,protect.forUser, ratingController.getProductReviews)

router.patch("/:pid" ,protect.forUser, ratingController.updateReview)

router.delete("/:pid" ,protect.forUser, ratingController.deleteReview)




export default router
