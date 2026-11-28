// Current version of the generated layout format.
const LAYOUT_SCHEMA_VERSION = "1.0";


// A single coordinate in the plot coordinate system.
// X increases towards east.
// Y increases towards north.
const pointSchema = {

    type: "object",

    properties: {

        x: {
            type: "number"
        },

        y: {
            type: "number"
        }
    },

    required: [
        "x",
        "y"
    ],

    additionalProperties: false
};


// A polygon representing a space boundary.
const boundarySchema = {

    type: "array",

    description:
        "Ordered polygon vertices. Do not repeat the first vertex at the end.",

    items: pointSchema,

    minItems: 3
};


// A single space within a building floor.
const spaceSchema = {

    type: "object",

    properties: {

        id: {
            type: "string",
            description:
                "Unique identifier for the space across the entire layout."
        },

        spaceType: {
            type: "string",
            description:
                "Type of space, matching the requested space type where applicable."
        },

        name: {
            type: "string",
            description:
                "Human-readable name of the space."
        },

        boundary: boundarySchema,

        notes: {
            type: "string",
            description:
                "Additional design information about this space."
        }
    },

    required: [
        "id",
        "spaceType",
        "name",
        "boundary",
        "notes"
    ],

    additionalProperties: false
};


// A single building floor.
const floorSchema = {

    type: "object",

    properties: {

        floorIndex: {
            type: "integer",
            minimum: 0,
            description:
                "Zero-based floor index. Ground floor is 0."
        },

        name: {
            type: "string",
            description:
                "Human-readable floor name."
        },

        floorHeight: {
            type: "number",
            exclusiveMinimum: 0,
            description:
                "Floor-to-floor height in the selected measurement unit."
        },

        spaces: {

            type: "array",

            items: spaceSchema,

            minItems: 1
        }
    },

    required: [
        "floorIndex",
        "name",
        "floorHeight",
        "spaces"
    ],

    additionalProperties: false
};


// Complete AI-generated spatial layout.
const generatedLayoutSchema = {

    type: "object",

    properties: {

        schemaVersion: {

            type: "string",

            enum: [
                LAYOUT_SCHEMA_VERSION
            ]
        },

        unit: {

            type: "string",

            enum: [
                "ft",
                "m"
            ]
        },

        floors: {

            type: "array",

            items: floorSchema,

            minItems: 1,

            maxItems: 100
        },

        designNotes: {

            type: "array",

            items: {
                type: "string"
            }
        },

        assumptions: {

            type: "array",

            items: {
                type: "string"
            }
        }
    },

    required: [
        "schemaVersion",
        "unit",
        "floors",
        "designNotes",
        "assumptions"
    ],

    additionalProperties: false
};

// Constraints that can increase Gemini's
// structured output generation complexity.
const geminiExcludedConstraints = new Set([

    "minItems",
    "maxItems",
    "minimum",
    "maximum",
    "exclusiveMinimum",
    "exclusiveMaximum",
    "minLength",
    "maxLength",
    "pattern",
    "format",
    "description"
]);


// Create a simplified schema for Gemini without
// modifying the original strict validation schema.
const simplifySchemaForGemini = (schema) => {

    if (Array.isArray(schema)) {

        return schema.map(simplifySchemaForGemini);
    }


    if (
        schema === null ||
        typeof schema !== "object"
    ) {

        return schema;
    }


    const simplifiedSchema = {};


    for (const [key, value] of Object.entries(schema)) {

        if (geminiExcludedConstraints.has(key)) {

            continue;
        }


        // Preserve actual property names.
        if (key === "properties") {

            simplifiedSchema[key] = Object.fromEntries(

                Object.entries(value).map(
                    ([propertyName, propertySchema]) => [

                        propertyName,

                        simplifySchemaForGemini(propertySchema)
                    ]
                )
            );

            continue;
        }


        simplifiedSchema[key] =
            simplifySchemaForGemini(value);
    }


    return simplifiedSchema;
};


// Gemini-compatible simplified layout schema.
const geminiLayoutSchema = simplifySchemaForGemini(
    generatedLayoutSchema
);


export {
    LAYOUT_SCHEMA_VERSION,
    generatedLayoutSchema,
    geminiLayoutSchema
};

export default generatedLayoutSchema;