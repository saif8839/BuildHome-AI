import polygonClipping from "polygon-clipping";

import {
    validatePolygonBoundary
} from "./plotGeometryService.js";

import {
    validateGeneratedLayoutSchema
} from "./aiGenerationService.js";


const EPSILON = 1e-6;


// Normalize space types for comparison.
const normalizeSpaceType = (spaceType) => {

    return spaceType.trim().toLowerCase();
};


// Convert boundary points into a closed polygon ring.
const toPolygonRing = (boundary) => {

    const ring = boundary.map(point => [
        point.x,
        point.y
    ]);

    ring.push([...ring[0]]);

    return ring;
};


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


// Calculate MultiPolygon area, excluding holes.
const calculateMultiPolygonArea = (multiPolygon) => {

    let totalArea = 0;

    for (const polygon of multiPolygon) {

        const [outerRing, ...holes] = polygon;

        let area = calculateRingArea(outerRing);

        for (const hole of holes) {

            area -= calculateRingArea(hole);
        }

        totalArea += area;
    }

    return totalArea;
};


// Convert buildable regions into clipping polygons.
const prepareBuildableRegions = (regions) => {

    return regions.map(region => [

        toPolygonRing(region.boundary),

        ...(region.holes ?? []).map(toPolygonRing)
    ]);
};


// Check whether a space is entirely contained
// within one buildable region.
const isSpaceInsideBuildableRegion = (
    spacePolygon,
    buildableRegions
) => {

    return buildableRegions.some(region => {

        const outsideGeometry =
            polygonClipping.difference(
                spacePolygon,
                region
            );

        const outsideArea =
            calculateMultiPolygonArea(
                outsideGeometry
            );

        return outsideArea <= EPSILON;
    });
};


// Calculate the overlapping area of two spaces.
const calculateOverlapArea = (
    firstPolygon,
    secondPolygon
) => {

    const intersection =
        polygonClipping.intersection(
            firstPolygon,
            secondPolygon
        );

    return calculateMultiPolygonArea(intersection);
};


// Round calculated values for reporting.
const roundArea = (value) => {

    return Number(value.toFixed(6));
};


// Main generated layout validation function.
const validateGeneratedLayout = ({
    blueprint,
    generatedLayout
} = {}) => {

    const errors = [];

    const warnings = [];

    const floorAnalysis = [];

    const spaceAnalysis = [];

    const requirementAnalysis = [];

    const usedSpaceIds = new Set();

    const usedFloorIndexes = new Set();


    // Standard validation report.
    const createReport = () => ({

        isValid: errors.length === 0,

        status: errors.length > 0
            ? "invalid"
            : warnings.length > 0
                ? "valid_with_warnings"
                : "valid",

        errors,

        warnings,

        floorAnalysis,

        spaceAnalysis,

        requirementAnalysis
    });


    // 1. Validate the original blueprint.
    if (
        !blueprint?.plot ||
        !blueprint?.geometry ||
        !blueprint?.requirements
    ) {

        errors.push(
            "Blueprint plot, geometry and requirements are required."
        );

        return createReport();
    }


    // 2. Validate generated JSON structure.
    const schemaValidation =
        validateGeneratedLayoutSchema(
            generatedLayout
        );

    if (!schemaValidation.isValid) {

        errors.push(...schemaValidation.errors);

        return createReport();
    }


    const {
        plot,
        geometry,
        requirements
    } = blueprint;


    const expectedFloors = requirements.floors ?? 1;

    const expectedUnit = plot.unit ?? "ft";


    // 3. Validate measurement units.
    if (generatedLayout.unit !== expectedUnit) {

        errors.push(
            `Expected unit "${expectedUnit}", but received "${generatedLayout.unit}".`
        );
    }


    // 4. Validate floor count.
    if (generatedLayout.floors.length !== expectedFloors) {

        errors.push(
            `Expected ${expectedFloors} floors, but received ${generatedLayout.floors.length}.`
        );
    }


    // 5. Validate buildable region availability.
    if (
        !Array.isArray(geometry.buildableRegions) ||
        geometry.buildableRegions.length === 0 ||
        !Number.isFinite(geometry.buildableArea) ||
        geometry.buildableArea <= 0
    ) {

        errors.push(
            "Blueprint does not contain valid buildable geometry."
        );

        return createReport();
    }


    try {

        const buildableRegions =
            prepareBuildableRegions(
                geometry.buildableRegions
            );


        // 6. Validate each generated floor.
        for (const floor of generatedLayout.floors) {

            const {
                floorIndex,
                spaces
            } = floor;


            if (
                floorIndex < 0 ||
                floorIndex >= expectedFloors
            ) {

                errors.push(
                    `Invalid floor index: ${floorIndex}.`
                );
            }


            if (usedFloorIndexes.has(floorIndex)) {

                errors.push(
                    `Duplicate floor index: ${floorIndex}.`
                );
            }

            usedFloorIndexes.add(floorIndex);


            const validSpaces = [];

            let totalSpaceArea = 0;


            // 7. Validate each space polygon.
            for (const space of spaces) {

                const errorCountBefore = errors.length;

                const spaceLabel =
                    `${space.name} (${space.id})`;


                if (!space.id.trim()) {

                    errors.push(
                        "Space ID cannot be empty."
                    );
                }


                if (usedSpaceIds.has(space.id)) {

                    errors.push(
                        `Duplicate space ID: ${space.id}.`
                    );
                }

                usedSpaceIds.add(space.id);


                if (!space.spaceType.trim()) {

                    errors.push(
                        `${spaceLabel} has an empty space type.`
                    );
                }


                // Reuse existing polygon validation.
                const polygonValidation =
                    validatePolygonBoundary(
                        space.boundary
                    );


                if (!polygonValidation.isValid) {

                    errors.push(

                        ...polygonValidation.errors.map(
                            error =>
                                `${spaceLabel}: ${error}`
                        )
                    );

                    continue;
                }


                const area = polygonValidation.area;


                const spacePolygon = [
                    toPolygonRing(space.boundary)
                ];


                // 8. Check containment and excluded holes.
                const isInside =
                    isSpaceInsideBuildableRegion(
                        spacePolygon,
                        buildableRegions
                    );


                if (!isInside) {

                    errors.push(
                        `${spaceLabel} extends outside a valid buildable region or into an excluded hole.`
                    );
                }


                totalSpaceArea += area;


                const analysis = {

                    id: space.id,

                    name: space.name,

                    spaceType: normalizeSpaceType(
                        space.spaceType
                    ),

                    floorIndex,

                    area: roundArea(area),

                    isInsideBuildableRegion: isInside,

                    isValid:
                        errors.length === errorCountBefore
                };


                spaceAnalysis.push(analysis);


                validSpaces.push({

                    ...analysis,

                    rawArea: area,

                    polygon: spacePolygon,

                    analysis
                });
            }


            // 9. Detect positive-area overlaps.
            for (let i = 0; i < validSpaces.length; i++) {

                for (
                    let j = i + 1;
                    j < validSpaces.length;
                    j++
                ) {

                    const first = validSpaces[i];

                    const second = validSpaces[j];


                    const overlapArea =
                        calculateOverlapArea(
                            first.polygon,
                            second.polygon
                        );


                    if (overlapArea > EPSILON) {

                        errors.push(
                            `${first.name} (${first.id}) overlaps ${second.name} (${second.id}) on floor ${floorIndex} by ${roundArea(overlapArea)} square ${expectedUnit}.`
                        );

                        first.analysis.isValid = false;

                        second.analysis.isValid = false;
                    }
                }
            }


            // Calculate actual occupied footprint.
            // Union prevents double-counting overlaps.
            const occupiedGeometry =
                validSpaces.length > 0

                    ? polygonClipping.union(
                        ...validSpaces.map(
                            space => space.polygon
                        )
                    )

                    : [];


            const occupiedArea =
                calculateMultiPolygonArea(
                    occupiedGeometry
                );


            const utilizationPercentage =
                (occupiedArea / geometry.buildableArea)
                * 100;


            const remainingArea =
                geometry.buildableArea - occupiedArea;


            // Infrastructure is currently a planning
            // estimate rather than a hard constraint.
            const infrastructureAllowance =
                blueprint.feasibilityReport
                    ?.infrastructureAllowance ?? 0.25;


            const estimatedUsableArea =
                geometry.buildableArea *
                (1 - infrastructureAllowance);


            const circulationTypes = new Set([
                "corridor",
                "hallway",
                "circulation",
                "staircase",
                "stairs",
                "foyer"
            ]);


            const nonCirculationArea =
                validSpaces.reduce((total, space) => {

                    return circulationTypes.has(
                        space.spaceType
                    )

                        ? total

                        : total + space.rawArea;

                }, 0);


            if (
                nonCirculationArea >
                estimatedUsableArea + EPSILON
            ) {

                warnings.push(
                    `Floor ${floorIndex} exceeds the estimated usable area allowance.`
                );
            }


            if (remainingArea <= EPSILON) {

                warnings.push(
                    `Floor ${floorIndex} has no unallocated footprint for wall thickness or other infrastructure.`
                );
            }


            floorAnalysis.push({

                floorIndex,

                name: floor.name,

                spaceCount: spaces.length,

                buildableArea: geometry.buildableArea,

                totalSpaceArea: roundArea(totalSpaceArea),

                occupiedArea: roundArea(occupiedArea),

                nonCirculationArea:
                    roundArea(nonCirculationArea),

                estimatedUsableArea:
                    roundArea(estimatedUsableArea),

                remainingArea: roundArea(remainingArea),

                utilizationPercentage:
                    roundArea(utilizationPercentage)
            });
        }


        // 10. Check for missing floor indexes.
        for (let i = 0; i < expectedFloors; i++) {

            if (!usedFloorIndexes.has(i)) {

                errors.push(
                    `Missing required floor index: ${i}.`
                );
            }
        }


        // 11. Validate requested space quantities
        // and individual minimum areas.
        const requestedSpaces =
            requirements.spaces ?? [];


        // Process larger minimum areas first so that
        // smaller requirements do not consume large rooms.
        const sortedRequirements =
            [...requestedSpaces].sort(

                (a, b) =>
                    (b.minimumArea ?? 0) -
                    (a.minimumArea ?? 0)
            );


        const assignedSpaceIds = new Set();


        for (const requirement of sortedRequirements) {

            const spaceType = normalizeSpaceType(
                requirement.spaceType
            );

            const minimumArea =
                requirement.minimumArea ?? 0;

            const preferredFloor =
                requirement.preferredFloor ?? null;


            const matchingSpaces =
                spaceAnalysis.filter(space =>

                    space.isValid &&

                    space.spaceType === spaceType &&

                    !assignedSpaceIds.has(space.id)
                );


            const eligibleSpaces =
                matchingSpaces.filter(space =>

                    space.area + EPSILON >= minimumArea
                );


            // Preferred floor is a flexible preference.
            eligibleSpaces.sort((a, b) => {

                if (preferredFloor !== null) {

                    const aPreferred =
                        a.floorIndex === preferredFloor;

                    const bPreferred =
                        b.floorIndex === preferredFloor;

                    if (aPreferred !== bPreferred) {

                        return aPreferred ? -1 : 1;
                    }
                }

                return a.area - b.area;
            });


            const assignedSpaces =
                eligibleSpaces.slice(
                    0,
                    requirement.quantity
                );


            for (const space of assignedSpaces) {

                assignedSpaceIds.add(space.id);


                if (
                    preferredFloor !== null &&
                    space.floorIndex !== preferredFloor
                ) {

                    warnings.push(
                        `${space.name} is on floor ${space.floorIndex} instead of preferred floor ${preferredFloor}.`
                    );
                }
            }


            const missingQuantity =
                requirement.quantity -
                assignedSpaces.length;


            if (missingQuantity > 0) {

                errors.push(
                    `Required ${requirement.quantity} ${spaceType} space(s) with minimum area ${minimumArea}, but only ${assignedSpaces.length} eligible space(s) could be assigned.`
                );
            }


            requirementAnalysis.push({

                spaceType,

                requiredQuantity: requirement.quantity,

                satisfiedQuantity: assignedSpaces.length,

                missingQuantity,

                minimumArea,

                preferredFloor,

                assignedSpaceIds:
                    assignedSpaces.map(space => space.id),

                isSatisfied: missingQuantity === 0
            });
        }


    } catch (error) {

        errors.push(
            `Layout geometry validation failed: ${error.message}`
        );
    }


    return createReport();
};


export {
    validateGeneratedLayout
};