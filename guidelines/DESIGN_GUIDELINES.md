# Design Guidelines

This document outlines the design guidelines for the Geopolitical Dashboard project, which is synced with Figma designs.

## Color Palette

### Primary Colors
- **Primary Blue**: `#007bff` - Main action color
- **Secondary Gray**: `#6c757d` - Secondary elements
- **Light Gray**: `#f8f9fa` - Backgrounds
- **Dark Gray**: `#343a40` - Text

### Semantic Colors
- **Success**: `#28a745` - Positive actions/status
- **Danger**: `#dc3545` - Warnings/errors
- **Warning**: `#ffc107` - Alerts
- **Info**: `#17a2b8` - Information

## Typography

### Font Family
System fonts: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`

### Font Sizes
- **XS**: 0.75rem (12px)
- **SM**: 0.875rem (14px)
- **Base**: 1rem (16px)
- **LG**: 1.125rem (18px)
- **XL**: 1.25rem (20px)
- **2XL**: 1.5rem (24px)

## Spacing

Using a consistent 8px base unit:
- **XS**: 2px
- **SM**: 4px
- **MD**: 8px
- **LG**: 12px
- **XL**: 16px
- **2XL**: 24px

## Components

All components should follow the Tailwind CSS class patterns defined in this project. Components are located in `src/app/components/`.

## Importing Figma Designs

When importing designs from Figma:
1. Export components as React components
2. Place them in `src/app/components/`
3. Extract design tokens to `src/app/data/`
4. Add styles to `src/app/styles/`

## Development

### Running the Project
```bash
npm run dev
```

### Building for Production
```bash
npm run build
```

### Linting
```bash
npm run lint
```



## Version 1.1 Update (April 19, 2026)

- Latest Version: 1.1
- Build: 1.1
- Last Updated: April 19, 2026
- Design guidance now reflects map snapshot export affordance in the heat map card UI.
- Control-state guidance includes freshness icon semantics (check for current, alert for overdue).
- UX feedback standards now include toast messaging for snapshot success/failure.
- Local runtime assumptions in docs are aligned to backend API on port 5001.
