import express from "express"
import dotenv from "dotenv"
import colors from"colors"
import connectDB from "./config/dbConfig.js"

dotenv.config()

//loacal imports
import authRoutes from "./routes/authRoutes.js"
import errorHandler from "./middlewares/errorHandler.js"
import adminRoutes from "./routes/adminRoutes.js"
import vendorRoutes from "./routes/vendorRoutes.js"
import productRoutes from "./routes/productRoutes.js"
import couponRoutes from "./routes/couponRoutes.js"
import cartRoutes from "./routes/cartRoutes.js"
import orderRoutes from "./routes/orderRoute.js"
import paymentRoutes from "./routes/paymentRoutes.js"
import testRoutes from "./routes/testRoutes.js"

import startInventoryReservationWorker from "./jobs/inventoryReservationScheduler.js";

const PORT = process.env.PORT || 5000
const app = express()

//Database connectivity
await connectDB()

//Body Parser
app.use(express.json())
app.use(express.urlencoded({extended : true}))

//auth Routes
app.use("/api/auth" , authRoutes)

//Admin Routes
app.use("/api/admin" , adminRoutes)

//Vendor Routes
app.use("/api/vendor" , vendorRoutes)

//Product Routes
app.use("/api/products" , productRoutes)

//Coupon Routes
app.use("/api/coupons" , couponRoutes)

//Cart Route
app.use("/api/cart" , cartRoutes)

//Order Route
app.use("/api/order" , orderRoutes)

//Payment Route
app.use("/api/payment" , paymentRoutes) 

//test Route
app.use("/api/test" , testRoutes)

// Inventory Cleaner
startInventoryReservationWorker()


app.get("/" , (req,res) =>
{
    res.status(200).json({
        message : "Welcome to BuildMart API...."
    })
})



app.use(errorHandler)

const listenServer = () =>
{
    console.log(`SERVER IS RUNNING AT ${PORT}`.blue)
}

app.listen( PORT , listenServer())