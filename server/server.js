import express from "express"
import dotenv from "dotenv"
import colors from"colors"
import connectDB from "./config/dbConfig.js"

dotenv.config()

//loacal imports
import authRoutes from "./routes/authRoutes.js"
import errorHandler from "./middlewares/errorHandler.js"


const PORT = process.env.PORT || 5000
const app = express()


//Database connectivity
connectDB()


//Body Parser
app.use(express.json())
app.use(express.urlencoded())

app.use("/api/auth" , authRoutes)


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