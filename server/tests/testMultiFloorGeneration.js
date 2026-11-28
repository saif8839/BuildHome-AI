
import {
    calculateBuildableArea
} from "../services/buildableAreaService.js";

import {
    calculateSpaceFeasibility
} from "../services/spaceFeasibilityService.js";

import {
    generateBlueprintLayout
} from "../services/aiGenerationService.js";

import {
    validateGeneratedLayout
} from "../services/layoutValidationService.js";


// ==========================================
// PLOT CONFIGURATION
// ==========================================

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


// ==========================================
// MULTI-FLOOR REQUIREMENTS
// ==========================================

const requirements = {

    floors: 3,

    totalOccupancy: 6,

    spaces: [

        // Ground floor.

        {
            spaceType: "living room",
            quantity: 1,
            minimumArea: 200,
            preferredFloor: 0
        },
        {
            spaceType: "kitchen",
            quantity: 1,
            minimumArea: 120,
            preferredFloor: 0
        },
        {
            spaceType: "dining room",
            quantity: 1,
            minimumArea: 120,
            preferredFloor: 0
        },
        {
            spaceType: "bathroom",
            quantity: 1,
            minimumArea: 50,
            preferredFloor: 0
        },
        {
            spaceType: "staircase",
            quantity: 1,
            minimumArea: 100,
            preferredFloor: 0
        },


        // First floor.

        {
            spaceType: "bedroom",
            quantity: 2,
            minimumArea: 150,
            preferredFloor: 1
        },
        {
            spaceType: "bathroom",
            quantity: 2,
            minimumArea: 50,
            preferredFloor: 1
        },
        {
            spaceType: "staircase",
            quantity: 1,
            minimumArea: 100,
            preferredFloor: 1
        },


        // Second floor.

        {
            spaceType: "bedroom",
            quantity: 1,
            minimumArea: 150,
            preferredFloor: 2
        },
        {
            spaceType: "study room",
            quantity: 1,
            minimumArea: 120,
            preferredFloor: 2
        },
        {
            spaceType: "bathroom",
            quantity: 1,
            minimumArea: 50,
            preferredFloor: 2
        },
        {
            spaceType: "staircase",
            quantity: 1,
            minimumArea: 100,
            preferredFloor: 2
        }
    ],

    specialRequirements: [
        "Generate exactly three floors.",
        "Ground floor index must be 0.",
        "First floor index must be 1.",
        "Second floor index must be 2.",
        "Place requested rooms on their preferred floors.",
        "Provide a staircase on every floor.",
        "Keep staircase footprints vertically aligned.",
        "Use identical staircase coordinates on all floors.",
        "Provide circulation between rooms and staircases.",
        "Ensure good natural lighting and ventilation.",
        "Reserve sufficient space for walls and infrastructure."
    ].join(" ")
};


// ==========================================
// MULTI-FLOOR INTEGRATION TEST
// ==========================================

const testMultiFloorGeneration = async () => {

    try {

        console.log(
            "\n========== MULTI-FLOOR BLUEPRINT TEST ==========\n"
        );


        // 1. Calculate buildable geometry.

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


        // 2. Calculate space feasibility.

        console.log("Calculating multi-floor feasibility...");

        const feasibilityReport =
            calculateSpaceFeasibility({

                geometry,

                requirements,

                unit: plot.unit
            });


        console.log(
            "\n========== FEASIBILITY REPORT ==========\n"
        );

        console.log(
            JSON.stringify(feasibilityReport, null, 2)
        );

        if (
            !feasibilityReport.isValid ||
            feasibilityReport.isFeasible === false
        ) {

            throw new Error(
                `Blueprint feasibility failed: ${JSON.stringify(feasibilityReport.errors)
                }`
            );
        }


        // Allow preliminary generation with feasibility warnings.
        if (feasibilityReport.warnings.length > 0) {

            console.warn(
                "\nBlueprint feasibility warnings:"
            );

            for (const warning of feasibilityReport.warnings) {

                console.warn(`- ${warning}`);
            }
        }

        // 3. Prepare blueprint.

        const blueprint = {

            title: "My Three Storey Dream House",

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
                "Modern G+2 residential building with vertically aligned staircases and good natural lighting.",

            jurisdiction: {

                country: "India",

                state: "Madhya Pradesh",

                city: "Rewa"
            }
        };


        // 4. Generate layout using Gemini.

        console.log("\nGenerating multi-floor blueprint...\n");

        console.time("Generation time");

        const result =
            await generateBlueprintLayout(blueprint);

        console.timeEnd("Generation time");


        // 5. Validate generated layout.

        console.log("\nValidating generated layout...\n");

        console.time("Validation time");

        const validationReport =
            validateGeneratedLayout({

                blueprint,

                generatedLayout: result.generatedLayout
            });

        console.timeEnd("Validation time");


        // 6. Display generated layout.

        console.log(
            "\n========== GENERATED LAYOUT ==========\n"
        );

        console.log(
            JSON.stringify(result, null, 2)
        );


        // 7. Display validation report.

        console.log(
            "\n========== VALIDATION REPORT ==========\n"
        );

        console.log(
            JSON.stringify(validationReport, null, 2)
        );


        // 8. Display floor-wise summary.

        console.log(
            "\n========== FLOOR-WISE SUMMARY ==========\n"
        );

        console.table(

            validationReport.floorAnalysis.map(floor => ({

                floorIndex: floor.floorIndex,

                name: floor.name,

                spaces: floor.spaceCount,

                occupiedArea: floor.occupiedArea,

                remainingArea: floor.remainingArea,

                utilization:
                    `${floor.utilizationPercentage}%`
            }))
        );


        // 9. Inspect staircase coordinates.

        console.log(
            "\n========== STAIRCASE ANALYSIS ==========\n"
        );

        const staircaseAnalysis =
            result.generatedLayout.floors.map(floor => ({

                floorIndex: floor.floorIndex,

                staircases: floor.spaces

                    .filter(space =>
                        space.spaceType.trim().toLowerCase()
                        === "staircase"
                    )

                    .map(space => ({

                        id: space.id,

                        name: space.name,

                        boundary: space.boundary
                    }))
            }));


        console.log(
            JSON.stringify(staircaseAnalysis, null, 2)
        );


        // 10. Display final summary.

        console.log(
            "\n========== VALIDATION SUMMARY ==========\n"
        );

        console.log({

            isValid: validationReport.isValid,

            status: validationReport.status,

            expectedFloors: requirements.floors,

            generatedFloors:
                result.generatedLayout.floors.length,

            totalSpaces:
                validationReport.spaceAnalysis.length,

            totalErrors:
                validationReport.errors.length,

            totalWarnings:
                validationReport.warnings.length,

            satisfiedRequirements:
                validationReport.requirementAnalysis.filter(
                    requirement => requirement.isSatisfied
                ).length,

            totalRequirements:
                requirements.spaces.length
        });


        if (!validationReport.isValid) {

            console.error(
                "\nMULTI-FLOOR BLUEPRINT FAILED VALIDATION"
            );

            process.exitCode = 1;

            return;
        }


        if (validationReport.warnings.length > 0) {

            console.warn(
                "\nMULTI-FLOOR BLUEPRINT GENERATED WITH WARNINGS"
            );

        } else {

            console.log(
                "\nMULTI-FLOOR BLUEPRINT PASSED CURRENT VALIDATION CHECKS"
            );
        }

    } catch (error) {

        console.error(
            "\nMULTI-FLOOR BLUEPRINT GENERATION FAILED"
        );

        console.error("Status:", error.status);

        console.error("Error:", error.message);

        process.exitCode = 1;
    }
};


await testMultiFloorGeneration();
