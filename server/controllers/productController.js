import Product from "../models/productModel.js"

const getProducts = async (req , res) =>
{

    const products = await Product.find({
        isActive : { $eq : true}
    })

    if(!products || products.length === 0)
    {
        res.status(404)
        throw new Error("No Such Active Products Found!!!")
    }

    res.status(201).json(products)

}

const getSingleProduct = async (req, res) =>
{
    const productId = req.params.pid

    const product = await Product.findById(productId)

    if(!product || !product.isActive)
    {
        res.status(409)
        throw new Error("No Such Products Exist or Wrong Id!!")
    }


    res.status(201).json(product)

}



const productController = {getProducts , getSingleProduct}


export default productController