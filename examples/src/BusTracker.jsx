import React, { useEffect, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';

// Custom bus icon that rotates based on bearing
const createBusIcon = (bearing = 0, type = 'SD', isSelected = false) => {
  const colors = {
    'SD': '#4444ff', // Single Deck - Blue
    'DD': '#ff4444', // Double Deck - Red  
    'BD': '#44ff44'  // Bendy - Green
  };
  
  const color = colors[type] || '#666666';
  const size = isSelected ? 20 : 16;
  const borderWidth = isSelected ? 3 : 2;
  
  return L.divIcon({
    className: 'bus-marker',
    html: `<div style="
      width: ${size}px; 
      height: ${size}px; 
      background: ${color}; 
      border: ${borderWidth}px solid ${isSelected ? '#ffff00' : 'white'};
      border-radius: 3px;
      transform: rotate(${bearing}deg);
      box-shadow: 0 2px 4px rgba(0,0,0,0.4);
      position: relative;
      cursor: pointer;
    ">
      <div style="
        position: absolute;
        top: -3px;
        left: 50%;
        transform: translateX(-50%);
        width: 0;
        height: 0;
        border-left: 4px solid transparent;
        border-right: 4px solid transparent;
        border-bottom: 8px solid ${color};
      "></div>
    </div>`,
    iconSize: [size + borderWidth * 2, size + borderWidth * 2],
    iconAnchor: [(size + borderWidth * 2) / 2, (size + borderWidth * 2) / 2]
  });
};

// Bus stop icon
const createStopIcon = (isTerminal = false) => {
  const color = isTerminal ? '#ff6b35' : '#4caf50';
  const size = isTerminal ? 12 : 8;
  
  return L.divIcon({
    className: 'stop-marker',
    html: `<div style="
      width: ${size}px; 
      height: ${size}px; 
      background: ${color}; 
      border: 2px solid white;
      border-radius: 50%;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [size + 4, size + 4],
    iconAnchor: [(size + 4) / 2, (size + 4) / 2]
  });
};

// Component to auto-fit map bounds to show all buses and route
function AutoBounds({ arrivals, routeStops, selectedBus }) {
  const map = useMap();
  
  useEffect(() => {
    if (selectedBus) {
      // Center on selected bus
      map.setView([selectedBus.latitude, selectedBus.longitude], 15);
    } else if (arrivals.length > 0 || routeStops.length > 0) {
      // Fit all buses and route stops
      const coords = [];
      
      // Add bus positions
      arrivals.forEach(arrival => {
        arrival.buses.forEach(bus => {
          if (bus.latitude && bus.longitude) {
            coords.push([bus.latitude, bus.longitude]);
          }
        });
      });
      
      // Add route stops
      routeStops.forEach(stop => {
        coords.push([stop.latitude, stop.longitude]);
      });
      
      if (coords.length > 0) {
        const bounds = L.latLngBounds(coords);
        map.fitBounds(bounds, { padding: [20, 20] });
      }
    }
  }, [arrivals, routeStops, selectedBus, map]);
  
  return null;
}

function BusTracker({ 
  serviceNumber, 
  busStopCode,
  apiBaseUrl = '',
  refreshInterval = 30000,
  showRoute = true 
}) {
  const [arrivals, setArrivals] = useState([]);
  const [routeStops, setRouteStops] = useState([]);
  const [routePath, setRoutePath] = useState([]);
  const [selectedBus, setSelectedBus] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState('idle');

  const fetchArrivals = useCallback(async () => {
    if (!serviceNumber || !busStopCode) return;
    
    setIsLoading(true);
    setError(null);
    setConnectionStatus('connecting');
    
    try {
      const response = await fetch(
        `${apiBaseUrl}/api/arrivals?busStopCode=${busStopCode}&serviceNo=${serviceNumber}`,
        { 
          timeout: 10000,
          headers: {
            'Cache-Control': 'no-cache'
          }
        }
      );
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success && data.data.arrivals) {
        setArrivals(data.data.arrivals);
        setLastUpdate(new Date());
        setConnectionStatus('connected');
      } else {
        throw new Error(data.error?.message || 'Invalid response format');
      }
    } catch (err) {
      setError(err.message);
      setConnectionStatus('error');
      console.error('Failed to fetch bus arrivals:', err);
    } finally {
      setIsLoading(false);
    }
  }, [serviceNumber, busStopCode, apiBaseUrl]);

  const fetchRouteData = useCallback(async () => {
    if (!serviceNumber) return;
    
    try {
      // Fetch route path
      const routeResponse = await fetch(
        `${apiBaseUrl}/api/bus-routes?service=${serviceNumber}&format=geojson`
      );
      
      if (routeResponse.ok) {
        const routeData = await routeResponse.json();
        if (routeData.success && routeData.data.features) {
          const paths = routeData.data.features.map(feature => feature.geometry.coordinates);
          setRoutePath(paths);
        }
      }
      
      // Fetch route stops
      const stopsResponse = await fetch(
        `${apiBaseUrl}/api/bus-stops?service=${serviceNumber}&format=geojson`
      );
      
      if (stopsResponse.ok) {
        const stopsData = await stopsResponse.json();
        if (stopsData.success && stopsData.data.features) {
          const stops = stopsData.data.features.map(feature => ({
            code: feature.properties.code,
            name: feature.properties.name,
            road: feature.properties.road,
            latitude: feature.geometry.coordinates[1],
            longitude: feature.geometry.coordinates[0],
            isTerminal: feature.properties.name.toLowerCase().includes('int') || 
                       feature.properties.name.toLowerCase().includes('terminal')
          }));
          setRouteStops(stops);
        }
      }
    } catch (err) {
      console.error('Failed to fetch route data:', err);
    }
  }, [serviceNumber, apiBaseUrl]);

  useEffect(() => {
    fetchArrivals();
    fetchRouteData();
    
    if (autoRefresh) {
      const interval = setInterval(fetchArrivals, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchArrivals, fetchRouteData, autoRefresh, refreshInterval]);

  const getLoadText = (load) => {
    const loads = ['Seats Available', 'Standing Available', 'Limited Standing'];
    return loads[load] || 'Unknown';
  };

  const getLoadColor = (load) => {
    const colors = ['#4caf50', '#ff9800', '#f44336'];
    return colors[load] || '#9e9e9e';
  };

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return '#4caf50';
      case 'connecting': return '#ff9800';
      case 'error': return '#f44336';
      default: return '#9e9e9e';
    }
  };

  // Flatten all buses from all arrivals
  const allBuses = arrivals.flatMap(arrival => 
    arrival.buses.map(bus => ({
      ...bus,
      serviceNo: arrival.serviceNo,
      operator: arrival.operator
    }))
  ).filter(bus => bus.latitude && bus.longitude);

  if (!serviceNumber || !busStopCode) {
    return (
      <div style={{ 
        padding: '20px', 
        textAlign: 'center',
        backgroundColor: '#f5f5f5',
        borderRadius: '8px',
        border: '1px solid #ddd'
      }}>
        <div style={{ fontSize: '1.2em', marginBottom: '10px' }}>🚌</div>
        <div>Please enter a service number and bus stop code to track buses</div>
        <div style={{ fontSize: '0.9em', color: '#666', marginTop: '5px' }}>
          Example: Service 10, Stop 65011 (Sengkang Int)
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: '650px', width: '100%', border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden' }}>
      {/* Control Panel */}
      <div style={{ 
        padding: '15px', 
        backgroundColor: '#e3f2fd', 
        borderBottom: '1px solid #bbdefb',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '10px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <strong>🚌 Bus Service {serviceNumber} - Arrivals at Stop {busStopCode}</strong>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: getConnectionStatusColor()
            }}></div>
          </div>
          {lastUpdate && (
            <div style={{ fontSize: '0.8em', color: '#666' }}>
              Last updated: {lastUpdate.toLocaleTimeString()}
            </div>
          )}
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <label style={{ fontSize: '0.9em', display: 'flex', alignItems: 'center' }}>
            <input 
              type="checkbox" 
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              style={{ marginRight: '5px' }}
            />
            Auto-refresh ({refreshInterval/1000}s)
          </label>
          
          <button 
            onClick={fetchArrivals}
            disabled={isLoading}
            style={{
              padding: '6px 12px',
              backgroundColor: isLoading ? '#ccc' : '#1976d2',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              fontSize: '0.9em'
            }}
          >
            {isLoading ? '🔄 Updating...' : '🔄 Refresh'}
          </button>
        </div>
      </div>

      {/* Status Bar */}
      <div style={{ 
        padding: '10px 15px', 
        backgroundColor: error ? '#ffebee' : allBuses.length === 0 ? '#fff3e0' : '#e8f5e8',
        borderBottom: '1px solid #ddd',
        fontSize: '0.9em',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          {error ? (
            <span style={{ color: '#c62828' }}>
              ❌ Error: {error}
            </span>
          ) : allBuses.length === 0 ? (
            <span style={{ color: '#f57c00' }}>
              ⚠️ No buses currently active for service {serviceNumber}
            </span>
          ) : (
            <span style={{ color: '#2e7d32' }}>
              ✅ Tracking {allBuses.length} bus{allBuses.length !== 1 ? 'es' : ''}
              {selectedBus && ` | Selected: ${selectedBus.visitNumber || 'Unknown'}`}
            </span>
          )}
        </div>
        
        {selectedBus && (
          <button
            onClick={() => setSelectedBus(null)}
            style={{
              padding: '4px 8px',
              backgroundColor: '#ff9800',
              color: 'white',
              border: 'none',
              borderRadius: '3px',
              fontSize: '0.8em',
              cursor: 'pointer'
            }}
          >
            Clear Selection
          </button>
        )}
      </div>

      {/* Bus List (when multiple buses) */}
      {allBuses.length > 1 && (
        <div style={{
          padding: '8px 15px',
          backgroundColor: '#f8f9fa',
          borderBottom: '1px solid #ddd',
          fontSize: '0.85em'
        }}>
          <strong>Active Buses:</strong> {allBuses.map((bus, index) => (
            <span key={`${bus.visitNumber}-${bus.estimatedArrival}`}>
              <button
                onClick={() => setSelectedBus(bus)}
                style={{
                  background: selectedBus?.visitNumber === bus.visitNumber ? '#1976d2' : 'transparent',
                  color: selectedBus?.visitNumber === bus.visitNumber ? 'white' : '#1976d2',
                  border: '1px solid #1976d2',
                  borderRadius: '3px',
                  padding: '2px 6px',
                  margin: '0 2px',
                  cursor: 'pointer',
                  fontSize: '0.9em'
                }}
              >
                {bus.minutesAway}m
              </button>
              {index < allBuses.length - 1 && ' '}
            </span>
          ))}
        </div>
      )}

      {/* Map */}
      <MapContainer 
        center={[1.3521, 103.8198]} 
        zoom={11} 
        style={{ height: 'calc(100% - 130px)', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer 
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        
        <AutoBounds arrivals={arrivals} routeStops={routeStops} selectedBus={selectedBus} />
        
        {/* Route path */}
        {showRoute && routePath.map((path, index) => (
          <Polyline
            key={`route-${index}`}
            positions={path.map(coord => [coord[1], coord[0]])}
            color="#1976d2"
            weight={3}
            opacity={0.7}
          />
        ))}
        
        {/* Bus stop markers */}
        {showRoute && routeStops.map(stop => (
          <Marker 
            key={stop.code}
            position={[stop.latitude, stop.longitude]}
            icon={createStopIcon(stop.isTerminal)}
          >
            <Popup>
              <div style={{ minWidth: '200px' }}>
                <h4 style={{ margin: '0 0 8px 0', color: '#1976d2' }}>
                  🚏 {stop.name}
                </h4>
                <div style={{ fontSize: '0.9em' }}>
                  <div><strong>Code:</strong> {stop.code}</div>
                  <div><strong>Road:</strong> {stop.road}</div>
                  {stop.isTerminal && (
                    <div style={{ color: '#ff6b35', fontWeight: 'bold' }}>🚌 Terminal/Interchange</div>
                  )}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
        
        {/* Bus markers */}
        {allBuses.map((bus, index) => (
          <Marker 
            key={`${bus.visitNumber}-${bus.estimatedArrival}-${index}`}
            position={[bus.latitude, bus.longitude]}
            icon={createBusIcon(0, 'SD', selectedBus?.visitNumber === bus.visitNumber)}
            eventHandlers={{
              click: () => setSelectedBus(bus)
            }}
          >
            <Popup>
              <div style={{ minWidth: '280px' }}>
                <h4 style={{ margin: '0 0 12px 0', color: '#1976d2' }}>
                  🚌 Bus {bus.visitNumber || 'Unknown'}
                </h4>
                
                <table style={{ width: '100%', fontSize: '0.9em', borderCollapse: 'collapse' }}>
                  <tbody>
                    <tr>
                      <td style={{ padding: '4px 8px 4px 0', fontWeight: 'bold' }}>Service:</td>
                      <td style={{ padding: '4px 0' }}>{bus.serviceNo}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '4px 8px 4px 0', fontWeight: 'bold' }}>Arrival:</td>
                      <td style={{ padding: '4px 0' }}>
                        <span style={{ 
                          color: bus.minutesAway <= 2 ? '#f44336' : 
                                 bus.minutesAway <= 5 ? '#ff9800' : '#4caf50',
                          fontWeight: 'bold'
                        }}>
                          {bus.minutesAway} minutes
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '4px 8px 4px 0', fontWeight: 'bold' }}>Load:</td>
                      <td style={{ padding: '4px 0' }}>
                        <span style={{ 
                          color: getLoadColor(bus.load),
                          fontWeight: 'bold'
                        }}>
                          {getLoadText(bus.load)}
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '4px 8px 4px 0', fontWeight: 'bold' }}>Type:</td>
                      <td style={{ padding: '4px 0' }}>
                        {bus.type === 'SD' ? '🚌 Single Deck' : 
                         bus.type === 'DD' ? '🚌🚌 Double Deck' : 
                         bus.type === 'BD' ? '🚌➡️ Bendy Bus' : bus.type || 'Unknown'}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '4px 8px 4px 0', fontWeight: 'bold' }}>Feature:</td>
                      <td style={{ padding: '4px 0' }}>
                        {bus.feature === 'WAB' ? '♿ Wheelchair Accessible' : 
                         bus.feature === 'LED' ? '💡 LED Display' : 
                         bus.feature || 'Standard'}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '4px 8px 4px 0', fontWeight: 'bold' }}>Location:</td>
                      <td style={{ padding: '4px 0', fontFamily: 'monospace', fontSize: '0.85em' }}>
                        {bus.latitude.toFixed(4)}, {bus.longitude.toFixed(4)}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '4px 8px 4px 0', fontWeight: 'bold' }}>Monitored:</td>
                      <td style={{ padding: '4px 0' }}>
                        {bus.monitored ? '✅ GPS Tracked' : '❌ Estimated'}
                      </td>
                    </tr>
                  </tbody>
                </table>
                
                <div style={{ 
                  marginTop: '12px', 
                  padding: '8px', 
                  backgroundColor: '#f0f8ff',
                  borderRadius: '4px',
                  fontSize: '0.8em',
                  border: '1px solid #cce7ff'
                }}>
                  💡 <strong>Tip:</strong> Click other buses to compare arrival times. Route shown in blue.
                </div>
                
                <div style={{ marginTop: '8px', textAlign: 'center' }}>
                  <button
                    onClick={() => setSelectedBus(bus)}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#1976d2',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.85em'
                    }}
                  >
                    🎯 Focus on this bus
                  </button>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      
      {/* Legend */}
      {(allBuses.length > 0 || routeStops.length > 0) && (
        <div style={{ 
          position: 'absolute', 
          bottom: '10px', 
          right: '10px', 
          backgroundColor: 'rgba(255,255,255,0.95)',
          padding: '10px',
          borderRadius: '6px',
          boxShadow: '0 3px 6px rgba(0,0,0,0.2)',
          fontSize: '0.8em',
          zIndex: 1000,
          border: '1px solid #ddd',
          minWidth: '180px'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '6px' }}>🚌 Bus Types:</div>
          <div style={{ marginBottom: '3px' }}>🔵 Single Deck</div>
          <div style={{ marginBottom: '3px' }}>🔴 Double Deck</div>
          <div style={{ marginBottom: '8px' }}>🟢 Bendy Bus</div>
          
          {showRoute && (
            <>
              <div style={{ fontWeight: 'bold', marginBottom: '6px' }}>🚏 Stops:</div>
              <div style={{ marginBottom: '3px' }}>🟢 Regular Stop</div>
              <div style={{ marginBottom: '8px' }}>🟠 Terminal/Interchange</div>
            </>
          )}
          
          {selectedBus && (
            <div style={{ marginTop: '6px', paddingTop: '6px', borderTop: '1px solid #ddd' }}>
              <div style={{ fontWeight: 'bold' }}>🎯 Selected:</div>
              <div>{selectedBus.minutesAway}m away</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default BusTracker;