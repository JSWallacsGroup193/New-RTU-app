# HVAC Universal Decoder

## Overview

The HVAC Universal Decoder is a professional web application designed for HVAC technicians to decode manufacturer model numbers and find equivalent Daikin replacement units. The system parses model numbers from various manufacturers (Carrier, Trane, York, Lennox, Goodman, Rheem) and provides detailed specifications along with appropriate Daikin product recommendations based on BTU capacity, system type, voltage, and other technical specifications.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
**Technology Stack**: React with TypeScript, using Vite as the build tool and development server. The UI is built with shadcn/ui components and Radix UI primitives for accessibility and consistency.

**State Management**: TanStack Query (React Query) handles server state management, caching, and API interactions. Local component state is managed with React hooks.

**Styling**: Tailwind CSS with a custom design system following Material Design principles adapted for industrial applications. Features a comprehensive color palette with support for both light and dark themes.

**Component Architecture**: Modular component structure with reusable UI components organized in a hierarchical folder structure. Key components include model input forms, specification cards, replacement grids, and manufacturer badges.

### Backend Architecture
**Server Framework**: Express.js with TypeScript, providing RESTful API endpoints for model decoding and specification searching.

**Service Layer**: Dedicated service classes handle business logic:
- `HVACModelParser`: Parses manufacturer model numbers using regex patterns and lookup tables
- `DaikinMatcher`: Matches parsed models against Daikin product database and provides replacement recommendations

**Caching Strategy**: In-memory caching system (`MemStorage`) stores parsed models and replacement results to improve performance and reduce redundant processing.

**API Design**: RESTful endpoints with request validation using Zod schemas, structured error handling, and consistent response formats.

### Data Storage Solutions
**Database**: PostgreSQL configured through Drizzle ORM with type-safe schema definitions. Tables include HVAC units with comprehensive specifications, manufacturer details, and replacement mappings.

**Schema Design**: Normalized schema with HVAC units table containing manufacturer, model numbers, system types, BTU capacity, voltage, phases, efficiency ratings, and physical specifications.

**Migration Management**: Drizzle Kit handles database migrations and schema changes with version control.

### Authentication and Authorization
Currently implemented as a public tool without authentication requirements, suitable for professional HVAC technician use in field environments.

### External Dependencies
**Database Connection**: Neon Database (PostgreSQL) as the primary data store with connection pooling
**UI Components**: Radix UI primitives for accessible, unstyled components
**Form Handling**: React Hook Form with Hookform Resolvers for form validation
**Validation**: Zod for runtime type checking and schema validation
**Styling**: Tailwind CSS with custom design tokens and theme system
**Development Tools**: ESBuild for production builds, TypeScript for type safety
**Query Management**: TanStack Query for server state management and caching

The architecture emphasizes performance, type safety, and maintainability while providing a professional tool optimized for HVAC technician workflows in both office and field environments.