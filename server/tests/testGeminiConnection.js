import {
    getAIClient,
    getAIModel
} from "../config/aiConfig.js";


const testGeminiConnection = async () => {

    try {

        console.log("Connecting to Gemini API...");

        const ai = getAIClient();

        const model = getAIModel();

        console.log(`Using model: ${model}`);


        const response = await ai.models.generateContent({

            model,

            contents:
                "Return a JSON object with status success and a short message.",

            config: {

                responseMimeType: "application/json",

                responseJsonSchema: {

                    type: "object",

                    properties: {

                        status: {
                            type: "string",
                            enum: ["success"]
                        },

                        message: {
                            type: "string"
                        }
                    },

                    required: [
                        "status",
                        "message"
                    ],

                    additionalProperties: false
                }
            }
        });


        const result = JSON.parse(response.text);

        if (
            result.status !== "success" ||
            typeof result.message !== "string"
        ) {
            throw new Error("Unexpected Gemini response.");
        }

        console.log("\nGEMINI API CONNECTION SUCCESSFUL\n");

        console.log(
            JSON.stringify(result, null, 2)
        );

        console.log("\nToken usage:");

        console.log(response.usageMetadata);


    } catch (error) {

        console.error("\nGEMINI API TEST FAILED");

        console.error("Error status:", error.status);

        console.error("Error message:", error.message);

        process.exitCode = 1;
    }
};


await testGeminiConnection();