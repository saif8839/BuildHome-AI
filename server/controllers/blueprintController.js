
import Blueprint from "../models/blueprintModel.js";
import { validatePlotGeometry } from "../services/plotGeometryService.js";

const createBlueprint = async (req, res) => {

    // 1. Validate request body
    if (
        !req.body ||
        typeof req.body !== "object" ||
        Array.isArray(req.body)
    ) {
        return res.status(400).json({
            message: "Request body must be a valid object."
        });
    }

    // 2. Extract blueprint details
    const {
        title,
        buildingType,
        plot,
        setbacks,
        requirements,
        vastu,
        preferences,
        jurisdiction
    } = req.body;

    // 3. Validate required fields
    if (!buildingType || !plot || !requirements) {
        return res.status(400).json({
            message: "Building type, plot details and requirements are required."
        });
    }

    // 4. Validate plot object
    if (
        typeof plot !== "object" ||
        plot === null ||
        Array.isArray(plot)
    ) {
        return res.status(400).json({
            message: "Plot must be a valid object."
        });
    }

    // 5. Validate building type
    const allowedBuildingTypes = [
        "residential",
        "educational",
        "office",
        "commercial",
        "healthcare",
        "hospitality",
        "industrial",
        "mixed_use",
        "other"
    ];

    if (!allowedBuildingTypes.includes(buildingType)) {
        return res.status(400).json({
            message: "Invalid building type."
        });
    }

    // 6. Validate plot structure
    if (
        !Array.isArray(plot.boundary) ||
        !Number.isInteger(plot.roadEdgeIndex) ||
        (
            plot.unit !== undefined &&
            !["ft", "m"].includes(plot.unit)
        )
    ) {
        return res.status(400).json({
            message: "Please provide valid plot boundary, road edge and measurement unit."
        });
    }

    // 7. Validate setbacks array
    if (
        setbacks !== undefined &&
        !Array.isArray(setbacks)
    ) {
        return res.status(400).json({
            message: "Setbacks must be provided as an array."
        });
    }

    // 8. Validate plot geometry
    const geometryResult = validatePlotGeometry({
        boundary: plot.boundary,
        roadEdgeIndex: plot.roadEdgeIndex,
        setbacks: setbacks ?? []
    });

    if (!geometryResult.isValid) {
        return res.status(400).json({
            message: "Invalid plot geometry.",
            errors: geometryResult.errors
        });
    }

    // 9. Validate requirements object
    if (
        typeof requirements !== "object" ||
        requirements === null ||
        Array.isArray(requirements)
    ) {
        return res.status(400).json({
            message: "Requirements must be a valid object."
        });
    }

    // Validate floors
    if (
        requirements.floors !== undefined &&
        (
            !Number.isInteger(requirements.floors) ||
            requirements.floors < 1 ||
            requirements.floors > 100
        )
    ) {
        return res.status(400).json({
            message: "Floors must be an integer between 1 and 100."
        });
    }

    // Validate occupancy
    if (
        requirements.totalOccupancy !== undefined &&
        (
            !Number.isInteger(requirements.totalOccupancy) ||
            requirements.totalOccupancy < 0
        )
    ) {
        return res.status(400).json({
            message: "Total occupancy must be a non-negative integer."
        });
    }

    // Validate spaces array
    if (
        requirements.spaces !== undefined &&
        !Array.isArray(requirements.spaces)
    ) {
        return res.status(400).json({
            message: "Spaces must be provided as an array."
        });
    }

    const totalFloors = requirements.floors ?? 1;

    // Validate individual spaces
    if (requirements.spaces) {
        for (const [index, space] of requirements.spaces.entries()) {

            if (
                typeof space !== "object" ||
                space === null ||
                Array.isArray(space)
            ) {
                return res.status(400).json({
                    message: `Space at index ${index} must be a valid object.`
                });
            }

            // Validate spaceType
            if (
                typeof space.spaceType !== "string" ||
                !space.spaceType.trim() ||
                space.spaceType.trim().length > 100
            ) {
                return res.status(400).json({
                    message: `Space at index ${index} must have a valid spaceType of at most 100 characters.`
                });
            }

            // Validate quantity
            if (
                !Number.isInteger(space.quantity) ||
                space.quantity < 1 ||
                space.quantity > 200
            ) {
                return res.status(400).json({
                    message: `Quantity for space at index ${index} must be between 1 and 200.`
                });
            }

            // Validate capacity
            if (
                space.capacity !== undefined &&
                (
                    !Number.isInteger(space.capacity) ||
                    space.capacity < 1
                )
            ) {
                return res.status(400).json({
                    message: `Capacity for space at index ${index} must be a positive integer.`
                });
            }

            // Validate minimum area
            if (
                space.minimumArea !== undefined &&
                (
                    typeof space.minimumArea !== "number" ||
                    !Number.isFinite(space.minimumArea) ||
                    space.minimumArea < 0
                )
            ) {
                return res.status(400).json({
                    message: `Minimum area for space at index ${index} must be a non-negative number.`
                });
            }

            // Validate preferred floor
            if (
                space.preferredFloor !== undefined &&
                (
                    !Number.isInteger(space.preferredFloor) ||
                    space.preferredFloor < 0 ||
                    space.preferredFloor >= totalFloors
                )
            ) {
                return res.status(400).json({
                    message: `Preferred floor for space at index ${index} must be within the building's floor range.`
                });
            }

            // Validate notes
            if (
                space.notes !== undefined &&
                (
                    typeof space.notes !== "string" ||
                    space.notes.length > 500
                )
            ) {
                return res.status(400).json({
                    message: `Notes for space at index ${index} must be a string of at most 500 characters.`
                });
            }
        }
    }

    // Validate special requirements
    if (
        requirements.specialRequirements !== undefined &&
        (
            typeof requirements.specialRequirements !== "string" ||
            requirements.specialRequirements.length > 2000
        )
    ) {
        return res.status(400).json({
            message: "Special requirements must be a string of at most 2000 characters."
        });
    }

    // 10. Validate Vastu object
    if (
        vastu !== undefined &&
        (
            typeof vastu !== "object" ||
            vastu === null ||
            Array.isArray(vastu)
        )
    ) {
        return res.status(400).json({
            message: "Vastu preferences must be a valid object."
        });
    }

    if (vastu) {

        // Validate enabled
        if (
            vastu.enabled !== undefined &&
            typeof vastu.enabled !== "boolean"
        ) {
            return res.status(400).json({
                message: "Vastu enabled must be a boolean."
            });
        }

        // Validate priority
        const allowedPriorities = [
            "flexible",
            "balanced",
            "high"
        ];

        if (
            vastu.priority !== undefined &&
            !allowedPriorities.includes(vastu.priority)
        ) {
            return res.status(400).json({
                message: "Invalid Vastu priority."
            });
        }

        // Validate spacePreferences array
        if (
            vastu.spacePreferences !== undefined &&
            !Array.isArray(vastu.spacePreferences)
        ) {
            return res.status(400).json({
                message: "Vastu spacePreferences must be an array."
            });
        }

        // Validate individual Vastu preferences
        if (vastu.spacePreferences) {

            const allowedDirections = [
                "north",
                "northeast",
                "east",
                "southeast",
                "south",
                "southwest",
                "west",
                "northwest"
            ];

            for (const [index, preference] of vastu.spacePreferences.entries()) {

                // Validate preference object
                if (
                    typeof preference !== "object" ||
                    preference === null ||
                    Array.isArray(preference)
                ) {
                    return res.status(400).json({
                        message: `Vastu preference at index ${index} must be a valid object.`
                    });
                }

                // Validate spaceType
                if (
                    typeof preference.spaceType !== "string" ||
                    !preference.spaceType.trim() ||
                    preference.spaceType.trim().length > 100
                ) {
                    return res.status(400).json({
                        message: `Vastu preference at index ${index} must have a valid spaceType of at most 100 characters.`
                    });
                }

                // Validate preferred direction
                if (
                    !allowedDirections.includes(preference.preferredDirection)
                ) {
                    return res.status(400).json({
                        message: `Invalid preferred direction at Vastu preference index ${index}.`
                    });
                }
            }
        }
    }

    // 11. Validate general preferences
    if (
        preferences !== undefined &&
        (
            typeof preferences !== "string" ||
            !preferences.trim() ||
            preferences.length > 1000
        )
    ) {
        return res.status(400).json({
            message: "Preferences must be a non-empty string of at most 1000 characters."
        });
    }

    // 12. Validate title
    if (
        title !== undefined &&
        (
            typeof title !== "string" ||
            !title.trim() ||
            title.trim().length > 100
        )
    ) {
        return res.status(400).json({
            message: "Title must be a non-empty string of at most 100 characters."
        });
    }

    // 13. Validate jurisdiction object
    if (
        jurisdiction !== undefined &&
        (
            typeof jurisdiction !== "object" ||
            jurisdiction === null ||
            Array.isArray(jurisdiction)
        )
    ) {
        return res.status(400).json({
            message: "Jurisdiction must be a valid object."
        });
    }

    // Validate jurisdiction fields
    if (jurisdiction) {

        const jurisdictionFields = [
            "country",
            "state",
            "city"
        ];

        for (const field of jurisdictionFields) {

            if (
                jurisdiction[field] !== undefined &&
                (
                    typeof jurisdiction[field] !== "string" ||
                    !jurisdiction[field].trim() ||
                    jurisdiction[field].trim().length > 100
                )
            ) {
                return res.status(400).json({
                    message: `${field} must be a non-empty string of at most 100 characters.`
                });
            }
        }
    }

    // 14. Create blueprint document
    const blueprint = await Blueprint.create({
        user: req.user._id,
        title: title?.trim(),
        buildingType,
        plot,
        setbacks: setbacks ?? [],
        requirements,
        vastu,
        preferences: preferences?.trim(),
        jurisdiction
    });

    // 15. Send response
    return res.status(201).json({
        message: "Blueprint created successfully.",
        blueprint
    });
};

const blueprintController = {createBlueprint}

export default blueprintController
