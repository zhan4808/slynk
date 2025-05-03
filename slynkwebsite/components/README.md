# Slynk Components

This directory contains React components used throughout the Slynk website.

## Directory Structure

```
components/
├── create/             # Components for the persona creation flow
├── ui/                 # Base UI components (from shadcn/ui)
├── SimliAgent.tsx      # Main Simli integration component
├── SimliAgent.README.md # Documentation for SimliAgent
└── README.md           # This file
```

## Component Categories

### UI Components

The `ui/` directory contains reusable UI components built with [shadcn/ui](https://ui.shadcn.com/), a collection of unstyled, accessible components built with Tailwind CSS and Radix UI.

### Layout Components

Components for page layouts, such as:
- `footer.tsx` - Site footer
- `navbar.tsx` - Navigation bar
- `dynamic-navbar.tsx` - Advanced navigation with state management
- `floating-navbar.tsx` - Floating navigation with animations

### Animation Components

Components that primarily handle animations:
- `animated-background.tsx` - Animated background effects
- `animated-gradient-background.tsx` - Gradient animations
- `animated-logo.tsx` - Logo with animations
- `animated-text.tsx` - Text with typing/fading animations
- `animated-emoji-background.tsx` - Emoji animations

### Section Components

Content sections for landing pages:
- `hero-section.tsx` - Main hero section
- `features-section.tsx` - Product features display
- `values-section.tsx` - Company values
- `story-section.tsx` - Company story
- `mission-section.tsx` - Company mission
- `contact-section.tsx` - Contact information

### Integration Components

Components that integrate with external services:
- `SimliAgent.tsx` - Main component for Simli avatar integration
- `save-to-sheet.js` - Google Sheets integration

## Best Practices

When working with these components:

1. Keep components focused on a single responsibility
2. Use TypeScript for type safety
3. Use props for configuration
4. Extract reusable logic to custom hooks
5. Document complex components with README files (see SimliAgent.README.md)
6. Prefer functional components with hooks
7. Follow the existing naming and style conventions 