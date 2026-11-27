
const EPSILON = 1e-9;

// Check whether a coordinate point contains valid numbers.
const isValidPoint = (point) => {
    return (
        point &&
        typeof point === "object" &&
        !Array.isArray(point) &&
        Number.isFinite(point.x) &&
        Number.isFinite(point.y)
    );
};


// Check whether two points have effectively identical coordinates.
const arePointsEqual = (a, b) => {
    return (
        Math.abs(a.x - b.x) < EPSILON &&
        Math.abs(a.y - b.y) < EPSILON
    );
};


// Calculate the cross product to determine orientation.
const crossProduct = (a, b, c) => {
    return (
        (b.x - a.x) * (c.y - a.y) -
        (b.y - a.y) * (c.x - a.x)
    );
};


// Check whether a point lies on a line segment.
const isPointOnSegment = (point, start, end) => {

    const withinX =
        point.x >= Math.min(start.x, end.x) - EPSILON &&
        point.x <= Math.max(start.x, end.x) + EPSILON;

    const withinY =
        point.y >= Math.min(start.y, end.y) - EPSILON &&
        point.y <= Math.max(start.y, end.y) + EPSILON;

    return (
        Math.abs(crossProduct(start, end, point)) < EPSILON &&
        withinX &&
        withinY
    );
};


// Check whether two line segments intersect.
const doSegmentsIntersect = (p1, p2, p3, p4) => {

    const o1 = crossProduct(p1, p2, p3);
    const o2 = crossProduct(p1, p2, p4);
    const o3 = crossProduct(p3, p4, p1);
    const o4 = crossProduct(p3, p4, p2);

    const oppositeSigns = (a, b) =>
        (a > EPSILON && b < -EPSILON) ||
        (a < -EPSILON && b > EPSILON);

    // General intersection.
    if (
        oppositeSigns(o1, o2) &&
        oppositeSigns(o3, o4)
    ) {
        return true;
    }

    // Collinear points and touching segments.
    if (
        Math.abs(o1) < EPSILON &&
        isPointOnSegment(p3, p1, p2)
    ) {
        return true;
    }

    if (
        Math.abs(o2) < EPSILON &&
        isPointOnSegment(p4, p1, p2)
    ) {
        return true;
    }

    if (
        Math.abs(o3) < EPSILON &&
        isPointOnSegment(p1, p3, p4)
    ) {
        return true;
    }

    if (
        Math.abs(o4) < EPSILON &&
        isPointOnSegment(p2, p3, p4)
    ) {
        return true;
    }

    return false;
};


// Check whether two adjacent edges overlap beyond their shared endpoint.
const doAdjacentEdgesOverlap = (previous, shared, next) => {

    if (
        Math.abs(crossProduct(previous, shared, next)) >= EPSILON
    ) {
        return false;
    }

    // Normal straight continuation is valid.
    // Backtracking causes one endpoint to lie on the other segment.
    return (
        isPointOnSegment(previous, shared, next) ||
        isPointOnSegment(next, previous, shared)
    );
};


// Calculate polygon area using the Shoelace formula.
const calculatePolygonArea = (points) => {

    let signedArea = 0;

    for (let i = 0; i < points.length; i++) {

        const current = points[i];
        const next = points[(i + 1) % points.length];

        signedArea +=
            current.x * next.y -
            next.x * current.y;
    }

    signedArea /= 2;

    return {
        area: Math.abs(signedArea),
        signedArea,
        orientation:
            signedArea > EPSILON
                ? "counterclockwise"
                : signedArea < -EPSILON
                    ? "clockwise"
                    : "degenerate"
    };
};


// Calculate the distance between two points.
const calculateDistance = (pointA, pointB) => {

    const deltaX = pointB.x - pointA.x;
    const deltaY = pointB.y - pointA.y;

    return Math.hypot(deltaX, deltaY);
};


// Validate the polygon boundary.
const validatePolygonBoundary = (boundary) => {

    const errors = [];

    if (!Array.isArray(boundary) || boundary.length < 3) {
        return {
            isValid: false,
            errors: [
                "A plot must have at least 3 boundary points."
            ]
        };
    }

    // 1. Validate coordinate values.
    if (!boundary.every(isValidPoint)) {
        return {
            isValid: false,
            errors: [
                "Every boundary point must have valid numeric x and y coordinates."
            ]
        };
    }

    const pointCount = boundary.length;

    // 2. Check duplicate points.
    for (let i = 0; i < pointCount; i++) {

        for (let j = i + 1; j < pointCount; j++) {

            if (arePointsEqual(boundary[i], boundary[j])) {
                errors.push(
                    `Boundary points ${i} and ${j} are identical.`
                );
            }
        }
    }

    if (errors.length > 0) {
        return {
            isValid: false,
            errors
        };
    }

    // 3. Calculate polygon area.
    const {
        area,
        signedArea,
        orientation
    } = calculatePolygonArea(boundary);

    if (
        !Number.isFinite(area) ||
        !Number.isFinite(signedArea)
    ) {
        return {
            isValid: false,
            errors: [
                "Plot coordinates are too large to calculate a valid area."
            ]
        };
    }

    if (area < EPSILON) {
        errors.push(
            "Plot boundary must have a non-zero area."
        );
    }

    // 4. Check overlapping adjacent edges.
    for (let i = 0; i < pointCount; i++) {

        const previous = boundary[
            (i - 1 + pointCount) % pointCount
        ];

        const shared = boundary[i];

        const next = boundary[
            (i + 1) % pointCount
        ];

        if (
            doAdjacentEdgesOverlap(
                previous,
                shared,
                next
            )
        ) {
            const previousEdge =
                (i - 1 + pointCount) % pointCount;

            const currentEdge = i;

            errors.push(
                `Boundary edges ${previousEdge} and ${currentEdge} overlap.`
            );
        }
    }

    // 5. Check for self-intersecting non-adjacent edges.
    for (let i = 0; i < pointCount; i++) {

        const p1 = boundary[i];
        const p2 = boundary[(i + 1) % pointCount];

        for (let j = i + 1; j < pointCount; j++) {

            const p3 = boundary[j];
            const p4 = boundary[(j + 1) % pointCount];

            // Adjacent edges share an endpoint.
            // Their overlapping case was checked separately above.
            const areAdjacent =
                (i + 1) % pointCount === j ||
                (j + 1) % pointCount === i;

            if (areAdjacent) {
                continue;
            }

            if (doSegmentsIntersect(p1, p2, p3, p4)) {
                errors.push(
                    `Boundary edges ${i} and ${j} intersect.`
                );
            }
        }
    }

    // 6. Calculate edge lengths and perimeter.
    const boundaryEdges = [];

    let perimeter = 0;

    for (let i = 0; i < pointCount; i++) {

        const start = boundary[i];
        const end = boundary[(i + 1) % pointCount];

        const length = calculateDistance(start, end);

        if (!Number.isFinite(length)) {
            errors.push(
                `Invalid edge length for boundary edge ${i}.`
            );
            continue;
        }

        boundaryEdges.push({
            edgeIndex: i,
            start,
            end,
            length
        });

        perimeter += length;
    }

    if (!Number.isFinite(perimeter)) {
        errors.push(
            "Plot perimeter is too large to calculate."
        );
    }

    return {
        isValid: errors.length === 0,
        errors,
        area,
        signedArea,
        orientation,
        perimeter,
        boundaryEdges
    };
};


// Validate road-facing edge and setbacks.
const validatePlotGeometry = (input = {}) => {

    // Safely handle missing or malformed input.
    const safeInput =
        input &&
        typeof input === "object" &&
        !Array.isArray(input)
            ? input
            : {};

    const {
        boundary,
        roadEdgeIndex,
        setbacks = []
    } = safeInput;

    const geometry = validatePolygonBoundary(boundary);

    const errors = [...geometry.errors];

    const edgeCount = Array.isArray(boundary)
        ? boundary.length
        : 0;

    // 1. Validate road-facing edge.
    if (
        !Number.isInteger(roadEdgeIndex) ||
        roadEdgeIndex < 0 ||
        roadEdgeIndex >= edgeCount
    ) {
        errors.push(
            "Invalid road-facing edge index."
        );
    }

    // 2. Validate setbacks.
    if (!Array.isArray(setbacks)) {

        errors.push(
            "Setbacks must be provided as an array."
        );

    } else {

        const usedEdges = new Set();

        setbacks.forEach((setback, index) => {

            if (
                !setback ||
                typeof setback !== "object" ||
                Array.isArray(setback)
            ) {
                errors.push(
                    `Invalid setback at position ${index}.`
                );
                return;
            }

            const { edgeIndex, distance } = setback;

            if (
                !Number.isInteger(edgeIndex) ||
                edgeIndex < 0 ||
                edgeIndex >= edgeCount
            ) {
                errors.push(
                    `Invalid edgeIndex in setback at position ${index}.`
                );
                return;
            }

            if (usedEdges.has(edgeIndex)) {
                errors.push(
                    `Duplicate setback provided for edge ${edgeIndex}.`
                );
            }

            usedEdges.add(edgeIndex);

            if (
                !Number.isFinite(distance) ||
                distance < 0
            ) {
                errors.push(
                    `Invalid setback distance for edge ${edgeIndex}.`
                );
            }
        });
    }

    return {
        ...geometry,
        isValid: errors.length === 0,
        errors
    };
};


export {
    validatePolygonBoundary,
    validatePlotGeometry
};
