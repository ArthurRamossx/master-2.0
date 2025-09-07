# Overview

MASTER LEAGUE is a Portuguese-language sports betting web application focused on eFootball 2026. The platform provides a dual-interface system with public betting functionality and administrative controls for managing games and bets. The application uses Firebase Realtime Database for data persistence and features a modern, responsive design with a dark theme.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Single Page Application (SPA)**: Built with vanilla HTML, CSS, and JavaScript
- **Responsive Design**: Mobile-first approach using CSS Grid and Flexbox
- **Modern UI/UX**: Dark theme with gradient backgrounds, glassmorphism effects, and smooth animations
- **State Management**: Client-side state management using JavaScript objects and localStorage for session persistence
- **Internationalization**: Portuguese (pt-BR) language support with Euro currency formatting

## Backend Architecture
- **Flask Web Server**: Minimal Python Flask application serving static files
- **Static File Serving**: Direct file serving for HTML, CSS, and JavaScript assets
- **Development Configuration**: Debug mode enabled with host binding for development environments

## Authentication & Authorization
- **Simple Password-Based Admin Access**: Single admin password (MASTER2025) for administrative functions
- **Session Persistence**: localStorage-based session management for admin access
- **Role-Based UI**: Dynamic interface switching between public and admin views

## Data Architecture
- **Firebase Realtime Database**: Cloud-hosted NoSQL database for real-time data synchronization
- **Real-time Updates**: Live data binding using Firebase observers for instant UI updates
- **Data Models**:
  - Games: Match information with teams, odds, and status
  - Bets: User betting records with amounts and selections
- **Client-Side Data Management**: Local state synchronization with Firebase backend

## Business Logic
- **Betting System**: Configurable bet limits (€500,000 - €5,000,000)
- **Game Management**: Admin controls for adding, editing, and managing football matches
- **Odds System**: Multiple betting types with dynamic odds calculation
- **Currency Handling**: Euro-based monetary system with Portuguese formatting

## User Interface Components
- **Admin Panel**: Comprehensive game and bet management interface
- **Public Betting Interface**: User-friendly betting selection and placement
- **Notification System**: Real-time feedback for user actions
- **Form Validation**: Client-side input validation and error handling

# External Dependencies

## Cloud Services
- **Firebase**: Google's Backend-as-a-Service platform
  - Realtime Database for data storage and synchronization
  - Firebase SDK v9.22.2 for modern JavaScript integration

## Web Services
- **Google Fonts**: Inter font family for consistent typography
- **CDN Delivery**: Firebase JavaScript SDK delivered via Google's CDN

## Development Dependencies
- **Flask**: Python web framework for local development server
- **Python Runtime**: Server-side application hosting

## Browser APIs
- **localStorage**: Client-side session and preference storage
- **DOM APIs**: Dynamic user interface manipulation
- **ES6 Modules**: Modern JavaScript module system for code organization

## Configuration
- **Firebase Configuration**: Demo credentials configured for development environment
- **CORS Settings**: Cross-origin resource sharing for Firebase API access
- **Port Configuration**: Flask development server on port 5000 with host binding