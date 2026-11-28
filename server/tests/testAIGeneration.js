import {
    calculateBuildableArea
} from "../services/buildableAreaService.js";

import {
    calculateSpaceFeasibility
} from "../services/spaceFeasibilityService.js";

import {
    generateBlueprintLayout
} from "../services/aiGenerationService.js";


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
    ],

    specialRequirements:
        "Provide good natural lighting and ventilation."
};


const testAIGeneration = async () => {

    try {

        console.log("Calculating buildable geometry...");


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


        console.log("Calculating space feasibility...");


        const feasibilityReport =
            calculateSpaceFeasibility({

                geometry,

                requirements,

                unit: plot.unit
            });


        if (
            !feasibilityReport.isValid ||
            !feasibilityReport.isFeasible
        ) {

            throw new Error(
                JSON.stringify(feasibilityReport.errors)
            );
        }


        const blueprint = {

            title: "My Dream House",

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


        console.log("\nGenerating AI blueprint...\n");

        console.time("Generation time");


        const result =
            await generateBlueprintLayout(blueprint);


        console.timeEnd("Generation time");


        console.log(
            "\n========== GENERATED LAYOUT ==========\n"
        );

        console.log(
            JSON.stringify(result, null, 2)
        );


        console.log(
            "\nAI BLUEPRINT GENERATION SUCCESSFUL"
        );


    } catch (error) {

        console.error(
            "\nAI BLUEPRINT GENERATION FAILED"
        );

        console.error("Status:", error.status);

        console.error("Error:", error.message);

        process.exitCode = 1;
    }
};


await testAIGeneration();