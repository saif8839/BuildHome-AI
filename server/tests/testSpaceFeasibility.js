import {
    calculateBuildableArea
} from "../services/buildableAreaService.js";

import {
    calculateSpaceFeasibility
} from "../services/spaceFeasibilityService.js";

// Calculate buildable geometry.
const geometry = calculateBuildableArea({

    boundary: [
        { x: 0, y: 0 },
        { x: 30, y: 0 },
        { x: 30, y: 50 },
        { x: 0, y: 50 }
    ],

    roadEdgeIndex: 0,

    setbacks: [
        { edgeIndex: 0, distance: 5 },
        { edgeIndex: 1, distance: 3 },
        { edgeIndex: 2, distance: 3 },
        { edgeIndex: 3, distance: 3 }
    ]
});


if (!geometry.isValid) {

    throw new Error(
        JSON.stringify(geometry.errors)
    );
}


// Analyze building requirements.
const result = calculateSpaceFeasibility({

    geometry,

    unit: "ft",

    requirements: {

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
    }

}, {

    infrastructureAllowance: 0.25
});


console.log(
    JSON.stringify(result, null, 2)
);