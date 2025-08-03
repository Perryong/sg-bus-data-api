import React, { useEffect, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
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

// Component to auto-fit map bounds to show all buses
function AutoBounds({ positions, selectedBus }) {
  const map = useMap();
  
  useEffect(() => {
    if (selectedBus) {
      // Center on selected bus
      map.setView([selectedBus.coordinates[1], selectedBus.coordinates[0]], 15);
    } else if (positions.length > 0) {
      // Fit all buses
      const coords = positions.map(pos => [pos.coordinates[1], pos.coordinates[0]]);
      const bounds = L.latLngBounds(coords);
      map.fitBounds(bounds, { padding: [20, 20] });
    }
  }, [positions, selectedBus, map]);
  
  return null;
}

function BusTracker({ 
  serviceNumber, 
  apiBaseUrl = 'https://your-app.vercel.app',
  refreshInterval = 30000,
  showCongestion = true,
  showRoute = false 
}) {
  const [busPositions, setBusPositions] = useState([]);
  const [selectedBus, setSelectedBus] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState('idle');

  const fetchBusPositions = useCallback(async () => {
    if (!serviceNumber) return;
    
    setIsLoading(true);
    setError(null);
    setConnectionStatus('connecting');
    
    try {
      const response = await fetch(
        `${apiBaseUrl}/api/realtime/positions?serviceNo=${serviceNumber}`,
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
      setBusPositions(data.positions || []);
      setLastUpdate(new Date());
      setConnectionStatus('connected');
      
      // Clear selected bus if it's no longer in the list
      if (selectedBus && !data.positions.some(bus => bus.busId === selectedBus.busId)) {
        setSelectedBus(null);
      }
    } catch (err) {
      setError(err.message);
      setConnectionStatus('error');
      console.error('Failed to fetch bus positions:', err);
    } finally {
      setIsLoading(false);
    }
  }, [serviceNumber, apiBaseUrl, selectedBus]);

  useEffect(() => {
    fetchBusPositions();
    
    if (autoRefresh) {
      const interval = setInterval(fetchBusPositions, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchBusPositions, autoRefresh, refreshInterval]);

  const getCongestionText = (level) => {
    const levels = ['No congestion', 'Light traffic', 'Moderate traffic', 'Heavy traffic'];
    return levels[level] || 'Unknown';
  };

  const getCongestionColor = (level) => {
    const colors = ['#4caf50', '#ffeb3b', '#ff9800', '#f44336'];
    return colors[level] || '#9e9e9e';
  };

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return '#4caf50';
      case 'connecting': return '#ff9800';
      case 'error': return '#f44336';
      default: return '#9e9e9e';
    }
  };

  if (!serviceNumber) {
    return (
      <div style={{ 
        padding: '20px', 
        textAlign: 'center',
        backgroundColor: '#f5f5f5',
        borderRadius: '8px',
        border: '1px solid #ddd'
      }}>
        <div style={{ fontSize: '1.2em', marginBottom: '10px' }}>🚌</div>
        <div>Please enter a service number to track buses</div>
        <div style={{ fontSize: '0.9em', color: '#666', marginTop: '5px' }}>
          Example: 10, 14, 36, 133, 174
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
            <strong>🚌 Bus Service {serviceNumber} - Live Tracking</strong>
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
            onClick={fetchBusPositions}
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
        backgroundColor: error ? '#ffebee' : busPositions.length === 0 ? '#fff3e0' : '#e8f5e8',
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
          ) : busPositions.length === 0 ? (
            <span style={{ color: '#f57c00' }}>
              ⚠️ No buses currently active for service {serviceNumber}
            </span>
          ) : (
            <span style={{ color: '#2e7d32' }}>
              ✅ Tracking {busPositions.length} bus{busPositions.length !== 1 ? 'es' : ''}
              {selectedBus && ` | Selected: ${selectedBus.busId}`}
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
      {busPositions.length > 1 && (
        <div style={{
          padding: '8px 15px',
          backgroundColor: '#f8f9fa',
          borderBottom: '1px solid #ddd',
          fontSize: '0.85em'
        }}>
          <strong>Active Buses:</strong> {busPositions.map((bus, index) => (
            <span key={bus.busId}>
              <button
                onClick={() => setSelectedBus(bus)}
                style={{
                  background: selectedBus?.busId === bus.busId ? '#1976d2' : 'transparent',
                  color: selectedBus?.busId === bus.busId ? 'white' : '#1976d2',
                  border: '1px solid #1976d2',
                  borderRadius: '3px',
                  padding: '2px 6px',
                  margin: '0 2px',
                  cursor: 'pointer',
                  fontSize: '0.9em'
                }}
              >
                {bus.busId}
              </button>
              {index < busPositions.length - 1 && ' '}
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
        
        <AutoBounds positions={busPositions} selectedBus={selectedBus} />
        
        {/* Bus markers */}
        {busPositions.map(bus => (
          <Marker 
            key={bus.busId}
            position={[bus.coordinates[1], bus.coordinates[0]]}
            icon={createBusIcon(bus.bearing, bus.busType, selectedBus?.busId === bus.busId)}
            eventHandlers={{
              click: () => setSelectedBus(bus)
            }}
          >
            <Popup>
              <div style={{ minWidth: '280px' }}>
                <h4 style={{ margin: '0 0 12px 0', color: '#1976d2' }}>
                  🚌 Bus {bus.busId}
                </h4>
                
                <table style={{ width: '100%', fontSize: '0.9em', borderCollapse: 'collapse' }}>
                  <tbody>
                    <tr>
                      <td style={{ padding: '4px 8px 4px 0', fontWeight: 'bold' }}>Service:</td>
                      <td style={{ padding: '4px 0' }}>{bus.serviceNo}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '4px 8px 4px 0', fontWeight: 'bold' }}>Operator:</td>
                      <td style={{ padding: '4px 0' }}>{bus.operator}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '4px 8px 4px 0', fontWeight: 'bold' }}>Type:</td>
                      <td style={{ padding: '4px 0' }}>
                        {bus.busType === 'SD' ? '🚌 Single Deck' : 
                         bus.busType === 'DD' ? '🚌🚌 Double Deck' : 
                         bus.busType === 'BD' ? '🚌➡️ Bendy Bus' : bus.busType}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '4px 8px 4px 0', fontWeight: 'bold' }}>Location:</td>
                      <td style={{ padding: '4px 0', fontFamily: 'monospace', fontSize: '0.85em' }}>
                        {bus.coordinates[1].toFixed(4)}, {bus.coordinates[0].toFixed(4)}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '4px 8px 4px 0', fontWeight: 'bold' }}>Bearing:</td>
                      <td style={{ padding: '4px 0' }}>
                        {bus.bearing}° ({bus.bearing >= 337.5 || bus.bearing < 22.5 ? 'N' :
                                        bus.bearing >= 22.5 && bus.bearing < 67.5 ? 'NE' :
                                        bus.bearing >= 67.5 && bus.bearing < 112.5 ? 'E' :
                                        bus.bearing >= 112.5 && bus.bearing < 157.5 ? 'SE' :
                                        bus.bearing >= 157.5 && bus.bearing < 202.5 ? 'S' :
                                        bus.bearing >= 202.5 && bus.bearing < 247.5 ? 'SW' :
                                        bus.bearing >= 247.5 && bus.bearing < 292.5 ? 'W' : 'NW'})
                      </td>
                    </tr>
                    {showCongestion && (
                      <tr>
                        <td style={{ padding: '4px 8px 4px 0', fontWeight: 'bold' }}>Traffic:</td>
                        <td style={{ padding: '4px 0' }}>
                          <span style={{ 
                            color: getCongestionColor(bus.congestion),
                            fontWeight: 'bold'
                          }}>
                            {getCongestionText(bus.congestion)}
                          </span>
                        </td>
                      </tr>
                    )}
                    <tr>
                      <td style={{ padding: '4px 8px 4px 0', fontWeight: 'bold' }}>GPS Time:</td>
                      <td style={{ padding: '4px 0' }}>
                        {new Date(bus.timestamp).toLocaleTimeString()}
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
                  💡 <strong>Tip:</strong> Bus icon points in direction of travel. Click other buses to compare positions.
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
      
      {/* Legend - FIXED: Added proper closing tags */}
      {busPositions.length > 0 && (
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
          minWidth: '160px'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '6px' }}>🚌 Bus Types:</div>
          <div style={{ marginBottom: '3px' }}>🔵 Single Deck</div>
          <div style={{ marginBottom: '3px' }}>🔴 Double Deck</div>
          <div>🟢 Bendy Bus</div>
          {selectedBus && (
            <div style={{ marginTop: '6px', paddingTop: '6px', borderTop: '1px solid #ddd' }}>
              <div style={{ fontWeight: 'bold' }}>🎯 Selected:</div>
              <div>{selectedBus.busId}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default BusTracker;