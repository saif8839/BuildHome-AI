import test from "node:test";

import assert from "node:assert/strict";

import {
    validateGeneratedLayout
} from "../services/layoutValidationService.js";


// ==========================================
// TEST HELPERS
// ==========================================


// Create a rectangular polygon.
const rectangle = (x, y, width, height) => {

    return [
        { x, y },
        { x: x + width, y },
        { x: x + width, y: y + height },
        { x, y: y + height }
    ];
};


// Create a generated space.
const createSpace = (
    id,
    spaceType,
    boundary
) => {

    return {
        id,
        spaceType,
        name: id,
        boundary,
        notes: ""
    };
};


// Create a generated floor.
const createFloor = (
    floorIndex,
    spaces
) => {

    return {
        floorIndex,
        name: `Floor ${floorIndex}`,
        floorHeight: 10,
        spaces
    };
};


// Create a valid blueprint fixture.
const createBlueprint = () => {

    return {

        buildingType: "residential",

        plot: {
            unit: "ft",
            boundary: rectangle(0, 0, 30, 50),
            roadEdgeIndex: 0
        },

        geometry: {

            buildableArea: 1008,

            buildableRegions: [
                {
                    boundary: rectangle(3, 5, 24, 42),
                    holes: [],
                    area: 1008
                }
            ]
        },

        requirements: {

            floors: 1,

            spaces: [
                {
                    spaceType: "bedroom",
                    quantity: 2,
                    minimumArea: 120
                },
                {
                    spaceType: "kitchen",
                    quantity: 1,
                    minimumArea: 100
                }
            ]
        },

        feasibilityReport: {
            isValid: true,
            isFeasible: true,
            infrastructureAllowance: 0.25
        }
    };
};


// Create a valid generated layout fixture.
const createLayout = () => {

    return {

        schemaVersion: "1.0",

        unit: "ft",

        floors: [

            createFloor(0, [

                createSpace(
                    "bedroom-1",
                    "bedroom",
                    rectangle(3, 5, 10, 14)
                ),

                createSpace(
                    "bedroom-2",
                    "bedroom",
                    rectangle(3, 19, 10, 14)
                ),

                createSpace(
                    "kitchen-1",
                    "kitchen",
                    rectangle(17, 5, 10, 12)
                )
            ])
        ],

        designNotes: [],

        assumptions: []
    };
};


// Simplify validation calls.
const validate = (
    blueprint = createBlueprint(),
    generatedLayout = createLayout()
) => {

    return validateGeneratedLayout({
        blueprint,
        generatedLayout
    });
};


// Check whether an expected error exists.
const assertError = (report, pattern) => {

    assert.equal(report.isValid, false);

    assert.ok(
        report.errors.some(
            error => pattern.test(error)
        ),
        JSON.stringify(report, null, 2)
    );
};


// ==========================================
// TEST CASES
// ==========================================


// 1. Valid layout.
test("Accepts a valid generated layout", () => {

    const report = validate();

    assert.equal(report.isValid, true);

    assert.equal(report.status, "valid");

    assert.equal(report.errors.length, 0);

    assert.equal(report.spaceAnalysis.length, 3);

    assert.equal(
        report.floorAnalysis[0].occupiedArea,
        400
    );
});


// 2. Shared boundaries.
test("Allows rooms to share boundary edges", () => {

    const report = validate();

    assert.equal(report.isValid, true);

    assert.equal(report.errors.length, 0);
});


// 3. Overlapping spaces.
test("Rejects overlapping spaces", () => {

    const layout = createLayout();

    layout.floors[0].spaces[1].boundary =
        rectangle(3, 15, 10, 14);

    const report = validate(
        createBlueprint(),
        layout
    );

    assertError(report, /overlaps/i);
});


// 4. Outside buildable region.
test("Rejects spaces outside buildable regions", () => {

    const layout = createLayout();

    layout.floors[0].spaces[0].boundary =
        rectangle(0, 5, 10, 14);

    const report = validate(
        createBlueprint(),
        layout
    );

    assertError(report, /outside/i);
});


// 5. Self-intersecting polygon.
test("Rejects self-intersecting polygons", () => {

    const layout = createLayout();

    layout.floors[0].spaces[0].boundary = [
        { x: 3, y: 5 },
        { x: 13, y: 19 },
        { x: 3, y: 19 },
        { x: 13, y: 5 }
    ];

    const report = validate(
        createBlueprint(),
        layout
    );

    assertError(report, /intersect/i);
});


// 6. Duplicate space IDs.
test("Rejects duplicate space IDs", () => {

    const layout = createLayout();

    layout.floors[0].spaces[1].id =
        "bedroom-1";

    const report = validate(
        createBlueprint(),
        layout
    );

    assertError(report, /duplicate space id/i);
});


// 7. Missing required space.
test("Rejects missing required bedrooms", () => {

    const layout = createLayout();

    layout.floors[0].spaces.splice(1, 1);

    const report = validate(
        createBlueprint(),
        layout
    );

    assertError(report, /required 2 bedroom/i);
});


// 8. Individual minimum area.
test("Rejects insufficient individual room area", () => {

    const layout = createLayout();

    layout.floors[0].spaces[0].boundary =
        rectangle(3, 5, 10, 10);

    layout.floors[0].spaces[1].boundary =
        rectangle(3, 19, 10, 16);

    const report = validate(
        createBlueprint(),
        layout
    );

    assertError(report, /minimum area/i);
});


// 9. Measurement unit mismatch.
test("Rejects incorrect measurement units", () => {

    const layout = createLayout();

    layout.unit = "m";

    const report = validate(
        createBlueprint(),
        layout
    );

    assertError(report, /expected unit/i);
});


// 10. Floor count mismatch.
test("Rejects incorrect floor count", () => {

    const blueprint = createBlueprint();

    blueprint.requirements.floors = 2;

    const report = validate(
        blueprint,
        createLayout()
    );

    assertError(report, /expected 2 floors/i);

    assertError(report, /missing required floor/i);
});


// 11. Duplicate floor indexes.
test("Rejects duplicate floor indexes", () => {

    const blueprint = createBlueprint();

    blueprint.requirements.floors = 2;

    const layout = createLayout();

    layout.floors.push(

        createFloor(0, [

            createSpace(
                "office-1",
                "office",
                rectangle(3, 33, 10, 10)
            )
        ])
    );

    const report = validate(
        blueprint,
        layout
    );

    assertError(report, /duplicate floor index/i);
});


// 12. Excluded holes.
test("Rejects spaces extending into excluded holes", () => {

    const blueprint = createBlueprint();

    blueprint.geometry.buildableRegions[0].holes = [
        rectangle(5, 7, 4, 4)
    ];

    blueprint.geometry.buildableRegions[0].area = 992;

    blueprint.geometry.buildableArea = 992;

    const report = validate(
        blueprint,
        createLayout()
    );

    assertError(report, /excluded hole/i);
});


// 13. Concave boundary.
test("Rejects spaces crossing a concave boundary", () => {

    const blueprint = createBlueprint();

    blueprint.geometry = {

        buildableArea: 700,

        buildableRegions: [
            {
                boundary: [
                    { x: 0, y: 0 },
                    { x: 30, y: 0 },
                    { x: 30, y: 30 },
                    { x: 20, y: 30 },
                    { x: 20, y: 10 },
                    { x: 10, y: 10 },
                    { x: 10, y: 30 },
                    { x: 0, y: 30 }
                ],

                holes: [],

                area: 700
            }
        ]
    };

    blueprint.requirements.spaces = [];

    const layout = createLayout();

    layout.floors[0].spaces = [

        createSpace(
            "living-1",
            "living room",
            rectangle(5, 15, 20, 10)
        )
    ];

    const report = validate(
        blueprint,
        layout
    );

    assertError(report, /outside/i);
});


// 14. Overlap across different floors.
test("Allows identical coordinates on different floors", () => {

    const blueprint = createBlueprint();

    blueprint.requirements.floors = 2;

    const layout = createLayout();

    layout.floors.push(

        createFloor(1, [

            createSpace(
                "office-1",
                "office",
                rectangle(3, 5, 10, 14)
            )
        ])
    );

    const report = validate(
        blueprint,
        layout
    );

    assert.equal(report.isValid, true);

    assert.equal(report.errors.length, 0);
});


// 15. Preferred floor mismatch.
test("Treats preferred floor mismatch as a warning", () => {

    const blueprint = createBlueprint();

    blueprint.requirements.floors = 2;

    blueprint.requirements.spaces[0].preferredFloor = 1;

    const layout = createLayout();

    layout.floors.push(

        createFloor(1, [

            createSpace(
                "office-1",
                "office",
                rectangle(3, 5, 10, 14)
            )
        ])
    );

    const report = validate(
        blueprint,
        layout
    );

    assert.equal(report.isValid, true);

    assert.equal(
        report.status,
        "valid_with_warnings"
    );

    assert.ok(
        report.warnings.some(
            warning => /preferred floor/i.test(warning)
        )
    );
});


// 16. Complete footprint utilization.
test("Warns when the entire buildable area is occupied", () => {

    const blueprint = createBlueprint();

    blueprint.requirements.spaces = [];

    const layout = createLayout();

    layout.floors[0].spaces = [

        createSpace(
            "hall-1",
            "hall",
            rectangle(3, 5, 24, 42)
        )
    ];

    const report = validate(
        blueprint,
        layout
    );

    assert.equal(report.isValid, true);

    assert.equal(
        report.status,
        "valid_with_warnings"
    );

    assert.equal(
        report.floorAnalysis[0].remainingArea,
        0
    );

    assert.equal(
        report.floorAnalysis[0].utilizationPercentage,
        100
    );

    assert.ok(
        report.warnings.some(
            warning => /unallocated footprint/i.test(warning)
        )
    );
});


// 17. Invalid generated schema.
test("Rejects an invalid generated layout schema", () => {

    const layout = createLayout();

    delete layout.schemaVersion;

    const report = validate(
        createBlueprint(),
        layout
    );

    assertError(report, /schemaVersion/i);
});


// 18. Duplicate requirement assignments.
test("Prevents a room from satisfying multiple requirements", () => {

    const blueprint = createBlueprint();

    blueprint.requirements.spaces = [
        {
            spaceType: "bedroom",
            quantity: 1,
            minimumArea: 120
        },
        {
            spaceType: "bedroom",
            quantity: 1,
            minimumArea: 100
        }
    ];

    const layout = createLayout();

    layout.floors[0].spaces.splice(1, 1);

    const report = validate(
        blueprint,
        layout
    );

    assertError(report, /eligible space/i);
});


// 19. Disconnected buildable regions.
test("Rejects spaces spanning disconnected regions", () => {

    const blueprint = createBlueprint();

    blueprint.geometry = {

        buildableArea: 200,

        buildableRegions: [
            {
                boundary: rectangle(0, 0, 10, 10),
                holes: [],
                area: 100
            },
            {
                boundary: rectangle(20, 0, 10, 10),
                holes: [],
                area: 100
            }
        ]
    };

    blueprint.requirements.spaces = [];

    const layout = createLayout();

    layout.floors[0].spaces = [

        createSpace(
            "hall-1",
            "hall",
            rectangle(5, 2, 20, 6)
        )
    ];

    const report = validate(
        blueprint,
        layout
    );

    assertError(report, /outside/i);
});