const EPSILON = 1e-9;

const DEFAULT_INFRASTRUCTURE_ALLOWANCE = 0.25;


// Check whether a value is a finite non-negative number.
const isNonNegativeNumber = (value) => {

    return (
        typeof value === "number" &&
        Number.isFinite(value) &&
        value >= 0
    );
};


// Round calculated values for reporting.
const roundNumber = (value) => {

    return Number(value.toFixed(6));
};


// Create a standard invalid input response.
const invalidResponse = (errors) => {

    return {
        isValid: false,
        isFeasible: null,
        status: "invalid",
        errors,
        warnings: []
    };
};


// Validate inputs required by the feasibility service.
const validateFeasibilityInput = (
    input,
    infrastructureAllowance
) => {

    const errors = [];

    if (
        !input ||
        typeof input !== "object" ||
        Array.isArray(input)
    ) {
        return ["Feasibility input must be a valid object."];
    }


    const {
        geometry,
        requirements,
        unit = "ft"
    } = input;


    // Validate measurement unit.
    if (!["ft", "m"].includes(unit)) {

        errors.push(
            "Measurement unit must be ft or m."
        );
    }


    // Validate infrastructure allowance.
    if (
        !isNonNegativeNumber(infrastructureAllowance) ||
        infrastructureAllowance >= 1
    ) {

        errors.push(
            "Infrastructure allowance must be between 0 and 1, excluding 1."
        );
    }


    // Validate geometry.
    if (
        !geometry ||
        typeof geometry !== "object" ||
        Array.isArray(geometry)
    ) {

        errors.push(
            "Valid buildable geometry is required."
        );

    } else {

        if (
            !isNonNegativeNumber(geometry.buildableArea) ||
            geometry.buildableArea <= EPSILON
        ) {

            errors.push(
                "Buildable area must be greater than zero."
            );
        }


        // Validate individual buildable regions.
        if (
            !Array.isArray(geometry.buildableRegions) ||
            geometry.buildableRegions.length === 0
        ) {

            errors.push(
                "At least one buildable region is required."
            );

        } else {

            let regionAreaSum = 0;

            for (
                const [index, region]
                of geometry.buildableRegions.entries()
            ) {

                if (
                    !region ||
                    !isNonNegativeNumber(region.area) ||
                    region.area <= EPSILON
                ) {

                    errors.push(
                        `Buildable region ${index} must have a positive area.`
                    );

                    continue;
                }

                regionAreaSum += region.area;
            }


            // Ensure region areas match total buildable area.
            const tolerance = Math.max(
                EPSILON,
                geometry.buildableArea * 1e-8
            );

            if (
                Math.abs(
                    regionAreaSum - geometry.buildableArea
                ) > tolerance
            ) {

                errors.push(
                    "Buildable region areas do not match total buildable area."
                );
            }
        }
    }


    // Validate requirements.
    if (
        !requirements ||
        typeof requirements !== "object" ||
        Array.isArray(requirements)
    ) {

        errors.push(
            "Valid building requirements are required."
        );

        return errors;
    }


    const floors = requirements.floors ?? 1;
    const spaces = requirements.spaces ?? [];


    // Validate floor count.
    if (
        !Number.isInteger(floors) ||
        floors < 1 ||
        floors > 100
    ) {

        errors.push(
            "Floors must be an integer between 1 and 100."
        );
    }


    // Validate spaces.
    if (!Array.isArray(spaces)) {

        errors.push(
            "Requirements spaces must be an array."
        );

        return errors;
    }


    for (const [index, space] of spaces.entries()) {

        if (
            !space ||
            typeof space !== "object" ||
            Array.isArray(space)
        ) {

            errors.push(
                `Space at index ${index} must be a valid object.`
            );

            continue;
        }


        // Validate space type.
        if (
            typeof space.spaceType !== "string" ||
            !space.spaceType.trim()
        ) {

            errors.push(
                `Space at index ${index} requires a valid space type.`
            );
        }


        // Validate quantity.
        if (
            !Number.isInteger(space.quantity) ||
            space.quantity < 1 ||
            space.quantity > 200
        ) {

            errors.push(
                `Space at index ${index} has an invalid quantity.`
            );
        }


        // Minimum area is optional.
        if (
            space.minimumArea !== undefined &&
            !isNonNegativeNumber(space.minimumArea)
        ) {

            errors.push(
                `Space at index ${index} has an invalid minimum area.`
            );
        }


        // Validate preferred floor.
        if (
            space.preferredFloor !== undefined &&
            (
                !Number.isInteger(space.preferredFloor) ||
                space.preferredFloor < 0 ||
                space.preferredFloor >= floors
            )
        ) {

            errors.push(
                `Space at index ${index} has an invalid preferred floor.`
            );
        }
    }

    return errors;
};


// Main feasibility calculation.
const calculateSpaceFeasibility = (
    input = {},
    options = {}
) => {

    const infrastructureAllowance =
        options.infrastructureAllowance ??
        DEFAULT_INFRASTRUCTURE_ALLOWANCE;


    // 1. Validate input.
    const validationErrors = validateFeasibilityInput(
        input,
        infrastructureAllowance
    );

    if (validationErrors.length > 0) {

        return invalidResponse(validationErrors);
    }


    const {
        geometry,
        requirements,
        unit = "ft"
    } = input;


    const floors = requirements.floors ?? 1;
    const spaces = requirements.spaces ?? [];

    const errors = [];
    const warnings = [];

    const areaUnit = unit === "ft" ? "ft²" : "m²";


    // 2. Calculate theoretical floor capacity.
    const buildableArea = geometry.buildableArea;

    const totalFloorArea =
        buildableArea * floors;

    const infrastructureArea =
        totalFloorArea * infrastructureAllowance;

    const usableAreaPerFloor =
        buildableArea * (1 - infrastructureAllowance);

    const totalUsableArea =
        totalFloorArea - infrastructureArea;


    // 3. Analyze buildable regions.
    const regionCapacities =
        geometry.buildableRegions.map(
            (region, regionIndex) => ({

                regionIndex,

                area: region.area,

                estimatedUsableArea:
                    region.area *
                    (1 - infrastructureAllowance)
            })
        );


    const largestRegionArea = Math.max(
        ...regionCapacities.map(region => region.area)
    );

    const largestUsableRegionArea = Math.max(
        ...regionCapacities.map(
            region => region.estimatedUsableArea
        )
    );


    if (regionCapacities.length > 1) {

        warnings.push(
            "The plot contains disconnected buildable regions. " +
            "Connectivity and room placement require further validation."
        );
    }


    // 4. Initialize individual floor reports.
    const floorAnalysis = Array.from(
        { length: floors },

        (_, floorIndex) => ({

            floorIndex,

            grossArea: buildableArea,

            estimatedUsableArea: usableAreaPerFloor,

            preferredSpaceCount: 0,

            preferredRequiredArea: 0
        })
    );


    // 5. Analyze requested spaces.
    let totalRequestedSpaces = 0;

    let totalRequiredArea = 0;

    let unspecifiedAreaSpaceCount = 0;

    let unassignedRequiredArea = 0;

    let unassignedSpaceCount = 0;

    const spaceAnalysis = [];


    for (const space of spaces) {

        const spaceType =
            space.spaceType.trim().toLowerCase();

        const quantity = space.quantity;

        const minimumArea = space.minimumArea ?? 0;

        const preferredFloor =
            space.preferredFloor ?? null;

        const hasMinimumArea =
            minimumArea > 0;


        totalRequestedSpaces += quantity;


        // Missing area does not mean the room needs no space.
        if (!hasMinimumArea) {

            unspecifiedAreaSpaceCount += quantity;

            warnings.push(
                `Minimum area is unspecified for ${quantity} ${spaceType} space(s).`
            );
        }


        const requiredArea =
            minimumArea * quantity;

        totalRequiredArea += requiredArea;


        // A single room cannot span disconnected regions.
        if (
            hasMinimumArea &&
            minimumArea > largestRegionArea + EPSILON
        ) {

            errors.push(
                `A ${spaceType} requires ${minimumArea} ${areaUnit}, ` +
                `but the largest buildable region is only ` +
                `${roundNumber(largestRegionArea)} ${areaUnit}.`
            );

        } else if (
            hasMinimumArea &&
            minimumArea > largestUsableRegionArea + EPSILON
        ) {

            warnings.push(
                `A ${spaceType} exceeds the estimated usable area ` +
                `of the largest buildable region.`
            );
        }


        // Track preferred floor requirements.
        if (preferredFloor !== null) {

            floorAnalysis[preferredFloor]
                .preferredSpaceCount += quantity;

            floorAnalysis[preferredFloor]
                .preferredRequiredArea += requiredArea;

        } else {

            unassignedRequiredArea += requiredArea;

            unassignedSpaceCount += quantity;
        }


        spaceAnalysis.push({

            spaceType,

            quantity,

            minimumArea:
                hasMinimumArea ? minimumArea : null,

            totalMinimumArea: roundNumber(requiredArea),

            preferredFloor,

            hasMinimumArea
        });
    }


    // 6. Check total theoretical capacity.
    if (
        totalRequiredArea >
        totalFloorArea + EPSILON
    ) {

        errors.push(
            `Requested minimum area of ` +
            `${roundNumber(totalRequiredArea)} ${areaUnit} ` +
            `exceeds the total theoretical floor area of ` +
            `${roundNumber(totalFloorArea)} ${areaUnit}.`
        );

    } else if (
        totalRequiredArea >
        totalUsableArea + EPSILON
    ) {

        warnings.push(
            "Requested spaces exceed estimated usable room area " +
            "after the infrastructure allowance."
        );
    }


    // 7. Check individual preferred floors.
    for (const floor of floorAnalysis) {

        if (
            floor.preferredRequiredArea >
            floor.grossArea + EPSILON
        ) {

            warnings.push(
                `Preferred spaces exceed the physical area ` +
                `of floor ${floor.floorIndex}. ` +
                `Some spaces must move to another floor.`
            );

        } else if (
            floor.preferredRequiredArea >
            floor.estimatedUsableArea + EPSILON
        ) {

            warnings.push(
                `Preferred spaces exceed estimated usable area ` +
                `on floor ${floor.floorIndex}.`
            );
        }


        floor.remainingEstimatedArea = roundNumber(

            floor.estimatedUsableArea -
            floor.preferredRequiredArea
        );


        floor.preferredRequiredArea =
            roundNumber(floor.preferredRequiredArea);

        floor.estimatedUsableArea =
            roundNumber(floor.estimatedUsableArea);
    }


    // 8. Check empty requirements.
    if (totalRequestedSpaces === 0) {

        warnings.push(
            "No individual spaces have been specified."
        );
    }


    // 9. Multi-floor assumptions.
    if (floors > 1) {

        warnings.push(
            "Multi-floor capacity assumes the same buildable " +
            "footprint on every floor. Structural and regulatory " +
            "restrictions have not been evaluated."
        );
    }


    // 10. Calculate utilization.
    const grossUtilizationPercentage =
        (totalRequiredArea / totalFloorArea) * 100;

    const usableUtilizationPercentage =
        (totalRequiredArea / totalUsableArea) * 100;

    const remainingUsableArea =
        totalUsableArea - totalRequiredArea;


    // 11. Determine feasibility status.
    let status = "feasible";

    let isFeasible = true;


    if (errors.length > 0) {

        status = "infeasible";

        isFeasible = false;

    } else if (
        unspecifiedAreaSpaceCount > 0 ||
        totalRequestedSpaces === 0
    ) {

        status = "undetermined";

        isFeasible = null;

    } else if (warnings.length > 0) {

        status = "warning";

        isFeasible = null;
    }


    // 12. Return complete feasibility report.
    return {

        isValid: true,

        isFeasible,

        status,

        errors,

        warnings,

        unit,

        areaUnit,

        floors,

        infrastructureAllowance,

        capacity: {

            buildableArea:
                roundNumber(buildableArea),

            totalFloorArea:
                roundNumber(totalFloorArea),

            infrastructureArea:
                roundNumber(infrastructureArea),

            usableAreaPerFloor:
                roundNumber(usableAreaPerFloor),

            totalUsableArea:
                roundNumber(totalUsableArea),

            largestRegionArea:
                roundNumber(largestRegionArea),

            largestUsableRegionArea:
                roundNumber(largestUsableRegionArea)
        },

        requirementsSummary: {

            totalRequestedSpaces,

            totalRequiredArea:
                roundNumber(totalRequiredArea),

            unspecifiedAreaSpaceCount,

            unassignedSpaceCount,

            unassignedRequiredArea:
                roundNumber(unassignedRequiredArea)
        },

        utilization: {

            grossUtilizationPercentage:
                roundNumber(grossUtilizationPercentage),

            usableUtilizationPercentage:
                roundNumber(usableUtilizationPercentage),

            remainingUsableArea:
                roundNumber(remainingUsableArea)
        },

        regionAnalysis: regionCapacities.map(region => ({

            regionIndex: region.regionIndex,

            area: roundNumber(region.area),

            estimatedUsableArea:
                roundNumber(region.estimatedUsableArea)
        })),

        floorAnalysis,

        spaceAnalysis
    };
};


export {
    calculateSpaceFeasibility
};