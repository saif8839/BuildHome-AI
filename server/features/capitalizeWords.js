const capitalizeWords = (word) =>
{
    const newWord = word.trim().split(" ").map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(" ")

    return newWord
}


export default capitalizeWords