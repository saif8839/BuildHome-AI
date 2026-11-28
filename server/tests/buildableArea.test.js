import test from "node:test";
import assert from "node:assert/strict";

import {
    calculateBuildableArea
} from "../services/buildableAreaService.js";


// Common rectangular plot.
const boundary = [
    { x: 0, y: 0 },
    { x: 30, y: 0 },
    { x: 30, y: 50 },
    { x: 0, y: 50 }
];

const setbacks = [
    { edgeIndex: 0, distance: 5 },
    { edgeIndex: 1, distance: 3 },
    { edgeIndex: 2, distance: 3 },
    { edgeIndex: 3, distance: 3 }
];


// Compare floating-point values.
const assertAlmostEqual = (actual, expected) => {

    assert.ok(
        Math.abs(actual - expected) < 1e-6,
        `Expected ${expected}, received ${actual}`
    );
};


// Test 1: Standard rectangular plot.
test("Rectangular plot with setbacks", () => {

    const result = calculateBuildableArea({
        boundary,
        roadEdgeIndex: 0,
        setbacks
    });

    assert.equal(result.isValid, true);

    assertAlmostEqual(result.plotArea, 1500);
    assertAlmostEqual(result.buildableArea, 1008);
    assertAlmostEqual(result.setbackArea, 492);
    assertAlmostEqual(result.buildablePercentage, 67.2);

    assert.equal(result.buildableRegions.length, 1);
});


// Test 2: Plot without setbacks.
test("Plot without setbacks", () => {

    const result = calculateBuildableArea({
        boundary,
        roadEdgeIndex: 0,
        setbacks: []
    });

    assert.equal(result.isValid, true);

    assertAlmostEqual(result.buildableArea, 1500);
    assertAlmostEqual(result.setbackArea, 0);
    assertAlmostEqual(result.buildablePercentage, 100);
});


// Test 3: Excessive setbacks.
test("Setbacks eliminate the entire plot", () => {

    const result = calculateBuildableArea({
        boundary,
        roadEdgeIndex: 0,

        setbacks: [
            { edgeIndex: 0, distance: 100 }
        ]
    });

    assert.equal(result.isValid, false);
    assert.equal(result.buildableArea, 0);
    assert.equal(result.buildableRegions.length, 0);
});


// Test 4: Clockwise boundary.
test("Clockwise rectangular plot", () => {

    const result = calculateBuildableArea({

        boundary: [
            { x: 0, y: 0 },
            { x: 0, y: 50 },
            { x: 30, y: 50 },
            { x: 30, y: 0 }
        ],

        roadEdgeIndex: 3,

        setbacks: [
            { edgeIndex: 0, distance: 3 },
            { edgeIndex: 1, distance: 3 },
            { edgeIndex: 2, distance: 3 },
            { edgeIndex: 3, distance: 5 }
        ]
    });

    assert.equal(result.isValid, true);
    assertAlmostEqual(result.buildableArea, 1008);
});


// Test 5: Invalid polygon.
test("Self-intersecting plot boundary", () => {

    const result = calculateBuildableArea({

        boundary: [
            { x: 0, y: 0 },
            { x: 30, y: 50 },
            { x: 0, y: 50 },
            { x: 30, y: 0 }
        ],

        roadEdgeIndex: 0
    });

    assert.equal(result.isValid, false);
    assert.ok(result.errors.length > 0);
});


// Test 6: Duplicate setback indexes.
test("Duplicate setback edge indexes", () => {

    const result = calculateBuildableArea({
        boundary,
        roadEdgeIndex: 0,

        setbacks: [
            { edgeIndex: 0, distance: 5 },
            { edgeIndex: 0, distance: 3 }
        ]
    });

    assert.equal(result.isValid, false);
    assert.ok(result.errors.length > 0);
});


// Test 7: Triangular plot.
test("Triangular plot with setbacks", () => {

    const result = calculateBuildableArea({

        boundary: [
            { x: 0, y: 0 },
            { x: 40, y: 0 },
            { x: 20, y: 30 }
        ],

        roadEdgeIndex: 0,

        setbacks: [
            { edgeIndex: 0, distance: 2 },
            { edgeIndex: 1, distance: 2 },
            { edgeIndex: 2, distance: 2 }
        ]
    });

    assert.equal(result.isValid, true);

    assertAlmostEqual(result.plotArea, 600);

    assert.ok(result.buildableArea > 0);
    assert.ok(result.buildableArea < 600);
});


// Test 8: Concave L-shaped plot.
test("Concave L-shaped plot", () => {

    const result = calculateBuildableArea({

        boundary: [
            { x: 0, y: 0 },
            { x: 40, y: 0 },
            { x: 40, y: 20 },
            { x: 20, y: 20 },
            { x: 20, y: 40 },
            { x: 0, y: 40 }
        ],

        roadEdgeIndex: 0,

        setbacks: Array.from(
            { length: 6 },
            (_, edgeIndex) => ({
                edgeIndex,
                distance: 2
            })
        )
    });

    assert.equal(result.isValid, true);

    assertAlmostEqual(result.plotArea, 1200);

    assert.ok(result.buildableArea > 0);
    assert.ok(result.buildableArea < 1200);

    assert.equal(result.buildableRegions.length, 1);
});


// Test 9: Disconnected buildable regions.
test("Setbacks split plot into multiple regions", () => {

    const narrowPlot = [
        { x: 0, y: 0 },
        { x: 20, y: 0 },
        { x: 20, y: 8 },
        { x: 30, y: 8 },
        { x: 30, y: 0 },
        { x: 50, y: 0 },
        { x: 50, y: 20 },
        { x: 30, y: 20 },
        { x: 30, y: 12 },
        { x: 20, y: 12 },
        { x: 20, y: 20 },
        { x: 0, y: 20 }
    ];

    const result = calculateBuildableArea({

        boundary: narrowPlot,

        roadEdgeIndex: 0,

        setbacks: narrowPlot.map((_, edgeIndex) => ({
            edgeIndex,
            distance: 3
        }))
    });

    assert.equal(result.isValid, true);
    assert.equal(result.buildableRegions.length, 2);

    assert.ok(result.buildableArea > 0);
});