import express, { Router } from "express"
import testController from "../controllers/testContoller.js"

const router = express.Router()


router.get("/orders" , testController.getAllCreatedOrders)


export default router




