const { send } = require('micro');
const { readFileSync } = require('fs');
const path = require('path');

let routesData = null;
let routesGeoJSON = null;

function loadData() {
  if (!routesData) {
    try {
      routesData = JSON.parse(readFileSync(path.join(__dirname, '../data/v1/routes.min.json'), 'utf8'));
      routesGeoJSON = JSON.parse(readFileSync(path.join(__dirname, '../data/v1/routes.min.geojson'), 'utf8'));
    } catch (error) {
      console.error('Failed to load routes data:', error);
      throw new Error('Bus routes data not available');
    }
  }
}

async function handler(req, res, format = 'json') {
  loadData();
  
  const { query } = req;
  const { 
    service,        // specific service number
    bbox,           // bounding box filter
    simplified = true // return simplified polylines
  } = query;

  try {
    if (format === 'geojson') {
      let features = routesGeoJSON.features;
      
      // Apply service filter
      if (service) {
        features = features.filter(feature => 
          feature.properties.number === service
        );
      }
      
      // Apply bounding box filter
      if (bbox) {
        const [minLng, minLat, maxLng, maxLat] = bbox.split(',').map(Number);
        features = features.filter(feature => {
          const coords = feature.geometry.coordinates;
          return coords.some(([lng, lat]) => 
            lng >= minLng && lng <= maxLng && lat >= minLat && lat <= maxLat
          );
        });
      }
      
      return send(res, 200, {
        type: 'FeatureCollection',
        features,
        meta: {
          total: features.length,
          service,
          bbox,
          simplified: simplified === 'true'
        }
      });
    } else {
      // JSON format (polylines)
      let routes = routesData;
      
      if (service) {
        if (routesData[service]) {
          routes = { [service]: routesData[service] };
        } else {
          routes = {};
        }
      }
      
      return send(res, 200, {
        routes,
        meta: {
          total: Object.keys(routes).length,
          service,
          format: 'polylines',
          simplified: simplified === 'true'
        }
      });
    }
  } catch (error) {
    console.error('Routes API Error:', error);
    return send(res, 500, {
      error: 'Failed to fetch bus routes',
      message: error.message
    });
  }
}

module.exports = handler;