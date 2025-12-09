# LA Events

## Overview

LA Events is a React Native/Expo mobile application for browsing local events in the Los Angeles area. The app displays events on an interactive map with category filtering, list views, and the ability to favorite events. It's designed as a utility app without authentication requirements.

The project uses a monorepo structure with three main directories:
- `client/` - React Native/Expo mobile frontend
- `server/` - Express.js backend API
- `shared/` - Shared types and database schema

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React Native with Expo SDK 54
- **Navigation**: React Navigation with native stack navigator (stack-only, no tabs)
- **State Management**: React Query for server state, React Context for local state (favorites)
- **Styling**: StyleSheet with a custom theming system supporting light/dark modes
- **Animations**: React Native Reanimated for smooth animations
- **Maps**: react-native-maps for native platforms, web fallback with static display

### Navigation Flow
The app follows a simple stack-based navigation:
1. Map Screen (root) - Full-screen interactive map with event markers
2. Event List Screen - Searchable list view of all events
3. Event Details Modal - Detailed view of selected event
4. Settings Screen - User preferences and avatar selection

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **API Pattern**: RESTful endpoints under `/api/`
- **Data**: Currently uses mock data with Ticketmaster API integration structure in place
- **Storage**: In-memory storage class with interface for future database migration

### Data Layer
- **ORM**: Drizzle ORM configured for PostgreSQL
- **Schema**: Defined in `shared/schema.ts` using Drizzle's pgTable
- **Validation**: Zod schemas generated from Drizzle schemas via drizzle-zod
- **Current State**: Database schema exists but app primarily uses mock data

### Key Design Patterns
- **Path Aliases**: `@/` maps to `client/`, `@shared/` maps to `shared/`
- **Theming**: Centralized color system in `client/constants/theme.ts` with semantic color names
- **Error Handling**: ErrorBoundary component wraps the app with dev-friendly error display
- **Platform Compatibility**: Components handle web/native differences (e.g., KeyboardAwareScrollViewCompat)

## External Dependencies

### Third-Party Services
- **Ticketmaster API**: Event data source (structure in place, requires API key)
- **Expo Location**: Device location services for map centering

### Database
- **PostgreSQL**: Configured via Drizzle ORM, connection string expected in `DATABASE_URL` environment variable

### Key NPM Packages
- **expo**: Core framework for React Native development
- **@tanstack/react-query**: Server state management and caching
- **drizzle-orm**: Type-safe database ORM
- **react-native-maps**: Native map rendering
- **react-native-reanimated**: Animation library
- **@react-native-async-storage/async-storage**: Persistent local storage for favorites

### Environment Variables
- `DATABASE_URL`: PostgreSQL connection string
- `EXPO_PUBLIC_DOMAIN`: API server domain for client requests
- `REPLIT_DEV_DOMAIN`: Development domain for Expo and CORS
- `REPLIT_INTERNAL_APP_DOMAIN`: Production deployment domain