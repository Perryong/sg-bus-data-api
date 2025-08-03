const { send } = require('micro');
const { readFileSync } = require('fs');
const path = require('path');

// Load pre-generated data
let stopsData = null;
let stopsGeoJSON = null;

function loadData() {
  if (!stopsData) {
    try {
      stopsData = JSON.parse(readFileSync(path.join(__dirname, '../data/v1/stops.min.json'), 'utf8'));
      stopsGeoJSON = JSON.parse(readFileSync(path.join(__dirname, '../data/v1/stops.min.geojson'), 'utf8'));
    } catch (error) {
      console.error('Failed to load stops data:', error);
      throw new Error('Bus stops data not available');
    }
  }
}

async function handler(req, res, format = 'json') {
  loadData();
  
  const { query } = req;
  const { 
    bbox,           // bounding box filter: "lng1,lat1,lng2,lat2"
    service,        // filter by service number
    search,         // search by stop name
    limit = 1000    // limit results
  } = query;

  try {
    let data = format === 'geojson' ? stopsGeoJSON : stopsData;
    
    if (format === 'geojson') {
      let features = data.features;
      
      // Apply bounding box filter
      if (bbox) {
        const [minLng, minLat, maxLng, maxLat] = bbox.split(',').map(Number);
        features = features.filter(feature => {
          const [lng, lat] = feature.geometry.coordinates;
          return lng >= minLng && lng <= maxLng && lat >= minLat && lat <= maxLat;
        });
      }
      
      // Apply service filter
      if (service) {
        features = features.filter(feature => 
          feature.properties.services.includes(service)
        );
      }
      
      // Apply search filter
      if (search) {
        const searchTerm = search.toLowerCase();
        features = features.filter(feature =>
          feature.properties.name.toLowerCase().includes(searchTerm) ||
          feature.properties.road.toLowerCase().includes(searchTerm)
        );
      }
      
      // Apply limit
      features = features.slice(0, parseInt(limit));
      
      return send(res, 200, {
        ...data,
        features,
        meta: {
          total: features.length,
          bbox,
          service,
          search,
          limit: parseInt(limit)
        }
      });
    } else {
      // JSON format processing...
      let stops = Object.entries(data);
      
      // Apply filters similar to GeoJSON format
      // ... (filtering logic)
      
      return send(res, 200, {
        stops: Object.fromEntries(stops),
        meta: {
          total: stops.length,
          bbox,
          service,
          search,
          limit: parseInt(limit)
        }
      });
    }
  } catch (error) {
    return send(res, 500, {
      error: 'Failed to fetch bus stops',
      message: error.message
    });
  }
}

module.exports = handler;