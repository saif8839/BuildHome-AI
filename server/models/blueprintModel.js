
import mongoose from "mongoose";

const compassDirections = [
    "north",
    "northeast",
    "east",
    "southeast",
    "south",
    "southwest",
    "west",
    "northwest"
];

// Each coordinate represents one corner of the plot.
// X increases towards east; Y increases towards north.
const pointSchema = new mongoose.Schema({
    x: {
        type: Number,
        required: true
    },
    y: {
        type: Number,
        required: true
    }
}, { _id: false });


// Requirements for each type of space in a building.
const spaceSchema = new mongoose.Schema({

    spaceType: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        maxlength: 100
    },

    quantity: {
        type: Number,
        required: true,
        min: 1,
        max: 200,
        validate: Number.isInteger
    },

    capacity: {
        type: Number,
        min: 1,
        validate: Number.isInteger
    },

    minimumArea: {
        type: Number,
        min: 0
    },

    preferredFloor: {
        type: Number,
        min: 0,
        validate: Number.isInteger
    },

    notes: {
        type: String,
        trim: true,
        maxlength: 500
    }

}, { _id: false });


// General building requirements.
const requirementsSchema = new mongoose.Schema({

    floors: {
        type: Number,
        min: 1,
        max: 100,
        default: 1,
        validate: Number.isInteger
    },

    totalOccupancy: {
        type: Number,
        min: 0,
        default: 0,
        validate: Number.isInteger
    },

    spaces: {
        type: [spaceSchema],
        default: []
    },

    specialRequirements: {
        type: String,
        trim: true,
        maxlength: 2000,
        default: ""
    }

}, { _id: false });


// Setback for an individual plot boundary.
const setbackSchema = new mongoose.Schema({

    edgeIndex: {
        type: Number,
        required: true,
        min: 0,
        validate: Number.isInteger
    },

    distance: {
        type: Number,
        required: true,
        min: 0
    }

}, { _id: false });


// Optional Vastu preferences.
const vastuSpacePreferenceSchema = new mongoose.Schema({

    spaceType: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        maxlength: 100
    },

    preferredDirection: {
        type: String,
        enum: compassDirections,
        required: true
    }

}, { _id: false });


const vastuSchema = new mongoose.Schema({

    enabled: {
        type: Boolean,
        default: false
    },

    priority: {
        type: String,
        enum: ["flexible", "balanced", "high"],
        default: "balanced"
    },

    spacePreferences: {
        type: [vastuSpacePreferenceSchema],
        default: []
    }

}, { _id: false });


// Main Blueprint Schema.
const blueprintSchema = new mongoose.Schema({

    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    title: {
        type: String,
        trim: true,
        default: "My Blueprint",
        maxlength: 100
    },

    buildingType: {
        type: String,
        enum: [
            "residential",
            "educational",
            "office",
            "commercial",
            "healthcare",
            "hospitality",
            "industrial",
            "mixed_use",
            "other"
        ],
        required: true
    },

    plot: {

        boundary: {
            type: [pointSchema],
            required: true,
            validate: {
                validator: points =>
                    Array.isArray(points) && points.length >= 3,
                message: "A plot must have at least 3 boundary points."
            }
        },

        unit: {
            type: String,
            enum: ["ft", "m"],
            default: "ft"
        },

        // Index of the boundary edge facing the road.
        roadEdgeIndex: {
            type: Number,
            required: true,
            min: 0,
            validate: Number.isInteger
        }

    },

    // Each setback refers to an edge in plot.boundary.
    setbacks: {
        type: [setbackSchema],
        default: []
    },

    requirements: {
        type: requirementsSchema,
        required: true
    },

    vastu: {
        type: vastuSchema,
        default: () => ({})
    },

    preferences: {
        type: String,
        trim: true,
        maxlength: 1000,
        default: ""
    },

    jurisdiction: {
        country: {
            type: String,
            default: "India",
            trim: true,
            maxlength: 100
        },
        state: {
            type: String,
            trim: true,
            maxlength: 100
        },
        city: {
            type: String,
            trim: true,
            maxlength: 100
        }
    },
    status: {
        type: String,
        enum: [
            "draft",
            "queued",
            "generating",
            "validating",
            "completed",
            "failed"
        ],
        default: "draft"
    },

    generatedLayout: {
        type: mongoose.Schema.Types.Mixed,
        default: null
    },

    validationReport: {
        type: mongoose.Schema.Types.Mixed,
        default: null
    },

    errorMessage: {
        type: String,
        default: null
    }

}, {
    timestamps: true
});


blueprintSchema.index({ user: 1, createdAt: -1 });

const Blueprint = mongoose.model("Blueprint", blueprintSchema);

export default Blueprint;
