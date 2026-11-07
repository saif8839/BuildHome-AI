


const createPayment = async (req , res) =>
{

    res.status(200).send("payment Created")
}




const completeMockPayment = async (req , res) =>
{
    res.status(200).send("payment completed")
}

const paymentController = {createPayment , completeMockPayment}

export default paymentController


