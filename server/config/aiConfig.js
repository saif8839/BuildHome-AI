import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

let aiClient = null;


// Initialize and reuse the Gemini client.
const getAIClient = () => {

    const apiKey = process.env.GEMINI_API_KEY?.trim();

    if (!apiKey) {

        throw new Error(
            "GEMINI_API_KEY is missing from environment variables."
        );
    }

    if (!aiClient) {

        aiClient = new GoogleGenAI({
            apiKey
        });
    }

    return aiClient;
};


// Return the configured Gemini model.
const getAIModel = () => {

    const model = process.env.GEMINI_MODEL?.trim();

    if (!model) {

        throw new Error(
            "GEMINI_MODEL is missing from environment variables."
        );
    }

    return model;
};


export {
    getAIClient,
    getAIModel
};