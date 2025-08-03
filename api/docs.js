const { send } = require('micro');

const documentation = {
  title: "SG Bus Data API",
  version: "2.0.0",
  description: "Singapore bus data API for mapping and real-time monitoring applications",
  baseUrl: process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://your-app.vercel.app",
  repository: "https://github.com/your-username/sgbusdata",
  lastUpdated: new Date().toISOString(),
  
  endpoints: {
    "Static Data": {
      "GET /api/bus-stops": {
        description: "Get bus stops data in compact JSON format",
        parameters: {
          bbox: "Bounding box filter (lng1,lat1,lng2,lat2)",
          service: "Filter by service number", 
          search: "Search by stop name or road",
          limit: "Limit results (default: 1000, max: 5000)"
        },
        example: "/api/bus-stops?service=10&limit=50",
        responseFormat: {
          "01012": "[lng, lat, name, road]"
        }
      },
      "GET /api/bus-stops/geojson": {
        description: "Get bus stops as GeoJSON for mapping",
        parameters: "Same as /api/bus-stops",
        example: "/api/bus-stops/geojson?bbox=103.8,1.3,103.9,1.4",
        responseFormat: "GeoJSON FeatureCollection"
      },
      "GET /api/bus-services": {
        description: "Get bus services with route information",
        parameters: {
          search: "Search by service number or name",
          origin: "Filter services passing through origin stop",
          destination: "Filter services passing through destination stop",
          limit: "Limit results (default: 100)"
        },
        example: "/api/bus-services?origin=01012&destination=02013"
      },
      "GET /api/bus-routes": {
        description: "Get bus routes as encoded polylines",
        parameters: {
          service: "Specific service number (required for practical use)",
          bbox: "Bounding box filter",
          simplified: "Return simplified polylines (default: true)"
        },
        example: "/api/bus-routes?service=10",
        responseFormat: {
          "10": ["encoded_polyline_1", "encoded_polyline_2"]
        }
      },
      "GET /api/bus-routes/geojson": {
        description: "Get bus routes as GeoJSON LineStrings",
        parameters: "Same as /api/bus-routes", 
        example: "/api/bus-routes/geojson?service=10",
        responseFormat: "GeoJSON FeatureCollection with LineString features"
      }
    },
    
    "Real-time Data": {
      "GET /api/realtime/arrivals": {
        description: "Get real-time bus arrival predictions",
        parameters: {
          busStopCode: "Bus stop code (required)",
          serviceNo: "Filter by specific service number (optional)"
        },
        example: "/api/realtime/arrivals?busStopCode=01012&serviceNo=10",
        responseFormat: {
          busStopCode: "01012",
          arrivals: [
            {
              serviceNo: "10",
              operator: "SBST",
              buses: [
                {
                  estimatedArrival: "ISO timestamp",
                  minutesAway: 3,
                  load: "SEA|SDA|LSD",
                  feature: "WAB|null",
                  type: "SD|DD|BD"
                }
              ]
            }
          ]
        }
      },
      "GET /api/realtime/positions": {
        description: "Get real-time bus GPS positions",
        parameters: {
          serviceNo: "Filter by service number (optional)",
          skip: "Skip results for pagination (default: 0)"
        },
        example: "/api/realtime/positions?serviceNo=10",
        responseFormat: {
          positions: [
            {
              serviceNo: "10",
              busId: "TIB1234X",
              coordinates: "[lng, lat]",
              bearing: 45,
              timestamp: "GPS timestamp"
            }
          ]
        }
      }
    },
    
    "System": {
      "GET /api/health": {
        description: "System health check and data availability",
        example: "/api/health"
      },
      "GET /api/docs": {
        description: "This API documentation",
        example: "/api/docs"
      }
    }
  },
  
  dataFormats: {
    loads: {
      SEA: "Seats Available",
      SDA: "Standing Available", 
      LSD: "Limited Standing"
    },
    busTypes: {
      SD: "Single Deck",
      DD: "Double Deck",
      BD: "Bendy Bus"
    },
    features: {
      WAB: "Wheelchair Accessible Bus"
    }
  },
  
  rateLimits: {
    "Static Data Endpoints": "Cached for 1 hour, no rate limits",
    "Real-time Endpoints": "30 second timeout, please use responsibly (max 1 req/sec recommended)"
  },
  
  cors: "Enabled for all origins (*)",
  
  examples: {
    javascript: `
// Basic fetch example
const stops = await fetch('/api/bus-stops?bbox=103.8,1.3,103.9,1.4')
  .then(res => res.json());

// Real-time arrivals
const arrivals = await fetch('/api/realtime/arrivals?busStopCode=01012')
  .then(res => res.json());
`,
    
    react: `
// React hook example
import { useEffect, useState } from 'react';

function useBusArrivals(stopCode) {
  const [arrivals, setArrivals] = useState([]);
  
  useEffect(() => {
    const fetchArrivals = async () => {
      const res = await fetch(\`/api/realtime/arrivals?busStopCode=\${stopCode}\`);
      const data = await res.json();
      setArrivals(data.arrivals);
    };
    
    fetchArrivals();
    const interval = setInterval(fetchArrivals, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [stopCode]);
  
  return arrivals;
}
`,

    leaflet: `
// Leaflet map integration
import L from 'leaflet';

// Add bus stops to map
const stopsResponse = await fetch('/api/bus-stops/geojson?bbox=103.8,1.3,103.9,1.4');
const stopsData = await stopsResponse.json();

L.geoJSON(stopsData, {
  pointToLayer: (feature, latlng) => {
    return L.circleMarker(latlng, {
      radius: 6,
      fillColor: '#3388ff',
      color: '#fff',
      weight: 1,
      opacity: 1,
      fillOpacity: 0.8
    });
  },
  onEachFeature: (feature, layer) => {
    layer.bindPopup(\`
      <strong>\${feature.properties.name}</strong><br>
      Stop: \${feature.properties.number}<br>
      Services: \${feature.properties.services.join(', ')}
    \`);
  }
}).addTo(map);
`
  },

  supportedRegions: ["Singapore"],
  
  dataSource: "Land Transport Authority (LTA) DataMall",
  
  contact: {
    issues: "https://github.com/your-username/sgbusdata/issues",
    documentation: "https://github.com/your-username/sgbusdata#readme"
  }
};

async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  return send(res, 200, documentation);
}

module.exports = handler;
