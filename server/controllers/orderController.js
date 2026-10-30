import Cart from "../models/cartModel.js"


const createOrder = async (req, res) => {
    const userId = req.user._id

    const { shippingAddress } = req.body

    // console.log(shippingAddress)

    if (!shippingAddress || typeof shippingAddress !== "object" || Array.isArray(shippingAddress)
    ) {
        res.status(400);
        throw new Error("Please provide a valid shipping address!");
    }

    // 2. Extract and validate address fields
    const { recipientName, email, phone, street, city, state, pincode, country = "India" } = shippingAddress;

    const requiredFields = { recipientName, email, phone, street, city, state, pincode };

    // 3. Check that required fields are non-empty strings
    for (const [field, value] of Object.entries(requiredFields)) {
        if (typeof value !== "string" || !value.trim()) {
            res.status(400);
            throw new Error(`${field} is required and must be valid text!`);
        }
    }

    // 4. Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
        res.status(400);
        throw new Error("Please provide a valid email address!");
    }
    // 5. Validate optional country
    if (typeof country !== "string" || !country.trim()) {
        res.status(400);
        throw new Error("Please provide a valid country!");
    }

    const cart = await Cart.findOne({ user: userId })

    if (!cart) {
        res.status(404)
        throw new Error("Cart Not Found!!!")
    }

    if (cart.products.length === 0) {
        res.status(400)
        throw new Error("No Products Found in Cart , add products to Create Order!!!")
    }

    await cart.populate("products.product")

    const inactiveProducts = cart.products.filter(
        (item) =>
            !item.product || item.product.isActive !== true
    );
    // console.log(inactiveProducts, inactiveProducts.length)

    if (inactiveProducts.length >= 1) {
        const inactiveProductsName = inactiveProducts.map(
            (item) => item.product?.productName ?? "Deleted product"
        );
        // console.log(inactiveProductsName)
        res.status(409)
        throw new Error(`These Products have been disabled by Vendor , please remove from the cart => ${inactiveProductsName.join(", ")}`)
    }

      const insufficientStockProducts = cart.products.filter(
        (item) => item.product.stock < item.quantity
    );

    if (insufficientStockProducts.length > 0) {
        const productNames = insufficientStockProducts.map((item) => item.product.productName)
        res.status(409);
        throw new Error(
            `Insufficient stock for: ${productNames.join(", ")}`
        );
    }

const orderItems = cart.products.map(({product, quantity}) => {
    const {_id , productName , price , vendor ,unit} = product
    const subTotal = price * quantity
    // console.log(_id , productName , price , vendor ,unit , subTotal)
        return{
        product : _id,
        vendor : vendor,
        productName : productName,
        unit : unit,
        quantity : quantity,
        unitPrice : price,
        subTotal : subTotal
    }
}) 

const itemsByVendor = orderItems.reduce((acc, item) => {
    const vendorId = item.vendor.toString();
    if (!acc[vendorId]) {
        acc[vendorId] = [];
    }
    acc[vendorId].push(item);
    return acc;
}, {});
// console.log(sortByVendorProducts)

// console.log(orderItems)

const vendorOrders = Object.entries(itemsByVendor).map(([vendorId , items]) =>{
    return {
        vendor : vendorId,
        items,
        itemsTotal : items.reduce((acc , {subTotal} ) => acc+=subTotal ,0)
    }
} )

// console.log(vendorOrders)

    res.status(200).json({
        message: "Order Confirmed!!",
        cart
    })


}



const orderController = { createOrder }

export default orderController