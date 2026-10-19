import Product from "../models/productModel.js"

const getProducts = async (req , res) =>
{

     const products = await Product.find({
        isActive: true
    })
        .populate("vendor", "businessName address phone email")
        .populate("category", "name")
        .sort({ createdAt: -1 });

    // const products = await Product.find({
    //     isActive : { $eq : true}
    // }).populate("vendor" , "businessName address phone email")
 

    if(!products || products.length === 0)
    {
        res.status(404)
        throw new Error("No Such Active Products Found!!!")
    }

    res.status(201).json({
        count : products.length,
        products
    })

}

const getSingleProduct = async (req, res) =>
{
    const productId = req.params.pid

    const product = await Product.findById(productId).populate("category" , "name")

    if(!product || !product.isActive)
    {
        res.status(409)
        throw new Error("No Such Products Exist or Wrong Id or the Product is inactive!!")
    }


    res.status(201).json(product)

}



const productController = {getProducts , getSingleProduct}


export default productController