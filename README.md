# Map Tracking Application

A Next.js application for tracking user location, recording trips, and providing navigation using Mapbox GL JS.

## Features

- **Real-time Location Tracking**: Continuous GPS tracking with visual indicators
- **Trip Recording**: Record and save trips with statistics (distance, duration, average speed)
- **Trip History**: View, manage, and export saved trips (JSON/GPX formats)
- **Navigation**: Turn-by-turn navigation with route calculation
- **Offline Support**: Service worker for caching map tiles

## Prerequisites

- Node.js 18+ and npm
- A Mapbox access token ([Get one here](https://account.mapbox.com/access-tokens/))

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure Mapbox token:**
   - Create a `.env.local` file in the root directory
   - Add your Mapbox access token:
     ```
     NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token_here
     ```

3. **Run the development server:**
   ```bash
   npm run dev
   ```

4. **Open your browser:**
   - Navigate to [http://localhost:3000](http://localhost:3000)
   - Allow location permissions when prompted

## Usage

### Recording a Trip

1. Click "Start Recording Trip" button on the map
2. Move around to record your location
3. Click "Save Trip" when finished (or "Cancel" to discard)
4. Optionally provide a name for your trip

### Viewing Trip History

1. Click "Trip History" in the top right corner
2. View all saved trips with statistics
3. Click "View on Map" to see the route
4. Export trips as JSON or GPX files
5. Delete unwanted trips

### Navigation

1. Use the search box in the top left to find a destination
2. A route will be calculated automatically
3. Click "Start" to begin navigation
4. Follow the turn-by-turn instructions
5. Click "Stop" to end navigation

## Project Structure

```
map-tracking/
├── app/
│   ├── layout.tsx          # Root layout with providers
│   ├── page.tsx            # Main map view
│   └── history/
│       └── page.tsx        # Trip history page
├── components/
│   ├── Map/
│   │   ├── MapboxMap.tsx           # Main map component
│   │   ├── LocationTracker.tsx    # GPS tracking
│   │   ├── NavigationControls.tsx  # Navigation UI
│   │   └── TripRecordingControls.tsx # Trip recording
│   └── History/
│       └── TripHistory.tsx         # Trip history list
├── hooks/
│   ├── useGeolocation.ts   # Browser geolocation hook
│   ├── useTripHistory.ts   # Trip management hook
│   └── useNavigation.ts   # Navigation state hook
├── lib/
│   ├── mapbox.ts          # Mapbox configuration
│   ├── location.ts        # Location utilities
│   ├── navigation.ts      # Navigation logic
│   └── storage.ts         # Trip storage utilities
├── types/
│   └── index.ts           # TypeScript type definitions
└── public/
    └── sw.js              # Service worker for offline support
```

## Technologies

- **Next.js 16** - React framework with App Router
- **Mapbox GL JS** - Interactive maps
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Zustand** - State management (optional)
- **date-fns** - Date utilities

## Browser Support

- Modern browsers with Geolocation API support
- HTTPS required for geolocation (or localhost for development)

## Storage

- Trip data is stored in browser localStorage
- Maximum storage size: 5MB (oldest trips are removed when limit is reached)
- Map tiles are cached via Service Worker for offline use

## License

MIT
