# BuildHome-AI 🏗️

**An AI-powered construction marketplace and smart home-design platform.**

BuildHome-AI brings construction-material shopping and early-stage house planning into one platform. Customers can explore building materials from multiple vendors, manage purchases, and create a house layout from their plot dimensions and space requirements. The blueprint workflow turns a structured floor-plan design into a visual 2D plan and a 3D house model.

> **Project documentation note:** This README describes the intended, completed product experience and target repository architecture. The codebase is being developed incrementally, so some frontend and AI blueprint modules shown below represent the final architecture rather than folders that already exist in every branch. Live payment and AI provider integrations also require their respective credentials.

---

## Table of Contents

- [Project Overview](#project-overview)
- [The Idea Behind BuildHome-AI](#the-idea-behind-buildhome-ai)
- [Key Features](#key-features)
- [How Blueprint Generation Works](#how-blueprint-generation-works)
- [Technology Stack](#technology-stack)
- [System Architecture](#system-architecture)
- [Target Project Structure](#target-project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Running the Application](#running-the-application)
- [Core Workflows](#core-workflows)
- [Engineering Notes](#engineering-notes)
- [Future Enhancements](#future-enhancements)
- [Disclaimer](#disclaimer)

---

## Project Overview

Planning a house and purchasing construction materials often involve separate tools, vendors, and workflows. BuildHome-AI aims to connect these activities in one application.

The platform has two major parts:

1. **BuildMart — Construction Marketplace:** A multi-vendor e-commerce platform for discovering and purchasing construction materials.
2. **AI Home Designer — Blueprint Generation:** A guided design workflow that uses plot measurements and user requirements to create a structured 2D floor plan and a corresponding 3D house visualization.

The blueprint is represented as structured layout data, not merely as a generated picture. This allows the application to validate dimensions, render a scale-aware floor plan, and use the same layout as the basis for 3D geometry and later material estimation.

## The Idea Behind BuildHome-AI

The idea behind BuildHome-AI is to bring two activities that usually happen separately—planning a home and sourcing the materials needed to build it—into one connected platform.

Someone who wants to build a house often has to coordinate several different steps: understand what can fit on their plot, discuss a possible floor plan, visualise the proposed house, find construction-material suppliers, compare products, and arrange purchases. BuildHome-AI aims to make that journey easier to manage from one place.

A customer starts by entering the plot size, road direction, preferred number of floors, rooms, and other requirements. The home-design module uses those details to prepare a **conceptual 2D floor-plan proposal**. After the layout is checked and accepted by the application, the same structured design can be used to create a **3D visualisation** so the customer can better understand the proposed spaces and house form.

The construction-material marketplace complements this design experience. Customers can explore products from multiple vendors, compare available options, and purchase materials through the platform. Over time, the saved house design can also provide context for material planning—for example, producing indicative material lists or quantity estimates that customers can review before shopping.

The central goal is therefore not just to build another e-commerce website or another floor-plan generator. It is to connect **plot planning → home visualisation → construction-material discovery and purchasing** in one workflow, while giving vendors a dedicated place to list and manage their products.

AI-generated plans and material estimates are intended as early-stage assistance. They do not replace a site survey, architectural design, structural engineering, local approvals, or professional advice before construction.

## Key Features

### 1. Multi-vendor Construction Marketplace

- Customer, vendor, and administrator roles.
- Vendor registration and approval workflow.
- Vendor-specific product management.
- Product categories and product image galleries.
- Cloudinary-based product image storage and replacement.
- Product discovery with search, category and price filters, sorting, and pagination.
- Product ratings and reviews, including purchase-eligibility checks.
- Customer cart and checkout flow.
- Multi-vendor checkout that separates vendor orders while keeping them associated with a shared checkout.
- Inventory reservation and reservation-expiry handling.
- Cash on Delivery and a simulated online-payment lifecycle.
- Order status tracking, cancellation handling, and refund workflow records.
- Vendor order management and customer order history.
- Coupon management.

### 2. AI-powered 2D Blueprint Generation

Customers provide information about the land and the type of home they want to design. The application uses those inputs to create a structured floor-plan proposal.

Typical inputs include:

- Plot width and depth, with a selected measurement unit.
- Road-facing direction and entrance preference.
- Number of floors.
- Required bedrooms and bathrooms.
- Kitchen, living room, dining area, utility space, and parking requirements.
- Optional spaces such as balconies, study rooms, or storage areas.
- Additional layout preferences and constraints.

The generated layout contains room positions and dimensions, along with the information required to represent walls, doors, windows, and circulation areas.

### 3. Blueprint Validation and 2D Visualization

- Validate that room boundaries stay within the usable plot area.
- Detect overlapping room regions and invalid dimensions.
- Apply layout constraints before accepting a generated plan.
- Render the accepted layout as a clean, scale-aware 2D floor plan using SVG or Canvas.
- Display room names, dimensions, doors, windows, and orientation.
- Save designs so users can revisit or revise them.

AI-generated layouts are proposals. They must pass application-level geometric checks, and they are not treated as construction-ready drawings without professional review.

### 4. 3D House Visualization

The 3D view is derived from the validated 2D layout so that both views use the same room dimensions and positions.

- Generate floors and walls from room geometry.
- Represent doors and windows as openings or 3D components.
- Apply configurable wall heights and floor levels.
- Allow users to inspect the house from different angles.
- Export or store a 3D model in a browser-friendly format such as GLB when supported by the implementation.

### 5. Construction-material Planning

The structured design can serve as the foundation for future material estimates, such as approximate quantities of bricks, cement, steel, tiles, and paint. Estimates must state their assumptions and should be reviewed by qualified professionals before purchase or construction.

---

## How Blueprint Generation Works

The blueprint workflow separates AI reasoning from geometric validation and rendering.

```text
User enters plot and house requirements
                 |
                 v
        React design form
                 |
                 v
       Express blueprint API
                 |
                 v
      AI layout-generation service
                 |
                 v
       Structured layout JSON
                 |
                 v
       Layout validation engine
          |              |
       Invalid          Valid
          |              |
   Return feedback       v
                  Save layout in MongoDB
                          |
              +-----------+-----------+
              |                       |
              v                       v
       2D SVG renderer          3D model builder
              |                       |
              v                       v
       Editable floor plan     Interactive house view
```

### Why structured layout data?

An image-generation model can produce an attractive floor-plan image, but the pixels alone do not reliably provide exact room dimensions, wall positions, or usable geometry. BuildHome-AI therefore uses structured room data as the source of truth.

A simplified room object may look like this:

```json
{
  "name": "Living Room",
  "position": {
    "x": 0,
    "y": 0
  },
  "dimensions": {
    "width": 14,
    "depth": 15,
    "unit": "ft"
  }
}
```

The backend validates the layout, while the frontend renders it. The same validated data can then be used to construct the 3D representation.

---

## Technology Stack

| Area | Technology | Responsibility |
|---|---|---|
| Frontend | React | Application interface and interactive user experience |
| Styling | Tailwind CSS | Responsive UI styling |
| Client state | Redux Toolkit | Shared application state |
| Backend | Node.js | Server-side JavaScript runtime |
| API | Express.js | REST API and request handling |
| Database | MongoDB | Application and blueprint data storage |
| ODM | Mongoose | Schemas, validation, relationships, and database operations |
| Authentication | JSON Web Token (JWT) | Authenticated API access |
| Password security | bcrypt | Password hashing |
| File uploads | Multer | Multipart file handling |
| Image storage | Cloudinary | Product image hosting and asset management |
| 2D visualization | SVG / Canvas | Scale-aware floor-plan rendering |
| 3D visualization | Three.js | Browser-based 3D house rendering |
| AI integration | Provider-based AI service | Structured layout proposals and optional visual-generation tasks |

AI providers are kept behind backend service functions so the application can change providers without coupling the frontend or blueprint data model to one vendor.

---

## System Architecture

BuildHome-AI follows a client-server architecture:

- **React client:** Handles authentication, marketplace pages, vendor tools, blueprint input forms, 2D plan viewing, and 3D visualization.
- **Express API:** Handles authorization, validation, marketplace operations, blueprint requests, and communication with external services.
- **MongoDB:** Stores users, vendors, products, carts, orders, payments, reviews, and saved blueprint projects.
- **Cloudinary:** Stores product images and their associated public IDs.
- **AI service layer:** Sends validated requirements to the selected AI provider and converts the response into the application's expected layout format.
- **Rendering layer:** Draws the validated layout in 2D and constructs its corresponding 3D representation.

Secrets and provider credentials remain on the server and are never exposed in frontend code.

---

## Target Project Structure

The following tree represents the intended full-stack structure after the frontend and blueprint modules are integrated. Existing backend areas are retained, while the `client/` and blueprint-specific modules represent the completed application architecture.

```text
BuildHome-AI/
│
├── client/                           # React frontend
│   ├── public/
│   └── src/
│       ├── app/                       # App configuration and routing
│       ├── components/
│       │   ├── common/                # Reusable UI components
│       │   ├── products/              # Product cards, gallery, filters
│       │   ├── vendor/                # Vendor dashboard components
│       │   └── blueprint/             # Blueprint canvas and controls
│       ├── features/
│       │   ├── auth/
│       │   ├── cart/
│       │   ├── products/
│       │   ├── orders/
│       │   ├── vendor/
│       │   └── blueprint/
│       ├── pages/                     # Route-level pages
│       ├── services/                  # API client and service calls
│       ├── store/                     # Redux store
│       ├── hooks/
│       └── utils/
│
├── server/
│   ├── config/                        # Database and provider configuration
│   ├── controllers/                   # Request controllers
│   ├── features/                      # Domain-specific backend features
│   ├── jobs/                          # Scheduled jobs and background tasks
│   ├── middlewares/                   # Authentication, uploads, errors
│   ├── models/                        # Mongoose models
│   ├── routes/                        # Express routes
│   ├── services/                      # Business logic and integrations
│   │   ├── blueprintAIService.js      # AI provider integration
│   │   ├── layoutValidationService.js # Layout and geometry validation
│   │   └── blueprintRenderService.js  # Blueprint conversion utilities
│   ├── seed.js                        # Seed data
│   └── server.js                      # Server entry point
│
├── .env.example                      # Environment variable template
├── .gitignore
├── package.json
├── package-lock.json
└── README.md
```

The exact names of frontend modules and future blueprint service files may evolve as implementation progresses.

---

## Getting Started

### Prerequisites

- Node.js and npm.
- A MongoDB database (local MongoDB or MongoDB Atlas).
- A Cloudinary account for product image uploads.
- AI provider credentials when AI blueprint generation is enabled.

### 1. Clone the repository

```bash
git clone https://github.com/saif8839/BuildHome-AI.git
cd BuildHome-AI
```

### 2. Install backend dependencies

Run this from the repository root:

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file in the repository root. Use the variable names expected by the server configuration. A typical configuration includes:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_long_random_secret

CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

AI_API_KEY=your_ai_provider_api_key
```

Do not commit `.env` or real credentials to GitHub. Keep `.env.example` limited to placeholder values. If a provider uses a different variable name, match the name used by that provider's configuration in the code.

### 4. Start the backend

Development mode:

```bash
npm run dev
```

Production-style start:

```bash
npm start
```

The backend scripts above are defined in the repository's root `package.json`.

### 5. Start the frontend

When the React client is set up, install its dependencies and run the development script defined in `client/package.json`:

```bash
cd client
npm install
npm run dev
```

The frontend development command depends on the client build tool and its configured npm scripts.

---

## Environment Variables

| Variable | Purpose |
|---|---|
| `PORT` | Port used by the Express server |
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret used to sign and verify JWTs |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud identifier |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `AI_API_KEY` | API key for the configured AI provider |

Use the exact names expected by your implementation. Never put private keys in React environment variables that are bundled into the browser.

---

## Core Workflows

### Customer marketplace workflow

1. Register or sign in.
2. Browse construction materials and filter the product catalogue.
3. View product details, vendor information, and customer reviews.
4. Add items to the cart and proceed to checkout.
5. Complete the configured payment flow or select Cash on Delivery.
6. Track order progress and use the available cancellation or refund process where eligible.

### Vendor workflow

1. Register a vendor profile and submit it for approval.
2. After approval, create and manage product listings.
3. Upload product images, which are hosted through Cloudinary.
4. Manage inventory and view vendor-specific orders.
5. Update order status according to the permitted order lifecycle.

### Blueprint workflow

1. Open the home-design section.
2. Enter plot dimensions, orientation, floor count, and room requirements.
3. Submit the request to the blueprint API.
4. Review the generated and validated 2D floor plan.
5. Revise the requirements and generate another proposal when needed.
6. Save the design to the user's account.
7. Open the corresponding 3D house visualization.

---

## Engineering Notes

- **Authorization:** Protected operations must validate the authenticated user, role, and resource ownership on the backend.
- **Inventory:** Stock reservation, expiry, order confirmation, and cancellation must preserve inventory consistency.
- **Payments:** The existing development workflow uses simulated online-payment behaviour and Cash on Delivery. A live payment gateway requires a separate provider integration and verified webhook handling.
- **Images:** Store Cloudinary URLs for display and public IDs for asset replacement or deletion.
- **Blueprint data:** Store dimensions and coordinates in a consistent unit system. Convert units explicitly rather than mixing feet, metres, and pixels.
- **Geometry validation:** AI output must be validated before it is stored or rendered as an accepted plan.
- **AI reliability:** Treat model responses as untrusted input. Validate their structure, numerical ranges, and layout constraints on the server.
- **Long-running generation:** Blueprint generation can take longer than a normal API request. A job-based workflow with a generation status is suitable for production use.

---

## Future Enhancements

- Live payment gateway integration.
- Notifications for order and blueprint status updates.
- More advanced blueprint editing tools.
- Multi-floor 3D visualization and improved material details.
- Material quantity estimation with transparent assumptions.
- Exportable blueprint and 3D project files.
- Automated tests, performance monitoring, and production hardening.

---

## Disclaimer

BuildHome-AI is a software platform for construction-material discovery and conceptual home-design assistance. AI-generated layouts and material estimates are preliminary outputs. They do not replace site surveys, structural calculations, local building-code checks, or drawings prepared and approved by qualified architects and engineers. Users should obtain professional review before using a design for permits, purchasing quantities, or construction.

---

## Author

**Mohammad Saif Ansari**

GitHub: [@saif8839](https://github.com/saif8839)

Repository: [BuildHome-AI](https://github.com/saif8839/BuildHome-AI)
