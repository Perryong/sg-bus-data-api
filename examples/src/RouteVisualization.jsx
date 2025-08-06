import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

// Fix for default markers in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function RouteVisualization({ 
  serviceNumber, 
  apiBaseUrl = '',
  showStops = true,
  showPatternLabels = true 
}) {
  const [routeData, setRouteData] = useState(null);
  const [busStops, setBusStops] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!serviceNumber) return;

    const fetchRouteData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Fetch route geometry and stops in parallel
        const promises = [
          fetch(`${apiBaseUrl}/api/bus-routes?service=${serviceNumber}&format=geojson`)
        ];
        
        if (showStops) {
          promises.push(
            fetch(`${apiBaseUrl}/api/bus-stops?service=${serviceNumber}&format=geojson`)
          );
        }

        const responses = await Promise.all(promises);
        
        // Check if all responses are ok
        responses.forEach(response => {
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: Failed to fetch data`);
          }
        });

        const [routeResponse, stopsResponse] = await Promise.all([
          responses[0].json(),
          showStops ? responses[1].json() : Promise.resolve({ data: { features: [] } })
        ]);

        // Check for success and extract data
        if (routeResponse.success && routeResponse.data) {
          setRouteData(routeResponse.data);
        } else {
          throw new Error('Invalid route data response');
        }

        if (showStops && stopsResponse.success && stopsResponse.data.features) {
          setBusStops(stopsResponse.data.features);
        } else if (showStops) {
          setBusStops([]);
        }
      } catch (err) {
        setError(err.message);
        console.error('Failed to fetch route data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRouteData();
  }, [serviceNumber, apiBaseUrl, showStops]);

  const routeStyle = (feature) => {
    const pattern = feature.properties.pattern;
    const colors = ['#ff7800', '#00ff78', '#7800ff', '#ff0078', '#78ff00'];
    
    return {
      color: colors[pattern % colors.length],
      weight: 4,
      opacity: 0.8,
      dashArray: pattern > 0 ? '10, 5' : null
    };
  };

  const busStopIcon = L.divIcon({
    className: 'bus-stop-marker',
    html: `<div style="
      background: #0066cc; 
      width: 10px; 
      height: 10px; 
      border-radius: 50%; 
      border: 2px solid white;
      box-shadow: 0 1px 3px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7]
  });

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '400px',
        backgroundColor: '#f5f5f5',
        borderRadius: '8px',
        border: '1px solid #ddd'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.2em', marginBottom: '10px' }}>🚌</div>
          <div>Loading route {serviceNumber}...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        padding: '20px', 
        backgroundColor: '#ffebee', 
        color: '#c62828',
        borderRadius: '8px',
        border: '1px solid #ffcdd2'
      }}>
        <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
          ❌ Error loading route {serviceNumber}
        </div>
        <div>{error}</div>
        <div style={{ marginTop: '10px', fontSize: '0.9em' }}>
          Please check if the service number exists and try again.
        </div>
      </div>
    );
  }

  if (!routeData || routeData.features.length === 0) {
    return (
      <div style={{ 
        padding: '20px', 
        backgroundColor: '#fff3e0', 
        color: '#f57c00',
        borderRadius: '8px',
        border: '1px solid #ffcc02'
      }}>
        <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
          ⚠️ No route data found
        </div>
        <div>Service {serviceNumber} may not exist or have route geometry available.</div>
        <div style={{ marginTop: '10px', fontSize: '0.9em' }}>
          Try popular services like: 10, 14, 36, 133, 174
        </div>
      </div>
    );
  }

  // Calculate map bounds
  const allCoordinates = routeData.features.flatMap(feature => 
    feature.geometry.coordinates
  );
  const lats = allCoordinates.map(coord => coord[1]);
  const lngs = allCoordinates.map(coord => coord[0]);
  
  const bounds = [
    [Math.min(...lats), Math.min(...lngs)],
    [Math.max(...lats), Math.max(...lngs)]
  ];

  return (
    <div style={{ height: '500px', width: '100%', border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ 
        padding: '12px 15px', 
        backgroundColor: '#e3f2fd', 
        borderBottom: '1px solid #bbdefb',
        fontWeight: 'bold',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          🚌 Bus Service {serviceNumber} - Route Map
        </div>
        <div style={{ fontWeight: 'normal', fontSize: '0.85em', color: '#666' }}>
          {routeData.features.length} pattern{routeData.features.length !== 1 ? 's' : ''}
          {showStops && busStops.length > 0 && `, ${busStops.length} stops`}
        </div>
      </div>
      
      {/* Map */}
      <MapContainer 
        bounds={bounds} 
        style={{ height: 'calc(100% - 45px)', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer 
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        
        {/* Route lines */}
        {routeData && (
          <GeoJSON 
            data={routeData} 
            style={routeStyle}
            onEachFeature={(feature, layer) => {
              const pattern = feature.properties.pattern;
              const patternName = pattern === 0 ? 'Direction 1' : `Direction ${pattern + 1}`;
              
              layer.bindPopup(`
                <div style="min-width: 150px;">
                  <strong>Service ${serviceNumber}</strong><br/>
                  <strong>${patternName}</strong><br/>
                  <small>Route pattern ${pattern + 1}</small>
                </div>
              `);
            }}
          />
        )}
        
        {/* Pattern labels as separate markers */}
        {showPatternLabels && routeData.features.map((feature, index) => {
          if (feature.geometry.coordinates.length > 0) {
            const midPoint = feature.geometry.coordinates[Math.floor(feature.geometry.coordinates.length / 2)];
            const pattern = feature.properties.pattern;
            const colors = ['#ff7800', '#00ff78', '#7800ff', '#ff0078', '#78ff00'];
            
            return (
              <Marker
                key={`pattern-${index}`}
                position={[midPoint[1], midPoint[0]]}
                icon={L.divIcon({
                  className: 'pattern-label',
                  html: `<div style="
                    background: ${colors[pattern % colors.length]};
                    color: white;
                    padding: 2px 6px;
                    border-radius: 10px;
                    font-size: 10px;
                    font-weight: bold;
                    border: 1px solid white;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.3);
                  ">${pattern + 1}</div>`,
                  iconSize: [20, 16],
                  iconAnchor: [10, 8]
                })}
              />
            );
          }
          return null;
        })}
        
        {/* Bus stops */}
        {showStops && busStops.map((stop, index) => (
          <Marker 
            key={stop.id || index}
            position={[stop.geometry.coordinates[1], stop.geometry.coordinates[0]]}
            icon={busStopIcon}
          >
            <Popup>
              <div style={{ minWidth: '200px' }}>
                <strong>{stop.properties.name}</strong><br/>
                <div style={{ margin: '8px 0', fontSize: '0.9em', color: '#666' }}>
                  Stop: <code>{stop.properties.number}</code><br/>
                  Road: {stop.properties.road}
                </div>
                <div style={{ marginTop: '10px' }}>
                  <strong>All Services at this stop:</strong><br/>
                  <div style={{ 
                    fontSize: '0.8em', 
                    marginTop: '5px',
                    maxHeight: '60px',
                    overflowY: 'auto'
                  }}>
                    {stop.properties.services.join(', ')}
                  </div>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      
      {/* Legend */}
      {routeData.features.length > 1 && (
        <div style={{ 
          position: 'absolute', 
          bottom: '50px', 
          left: '10px', 
          backgroundColor: 'rgba(255,255,255,0.95)',
          padding: '8px 10px',
          borderRadius: '4px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
          fontSize: '0.8em',
          zIndex: 1000,
          border: '1px solid #ddd'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Route Patterns:</div>
          {routeData.features.map((feature, index) => (
            <div key={index} style={{ display: 'flex', alignItems: 'center', marginBottom: '2px' }}>
              <div style={{
                width: '12px',
                height: '3px',
                backgroundColor: routeStyle(feature).color,
                marginRight: '6px',
                borderRadius: '1px'
              }}></div>
              Direction {feature.properties.pattern + 1}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default RouteVisualization;
