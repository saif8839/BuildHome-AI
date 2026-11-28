import {
    buildBlueprintPrompt
} from "../services/blueprintPromptService.js";

import {
    calculateBuildableArea
} from "../services/buildableAreaService.js";

import {
    calculateSpaceFeasibility
} from "../services/spaceFeasibilityService.js";


// Sample plot.
const plot = {

    boundary: [
        { x: 0, y: 0 },
        { x: 30, y: 0 },
        { x: 30, y: 50 },
        { x: 0, y: 50 }
    ],

    unit: "ft",

    roadEdgeIndex: 0
};


const setbacks = [
    { edgeIndex: 0, distance: 5 },
    { edgeIndex: 1, distance: 3 },
    { edgeIndex: 2, distance: 3 },
    { edgeIndex: 3, distance: 3 }
];


// Building requirements.
const requirements = {

    floors: 1,

    totalOccupancy: 4,

    spaces: [
        {
            spaceType: "bedroom",
            quantity: 2,
            minimumArea: 120
        },
        {
            spaceType: "living room",
            quantity: 1,
            minimumArea: 180
        },
        {
            spaceType: "kitchen",
            quantity: 1,
            minimumArea: 100
        },
        {
            spaceType: "bathroom",
            quantity: 2,
            minimumArea: 40
        }
    ]
};


// Calculate actual buildable geometry.
const geometry = calculateBuildableArea({

    boundary: plot.boundary,

    roadEdgeIndex: plot.roadEdgeIndex,

    setbacks
});


if (!geometry.isValid) {

    throw new Error(
        JSON.stringify(geometry.errors)
    );
}


// Calculate actual space feasibility.
const feasibilityReport = calculateSpaceFeasibility({

    geometry,

    requirements,

    unit: plot.unit
});


if (!feasibilityReport.isValid) {

    throw new Error(
        JSON.stringify(feasibilityReport.errors)
    );
}


// Prepare a sample blueprint document.
const blueprint = {

    buildingType: "residential",

    plot,

    setbacks,

    geometry,

    requirements,

    feasibilityReport,

    vastu: {

        enabled: true,

        priority: "balanced",

        spacePreferences: [
            {
                spaceType: "kitchen",
                preferredDirection: "southeast"
            },
            {
                spaceType: "bedroom",
                preferredDirection: "southwest"
            }
        ]
    },

    preferences:
        "Modern house with good natural lighting and ventilation.",

    jurisdiction: {

        country: "India",

        state: "Madhya Pradesh",

        city: "Rewa"
    }
};


// Generate prompts.
const result = buildBlueprintPrompt(blueprint);


console.log("\n========== SYSTEM PROMPT ==========\n");

console.log(result.systemPrompt);


console.log("\n========== USER PROMPT ==========\n");

console.log(result.userPrompt);


console.log("\n========== PROMPT SUMMARY ==========\n");

console.log({

    systemPromptCharacters:
        result.systemPrompt.length,

    userPromptCharacters:
        result.userPrompt.length,

    totalCharacters:
        result.systemPrompt.length +
        result.userPrompt.length
});