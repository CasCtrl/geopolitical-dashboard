# Geopolitical Dashboard

A React-based dashboard synced with Figma design files.

## Setup

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start development server:
```bash
npm run dev
```

The app will open at `http://localhost:3000`

### Build for Production
```bash
npm run build
```

### Figma Integration

This project includes `@figma/rest-api-client` for API access to Figma files.

#### Setting up Figma API

1. Get your Figma personal access token:
   - Go to https://www.figma.com/settings/accounts/tokens
   - Create a new personal access token
   - Store it securely (add to `.env.local`)

2. Copy `.env.local.example` to `.env.local` and add your credentials:
```bash
cp .env.local.example .env.local
```

3. Edit `.env.local` with your values:
```
VITE_FIGMA_TOKEN=your_token_here
VITE_FIGMA_FILE_ID=your_figma_file_id_here
```

4. Use the provided `FigmaIntegration` component:
```javascript
import FigmaIntegration from './components/FigmaIntegration'

function App() {
  return (
    <div>
      <FigmaIntegration />
    </div>
  )
}
```

The `FigmaIntegration` component provides:
- A button to fetch your Figma file data
- Display of pages and components from your design
- Error handling and loading states
- See `src/components/FigmaIntegration.jsx` for a complete example

## Project Structure

```
src/
├── main.jsx                    # Entry point
├── App.jsx                     # Main component
├── App.css                     # App styles
├── index.css                   # Global styles
└── components/
    └── FigmaIntegration.jsx    # Figma API integration example
public/
├── index.html                  # HTML template
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Technologies

- React 18
- Vite (build tool)
- Figma REST API Client
- ESLint (linting)
