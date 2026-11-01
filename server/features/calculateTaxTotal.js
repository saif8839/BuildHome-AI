const calculateTaxTotal = (amount) =>
{
       const tax = (amount * 18) / 100;         

    return Math.round(
        (tax + Number.EPSILON) * 100
    ) / 100;
}


export default calculateTaxTotal