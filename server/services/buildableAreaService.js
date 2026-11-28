import polygonClipping from "polygon-clipping";

import {
    validatePlotGeometry
} from "./plotGeometryService.js";

const EPSILON = 1e-9;


// Calculate the area of a polygon ring.
const calculateRingArea = (ring) => {

    let area = 0;

    for (let i = 0; i < ring.length; i++) {

        const current = ring[i];
        const next = ring[(i + 1) % ring.length];

        area +=
            current[0] * next[1] -
            next[0] * current[1];
    }

    return Math.abs(area / 2);
};


// Calculate the total area of a MultiPolygon.
const calculateMultiPolygonArea = (multiPolygon) => {

    let totalArea = 0;

    for (const polygon of multiPolygon) {

        const [outerRing, ...holes] = polygon;

        let polygonArea = calculateRingArea(outerRing);

        for (const hole of holes) {

            polygonArea -= calculateRingArea(hole);
        }

        totalArea += polygonArea;
    }

    return totalArea;
};


// Convert our boundary into a closed polygon ring.
const toPolygonRing = (boundary) => {

    const ring = boundary.map(point => [
        point.x,
        point.y
    ]);

    // Close the polygon ring.
    ring.push([...ring[0]]);

    return ring;
};


// Convert a polygon ring back into our coordinate format.
const fromPolygonRing = (ring) => {

    // polygon-clipping returns closed rings.
    // Remove the repeated closing point.
    return ring.slice(0, -1).map(([x, y]) => ({
        x,
        y
    }));
};


// Convert the result into buildable regions.
const formatBuildableRegions = (multiPolygon) => {

    return multiPolygon.map(polygon => {

        const [outerRing, ...holes] = polygon;

        return {
            boundary: fromPolygonRing(outerRing),

            holes: holes.map(fromPolygonRing),

            area: calculateMultiPolygonArea([polygon])
        };
    });
};


// Calculate the inward-facing unit normal of an edge.
const calculateInwardNormal = (edge, orientation) => {

    const { start, end, length } = edge;

    const dx = end.x - start.x;
    const dy = end.y - start.y;

    if (orientation === "counterclockwise") {

        return {
            x: -dy / length,
            y: dx / length
        };
    }

    return {
        x: dy / length,
        y: -dx / length
    };
};

// Create a conservative polygon approximation of a circle.
const createCircleRing = (center, radius, segments = 64) => {

    const ring = [];

    // Circumscribed polygon:
    // avoids underestimating the required setback.
    const adjustedRadius =
        radius / Math.cos(Math.PI / segments);

    for (let i = 0; i < segments; i++) {

        const angle =
            (2 * Math.PI * i) / segments +
            Math.PI / segments;

        ring.push([
            center.x + adjustedRadius * Math.cos(angle),
            center.y + adjustedRadius * Math.sin(angle)
        ]);
    }

    ring.push([...ring[0]]);

    return ring;
};


// Create the restricted region around a boundary edge.
const createSetbackRegion = (
    edge,
    distance,
    orientation
) => {

    const { start, end } = edge;

    const normal = calculateInwardNormal(
        edge,
        orientation
    );

    const offsetX = normal.x * distance;
    const offsetY = normal.y * distance;

    const rectangle = [

        [start.x + offsetX, start.y + offsetY],

        [end.x + offsetX, end.y + offsetY],

        [end.x - offsetX, end.y - offsetY],

        [start.x - offsetX, start.y - offsetY]
    ];

    rectangle.push([...rectangle[0]]);

    const startCircle = createCircleRing(
        start,
        distance
    );

    const endCircle = createCircleRing(
        end,
        distance
    );

    return polygonClipping.union(
        [rectangle],
        [startCircle],
        [endCircle]
    );
};


const calculateBuildableArea = (input = {}) => {

    // 1. Validate the original plot geometry.
    const geometry = validatePlotGeometry(input);

    if (!geometry.isValid) {

        return {
            isValid: false,
            errors: geometry.errors
        };
    }

    const {
        boundary,
        setbacks = []
    } = input;

    const {
        area: plotArea,
        orientation,
        boundaryEdges
    } = geometry;


    // 2. Convert the original plot into a MultiPolygon.
    const plotRing = toPolygonRing(boundary);

    let buildableGeometry = [[plotRing]];


    // 3. Create a lookup map for setback distances.
    const setbackMap = new Map();

    for (const setback of setbacks) {

        setbackMap.set(
            setback.edgeIndex,
            setback.distance
        );
    }


    // 4. Subtract restricted setback regions.
    for (const edge of boundaryEdges) {

        const distance =
            setbackMap.get(edge.edgeIndex) ?? 0;

        // No setback required for this edge.
        if (distance === 0) {

            continue;
        }

        const restrictedRegion = createSetbackRegion(
            edge,
            distance,
            orientation
        );

        buildableGeometry = polygonClipping.difference(
            buildableGeometry,
            restrictedRegion
        );

        // Stop if the setbacks eliminate the entire plot.
        if (buildableGeometry.length === 0) {

            break;
        }
    }


    // 5. Calculate the remaining buildable area.
    const buildableArea = calculateMultiPolygonArea(
        buildableGeometry
    );


    // 6. Check whether usable land remains.
    if (buildableArea <= EPSILON) {

        return {
            isValid: false,

            errors: [
                "The provided setbacks leave no buildable area."
            ],

            plotArea,

            buildableArea: 0,

            setbackArea: plotArea,

            buildablePercentage: 0,

            buildableRegions: []
        };
    }


    // 7. Format the resulting buildable regions.
    const buildableRegions = formatBuildableRegions(
        buildableGeometry
    );


    // 8. Calculate setback area and usable percentage.
    const setbackArea = Math.max(
        0,
        plotArea - buildableArea
    );

    const buildablePercentage =
        (buildableArea / plotArea) * 100;


    // 9. Return the final result.
    return {

        isValid: true,

        errors: [],

        plotArea,

        buildableArea,

        setbackArea,

        buildablePercentage,

        buildableRegions
    };
};


export {
    calculateBuildableArea
};