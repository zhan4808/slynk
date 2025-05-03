# Slynk Library

This directory contains utility functions, API clients, and types used throughout the Slynk application.

## File Structure

```
lib/
├── generated/          # Generated Prisma client files
├── api.ts              # API utility functions
├── audio-monitoring.ts # Audio monitoring utilities 
├── auth.ts             # Authentication utilities
├── browser-detection.ts # Browser detection utilities
├── email.ts            # Email sending utilities
├── google-sheets.ts    # Google Sheets integration
├── mock-api.ts         # Mock API for development
├── prisma.ts           # Prisma client configuration
├── simli-api.ts        # Simli API client
├── simli-client.ts     # Simli client utilities
├── types.ts            # TypeScript type definitions
├── utils.ts            # General utility functions
└── voice-options.ts    # Voice configuration options
```

## Modules

### API Integration

- `api.ts` - Base API utility functions for making HTTP requests
- `simli-api.ts` - Full Simli API client for avatar generation and chat
- `simli-client.ts` - Additional Simli client utilities
- `mock-api.ts` - Mock implementations for development without real API keys

### Auth & Database

- `auth.ts` - NextAuth.js configuration and authentication utilities
- `prisma.ts` - Prisma ORM client configuration
- `email.ts` - Email sending utilities for authentication

### Media Utilities

- `audio-monitoring.ts` - Utilities for monitoring audio input/output
- `browser-detection.ts` - Browser and device detection for media features
- `voice-options.ts` - Voice configuration options for the Simli API

### General Utilities

- `types.ts` - TypeScript interface and type definitions
- `utils.ts` - General utility functions used across the application

## Usage Guidelines

1. Keep utility functions focused on a single responsibility
2. Add proper TypeScript typing to all exported functions
3. Add JSDoc comments for complex functions
4. Maintain a clear separation between different API clients
5. Use meaningful and consistent naming conventions 