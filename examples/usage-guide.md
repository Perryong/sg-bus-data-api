# Bus API Components Usage Guide

This guide shows you how to use the BusMap, BusTracker, and RouteVisualization components in your React application.

## Prerequisites

Before using these components, you need to install the required dependencies:

```bash
npm install react-leaflet leaflet
```

Also, include the Leaflet CSS in your HTML or import it in your React app:

```html
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.7.1/dist/leaflet.css" />
```

Or in your React app:

```javascript
import 'leaflet/dist/leaflet.css';
```

## 1. BusMap Component

The BusMap component displays all bus stops in a specified area and shows real-time arrivals when you click on a stop.

### Basic Usage

```jsx
import React from 'react';
import BusMap from './examples/BusMap';

function App() {
  return (
    <div className="App">
      <h1>Singapore Bus Map</h1>
      <BusMap />
    </div>
  );
}

export default App;
```

### Features
- Shows all bus stops in Singapore (configurable area)
- Click on any bus stop to see real-time arrivals
- Displays stop information (name, code, road, services)
- Shows next bus arrivals with estimated times

### Customization
You can modify the BusMap component to:
- Change the map center and zoom level
- Adjust the bounding box for bus stops
- Customize the popup content
- Add additional map layers

## 2. BusTracker Component

The BusTracker component shows real-time positions of buses for a specific service number.

### Basic Usage

```jsx
import React from 'react';
import BusTracker from './examples/BusTracker';

function App() {
  return (
    <div className="App">
      <h1>Bus 27 Tracker</h1>
      <BusTracker 
        serviceNumber="27"
        refreshInterval={30000} // 30 seconds
        showCongestion={true}
        showRoute={false}
      />
    </div>
  );
}

export default App;
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `serviceNumber` | string | required | The bus service number to track |
| `apiBaseUrl` | string | `'https://sg-bus-data-api.vercel.app'` | Base URL for the API |
| `refreshInterval` | number | `30000` | Refresh interval in milliseconds |
| `showCongestion` | boolean | `true` | Show congestion levels on bus markers |
| `showRoute` | boolean | `false` | Show the bus route on the map |

### Features
- Real-time bus position tracking
- Auto-refresh every 30 seconds (configurable)
- Click on buses to see detailed information
- Shows congestion levels (Seats Available, Standing Available, Limited Standing)
- Auto-fit map to show all buses
- Connection status indicator

### Advanced Usage

```jsx
import React, { useState } from 'react';
import BusTracker from './examples/BusTracker';

function App() {
  const [selectedService, setSelectedService] = useState('27');

  return (
    <div className="App">
      <div style={{ marginBottom: '20px' }}>
        <label>Select Bus Service: </label>
        <select 
          value={selectedService} 
          onChange={(e) => setSelectedService(e.target.value)}
        >
          <option value="27">Bus 27</option>
          <option value="10">Bus 10</option>
          <option value="12">Bus 12</option>
          <option value="14">Bus 14</option>
        </select>
      </div>
      
      <BusTracker 
        serviceNumber={selectedService}
        refreshInterval={15000} // 15 seconds for more frequent updates
        showCongestion={true}
        showRoute={true}
      />
    </div>
  );
}
```

## 3. RouteVisualization Component

The RouteVisualization component displays the complete route for a bus service, including all stops and route geometry.

### Basic Usage

```jsx
import React from 'react';
import RouteVisualization from './examples/RouteVisualization';

function App() {
  return (
    <div className="App">
      <h1>Bus 27 Route</h1>
      <RouteVisualization 
        serviceNumber="27"
        showStops={true}
        showPatternLabels={true}
      />
    </div>
  );
}

export default App;
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `serviceNumber` | string | required | The bus service number to visualize |
| `apiBaseUrl` | string | `'https://sg-bus-data-api.vercel.app'` | Base URL for the API |
| `showStops` | boolean | `true` | Show bus stops along the route |
| `showPatternLabels` | boolean | `true` | Show pattern labels on the route |

### Features
- Complete route visualization with GeoJSON geometry
- All bus stops along the route
- Different colors for different route patterns
- Click on stops to see stop information
- Loading and error states

### Advanced Usage

```jsx
import React, { useState } from 'react';
import RouteVisualization from './examples/RouteVisualization';

function App() {
  const [selectedService, setSelectedService] = useState('27');
  const [showStops, setShowStops] = useState(true);

  return (
    <div className="App">
      <div style={{ marginBottom: '20px' }}>
        <label>Bus Service: </label>
        <input 
          type="text" 
          value={selectedService} 
          onChange={(e) => setSelectedService(e.target.value)}
          placeholder="Enter bus service number"
        />
        
        <label style={{ marginLeft: '20px' }}>
          <input 
            type="checkbox" 
            checked={showStops} 
            onChange={(e) => setShowStops(e.target.checked)}
          />
          Show Stops
        </label>
      </div>
      
      <RouteVisualization 
        serviceNumber={selectedService}
        showStops={showStops}
        showPatternLabels={true}
      />
    </div>
  );
}
```

## 4. Using Custom Hooks

The `hooks.js` file provides custom React hooks for easier integration:

```jsx
import React from 'react';
import { useBusArrivals, useBusPositions, useBusRoute } from './examples/hooks';

function BusDashboard() {
  const { arrivals, loading: arrivalsLoading, error: arrivalsError } = useBusArrivals('65011');
  const { positions, loading: positionsLoading, error: positionsError } = useBusPositions('27');
  const { routeData, loading: routeLoading } = useBusRoute('27');

  return (
    <div>
      <h2>Bus Dashboard</h2>
      
      <div>
        <h3>Arrivals at Stop 65011</h3>
        {arrivalsLoading && <p>Loading arrivals...</p>}
        {arrivalsError && <p>Error: {arrivalsError}</p>}
        {arrivals.map(arrival => (
          <div key={arrival.serviceNo}>
            <strong>Bus {arrival.serviceNo}:</strong>
            {arrival.buses.map((bus, i) => (
              <span key={i}> {bus.minutesAway}min</span>
            ))}
          </div>
        ))}
      </div>
      
      <div>
        <h3>Bus 27 Positions</h3>
        {positionsLoading && <p>Loading positions...</p>}
        {positionsError && <p>Error: {positionsError}</p>}
        {positions.map(position => (
          <div key={position.busId}>
            Bus {position.busId} at {position.coordinates.join(', ')}
          </div>
        ))}
      </div>
    </div>
  );
}
```

## 5. Complete Example Application

Here's a complete example that combines all components:

```jsx
import React, { useState } from 'react';
import BusMap from './examples/BusMap';
import BusTracker from './examples/BusTracker';
import RouteVisualization from './examples/RouteVisualization';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('map');
  const [selectedService, setSelectedService] = useState('27');

  return (
    <div className="App">
      <header>
        <h1>Singapore Bus Tracker</h1>
        <nav>
          <button 
            onClick={() => setActiveTab('map')}
            className={activeTab === 'map' ? 'active' : ''}
          >
            Bus Map
          </button>
          <button 
            onClick={() => setActiveTab('tracker')}
            className={activeTab === 'tracker' ? 'active' : ''}
          >
            Bus Tracker
          </button>
          <button 
            onClick={() => setActiveTab('route')}
            className={activeTab === 'route' ? 'active' : ''}
          >
            Route Visualization
          </button>
        </nav>
        
        {activeTab !== 'map' && (
          <div style={{ marginTop: '10px' }}>
            <label>Bus Service: </label>
            <input 
              type="text" 
              value={selectedService} 
              onChange={(e) => setSelectedService(e.target.value)}
              placeholder="Enter bus service number"
            />
          </div>
        )}
      </header>

      <main>
        {activeTab === 'map' && <BusMap />}
        {activeTab === 'tracker' && (
          <BusTracker 
            serviceNumber={selectedService}
            refreshInterval={30000}
            showCongestion={true}
            showRoute={false}
          />
        )}
        {activeTab === 'route' && (
          <RouteVisualization 
            serviceNumber={selectedService}
            showStops={true}
            showPatternLabels={true}
          />
        )}
      </main>
    </div>
  );
}

export default App;
```

## 6. CSS Styling

Add some basic CSS for better appearance:

```css
/* App.css */
.App {
  text-align: center;
}

header {
  background: #f8f9fa;
  padding: 20px;
  border-bottom: 1px solid #dee2e6;
}

nav {
  margin-top: 10px;
}

nav button {
  margin: 0 5px;
  padding: 8px 16px;
  border: 1px solid #007bff;
  background: white;
  color: #007bff;
  cursor: pointer;
  border-radius: 4px;
}

nav button.active {
  background: #007bff;
  color: white;
}

nav button:hover {
  background: #0056b3;
  color: white;
}

main {
  height: calc(100vh - 120px);
}

input[type="text"] {
  padding: 5px 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  margin-left: 10px;
}

label {
  font-weight: bold;
}
```

## 7. Error Handling

All components include error handling, but you can add additional error boundaries:

```jsx
import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <h1>Something went wrong. Please refresh the page.</h1>;
    }

    return this.props.children;
  }
}

// Wrap your components
<ErrorBoundary>
  <BusTracker serviceNumber="27" />
</ErrorBoundary>
```

## 8. Performance Tips

1. **Use React.memo** for components that don't need frequent re-renders
2. **Adjust refresh intervals** based on your needs (lower for real-time tracking, higher for static data)
3. **Implement proper cleanup** in useEffect hooks
4. **Use error boundaries** to catch and handle errors gracefully
5. **Consider lazy loading** for large components

This should give you everything you need to get started with the bus tracking components! 