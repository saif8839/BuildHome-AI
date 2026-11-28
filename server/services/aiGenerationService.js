import Ajv from "ajv";

import {
    getAIClient,
    getAIModel
} from "../config/aiConfig.js";

import {
    generatedLayoutSchema,
    geminiLayoutSchema
} from "../schemas/generatedLayoutSchema.js";

import {
    buildBlueprintPrompt
} from "./blueprintPromptService.js";


// Initialize JSON Schema validator.
const ajv = new Ajv({
    allErrors: true,
    strict: true
});


// Compile schema once and reuse the validator.
const validateSchema = ajv.compile(
    generatedLayoutSchema
);


// Validate the structure of an AI-generated layout.
const validateGeneratedLayoutSchema = (layout) => {

    const isValid = validateSchema(layout);

    const errors = isValid

        ? []

        : (validateSchema.errors ?? []).map(error => {

            return `${error.instancePath || "/"}: ${error.message}`;
        });


    return {
        isValid,
        errors
    };
};


// Parse Gemini's JSON response.
const parseAIResponse = (responseText) => {

    if (
        typeof responseText !== "string" ||
        !responseText.trim()
    ) {

        throw new Error(
            "AI returned an empty response."
        );
    }


    try {

        return JSON.parse(responseText);

    } catch {

        throw new Error(
            "AI returned invalid JSON."
        );
    }
};


// Generate a conceptual blueprint layout.
const generateBlueprintLayout = async (blueprint) => {

    // Prepare blueprint instructions.
    const {
        systemPrompt,
        userPrompt
    } = buildBlueprintPrompt(blueprint);


    // Initialize Gemini.
    const ai = getAIClient();

    const model = getAIModel();


    // Generate structured layout.
    const response = await ai.models.generateContent({

        model,

        contents: userPrompt,

        config: {

            systemInstruction: systemPrompt,

            responseMimeType: "application/json",

            responseJsonSchema: geminiLayoutSchema
        }
    });


    // Verify that generation completed.
    const finishReason =
        response.candidates?.[0]?.finishReason;

    if (
        finishReason &&
        finishReason !== "STOP"
    ) {

        throw new Error(
            `AI generation ended with reason: ${finishReason}`
        );
    }


    // Convert JSON response into a JavaScript object.
    const generatedLayout = parseAIResponse(
        response.text
    );


    // Independently validate the generated structure.
    const schemaValidation =
        validateGeneratedLayoutSchema(generatedLayout);


    if (!schemaValidation.isValid) {

        throw new Error(
            `AI layout schema validation failed: ${schemaValidation.errors.join("; ")
            }`
        );
    }


    // Return layout and generation metadata.
    return {

        generatedLayout,

        schemaValidation,

        metadata: {

            provider: "gemini",

            model,

            finishReason: finishReason ?? null,

            usage: {

                inputTokens:
                    response.usageMetadata?.promptTokenCount ?? 0,

                outputTokens:
                    response.usageMetadata?.candidatesTokenCount ?? 0,

                thinkingTokens:
                    response.usageMetadata?.thoughtsTokenCount ?? 0,

                totalTokens:
                    response.usageMetadata?.totalTokenCount ?? 0
            },

            generatedAt: new Date().toISOString()
        }
    };
};


export {
    generateBlueprintLayout,
    validateGeneratedLayoutSchema
};