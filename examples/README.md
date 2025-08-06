# Singapore Bus API Examples

This directory contains React components that demonstrate how to use the Singapore Bus API.

## Quick Start

1. **Install dependencies:**
   ```bash
   cd examples
   npm install
   ```

2. **Start the development server:**
   ```bash
   npm start
   ```

3. **Open your browser** and navigate to `http://localhost:3000`

## Components

### 🗺️ BusMap
- Shows all bus stops in Singapore
- Click on stops to see real-time arrivals
- No configuration needed

### 🚌 BusTracker  
- Real-time tracking of bus positions
- Enter any bus service number (e.g., "27", "10", "12")
- Auto-refreshes every 30 seconds

### 🛣️ RouteVisualization
- Shows complete bus route with stops
- Enter any bus service number
- Displays route geometry and all stops

## API Endpoints Used

- **Bus Stops:** `https://sg-bus-data-api.vercel.app/api/bus-stops`
- **Bus Arrivals:** `https://sg-bus-data-api.vercel.app/api/arrivals`
- **Real-time Positions:** `https://sg-bus-data-api.vercel.app/api/realtime`
- **Bus Routes:** `https://sg-bus-data-api.vercel.app/api/bus-routes`

## Custom Hooks

The `hooks.js` file provides reusable hooks:
- `useBusArrivals(stopCode)` - Get arrivals for a specific stop
- `useBusPositions(serviceNumber)` - Get real-time bus positions
- `useBusRoute(serviceNumber)` - Get route data and stops
- `useNearbyStops(lat, lng, radius)` - Get stops near coordinates

## Popular Bus Services to Try

- **27** - Changi Airport to Yio Chu Kang
- **10** - Tampines to Kent Ridge
- **12** - Pasir Ris to Shenton Way
- **14** - Bedok to Clementi
- **16** - Bedok to Shenton Way
- **36** - Changi Airport to Tomlinson Road

## Troubleshooting

- **No buses showing?** Some services may not be operating at certain times
- **Map not loading?** Check your internet connection
- **API errors?** The LTA API may be temporarily unavailable

## Customization

You can customize the components by:
- Changing the `apiBaseUrl` prop
- Adjusting refresh intervals
- Modifying map styles and markers
- Adding additional features

See `usage-guide.md` for detailed documentation. 