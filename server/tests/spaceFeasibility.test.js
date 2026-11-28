import test from "node:test";
import assert from "node:assert/strict";

import {
    calculateSpaceFeasibility
} from "../services/spaceFeasibilityService.js";


// Common buildable geometry.
const geometry = {
    buildableArea: 1008,
    buildableRegions: [
        {
            area: 1008
        }
    ]
};


// Common residential requirements.
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


// Helper for floating-point comparisons.
const assertAlmostEqual = (actual, expected) => {

    assert.ok(
        Math.abs(actual - expected) < 1e-6,
        `Expected ${expected}, received ${actual}`
    );
};


// Test 1: Standard residential blueprint.
test("Standard residential blueprint", () => {

    const result = calculateSpaceFeasibility({
        geometry,
        requirements,
        unit: "ft"
    });

    assert.equal(result.isValid, true);
    assert.equal(result.isFeasible, true);
    assert.equal(result.status, "feasible");

    assert.equal(result.errors.length, 0);
    assert.equal(result.warnings.length, 0);

    assertAlmostEqual(
        result.capacity.totalUsableArea,
        756
    );

    assertAlmostEqual(
        result.requirementsSummary.totalRequiredArea,
        600
    );

    assertAlmostEqual(
        result.utilization.remainingUsableArea,
        156
    );

    assert.equal(
        result.requirementsSummary.totalRequestedSpaces,
        6
    );
});


// Test 2: Insufficient physical area.
test("Requested spaces exceed total floor area", () => {

    const result = calculateSpaceFeasibility({

        geometry,

        requirements: {
            floors: 1,

            spaces: [
                {
                    spaceType: "bedroom",
                    quantity: 10,
                    minimumArea: 150
                }
            ]
        }
    });

    assert.equal(result.isValid, true);
    assert.equal(result.isFeasible, false);
    assert.equal(result.status, "infeasible");
    assert.ok(result.errors.length > 0);
});


// Test 3: Infrastructure allowance exceeded.
test("Requested spaces exceed estimated usable area", () => {

    const result = calculateSpaceFeasibility({

        geometry,

        requirements: {
            floors: 1,

            spaces: [
                {
                    spaceType: "bedroom",
                    quantity: 6,
                    minimumArea: 150
                }
            ]
        }
    });

    assert.equal(result.isValid, true);
    assert.equal(result.isFeasible, null);
    assert.equal(result.status, "warning");

    assert.equal(result.errors.length, 0);
    assert.ok(result.warnings.length > 0);

    assertAlmostEqual(
        result.utilization.remainingUsableArea,
        -144
    );
});


// Test 4: Multi-floor capacity.
test("Multi-floor building capacity", () => {

    const result = calculateSpaceFeasibility({

        geometry,

        requirements: {
            floors: 2,

            spaces: [
                {
                    spaceType: "bedroom",
                    quantity: 8,
                    minimumArea: 150
                }
            ]
        }
    });

    assert.equal(result.isValid, true);
    assert.equal(result.status, "warning");

    assertAlmostEqual(
        result.capacity.totalFloorArea,
        2016
    );

    assertAlmostEqual(
        result.capacity.totalUsableArea,
        1512
    );

    assertAlmostEqual(
        result.utilization.remainingUsableArea,
        312
    );

    assert.equal(result.floorAnalysis.length, 2);
    assert.equal(result.errors.length, 0);
});


// Test 5: Preferred floor overload.
test("Preferred floor exceeds available floor area", () => {

    const result = calculateSpaceFeasibility({

        geometry,

        requirements: {
            floors: 2,

            spaces: [
                {
                    spaceType: "bedroom",
                    quantity: 8,
                    minimumArea: 150,
                    preferredFloor: 0
                }
            ]
        }
    });

    assert.equal(result.isValid, true);
    assert.equal(result.status, "warning");

    assertAlmostEqual(
        result.floorAnalysis[0].preferredRequiredArea,
        1200
    );

    assert.ok(
        result.warnings.some(
            warning => warning.includes(
                "physical area of floor 0"
            )
        )
    );
});


// Test 6: Missing minimum area.
test("Missing minimum area requirements", () => {

    const result = calculateSpaceFeasibility({

        geometry,

        requirements: {
            floors: 1,

            spaces: [
                {
                    spaceType: "bedroom",
                    quantity: 3
                }
            ]
        }
    });

    assert.equal(result.isValid, true);
    assert.equal(result.isFeasible, null);
    assert.equal(result.status, "undetermined");

    assert.equal(
        result.requirementsSummary.unspecifiedAreaSpaceCount,
        3
    );

    assert.ok(result.warnings.length > 0);
});


// Test 7: Empty space requirements.
test("Empty space requirements", () => {

    const result = calculateSpaceFeasibility({

        geometry,

        requirements: {
            floors: 1,
            spaces: []
        }
    });

    assert.equal(result.isValid, true);
    assert.equal(result.status, "undetermined");

    assert.equal(
        result.requirementsSummary.totalRequestedSpaces,
        0
    );
});


// Test 8: Disconnected buildable regions.
test("Disconnected buildable regions", () => {

    const result = calculateSpaceFeasibility({

        geometry: {
            buildableArea: 700,

            buildableRegions: [
                { area: 400 },
                { area: 300 }
            ]
        },

        requirements: {
            floors: 1,

            spaces: [
                {
                    spaceType: "bedroom",
                    quantity: 2,
                    minimumArea: 150
                }
            ]
        }
    });

    assert.equal(result.isValid, true);
    assert.equal(result.status, "warning");

    assert.equal(result.regionAnalysis.length, 2);

    assertAlmostEqual(
        result.capacity.largestRegionArea,
        400
    );

    assert.equal(result.errors.length, 0);
});


// Test 9: Room larger than every buildable region.
test("Individual room exceeds largest buildable region", () => {

    const result = calculateSpaceFeasibility({

        geometry: {
            buildableArea: 700,

            buildableRegions: [
                { area: 400 },
                { area: 300 }
            ]
        },

        requirements: {
            floors: 1,

            spaces: [
                {
                    spaceType: "hall",
                    quantity: 1,
                    minimumArea: 500
                }
            ]
        }
    });

    assert.equal(result.isValid, true);
    assert.equal(result.isFeasible, false);
    assert.equal(result.status, "infeasible");

    assert.ok(result.errors.length > 0);
});


// Test 10: Metric measurement units.
test("Metric measurement units", () => {

    const result = calculateSpaceFeasibility({

        unit: "m",

        geometry: {
            buildableArea: 100,

            buildableRegions: [
                { area: 100 }
            ]
        },

        requirements: {
            floors: 1,

            spaces: [
                {
                    spaceType: "bedroom",
                    quantity: 2,
                    minimumArea: 12
                }
            ]
        }
    });

    assert.equal(result.isValid, true);
    assert.equal(result.status, "feasible");

    assert.equal(result.unit, "m");
    assert.equal(result.areaUnit, "m²");

    assertAlmostEqual(
        result.capacity.totalUsableArea,
        75
    );

    assertAlmostEqual(
        result.requirementsSummary.totalRequiredArea,
        24
    );
});


// Test 11: Invalid infrastructure allowance.
test("Invalid infrastructure allowance", () => {

    const result = calculateSpaceFeasibility({

        geometry,
        requirements

    }, {

        infrastructureAllowance: 1.5
    });

    assert.equal(result.isValid, false);
    assert.equal(result.status, "invalid");
    assert.ok(result.errors.length > 0);
});


// Test 12: Invalid preferred floor index.
test("Invalid preferred floor index", () => {

    const result = calculateSpaceFeasibility({

        geometry,

        requirements: {
            floors: 2,

            spaces: [
                {
                    spaceType: "bedroom",
                    quantity: 1,
                    minimumArea: 120,
                    preferredFloor: 5
                }
            ]
        }
    });

    assert.equal(result.isValid, false);
    assert.equal(result.status, "invalid");
    assert.ok(result.errors.length > 0);
});


// Test 13: Inconsistent buildable region areas.
test("Inconsistent buildable region areas", () => {

    const result = calculateSpaceFeasibility({

        geometry: {
            buildableArea: 1000,

            buildableRegions: [
                { area: 300 },
                { area: 400 }
            ]
        },

        requirements
    });

    assert.equal(result.isValid, false);
    assert.equal(result.status, "invalid");
    assert.ok(result.errors.length > 0);
});