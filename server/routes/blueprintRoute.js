    import express from 'express'
    import protect from "../middlewares/authMiddleware.js"
    import blueprintController from '../controllers/blueprintController.js'

    const router = express.Router()

    router.post("/create" , protect.forUser , blueprintController.createBlueprint)

    export default router 