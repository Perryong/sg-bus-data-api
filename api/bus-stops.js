const { ResponseHandler, Validators } = require('./utils');
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

module.exports = async (req, res) => {
  try {
    loadData();
    
    const { bbox, service, search, limit } = req.query;
    const format = req.query.format || 'json';

    // Validate parameters
    const limitValidation = Validators.validateLimit(limit, 1000);
    if (!limitValidation.valid) {
      return ResponseHandler.badRequest(res, limitValidation.error);
    }

    const bboxValidation = Validators.validateBbox(bbox);
    if (!bboxValidation.valid) {
      return ResponseHandler.badRequest(res, bboxValidation.error);
    }

    let data = format === 'geojson' ? stopsGeoJSON : stopsData;
    
    if (format === 'geojson') {
      let features = data.features;
      
      // Apply bounding box filter
      if (bboxValidation.value) {
        const [minLng, minLat, maxLng, maxLat] = bboxValidation.value;
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
      features = features.slice(0, limitValidation.value);
      
      return ResponseHandler.success(res, {
        ...data,
        features
      }, {
        meta: {
          total: features.length,
          bbox,
          service,
          search,
          limit: limitValidation.value
        }
      });
    } else {
      // JSON format processing
      let stops = Object.entries(data);
      
      // Apply service filter
      if (service) {
        stops = stops.filter(([stopCode, stopData]) =>
          stopData.services.includes(service)
        );
      }
      
      // Apply search filter
      if (search) {
        const searchTerm = search.toLowerCase();
        stops = stops.filter(([stopCode, stopData]) =>
          stopData.name.toLowerCase().includes(searchTerm) ||
          stopData.road.toLowerCase().includes(searchTerm)
        );
      }
      
      // Apply limit
      stops = stops.slice(0, limitValidation.value);
      
      return ResponseHandler.success(res, {
        stops: Object.fromEntries(stops)
      }, {
        meta: {
          total: stops.length,
          service,
          search,
          limit: limitValidation.value
        }
      });
    }
  } catch (error) {
    console.error('Bus stops API Error:', error);
    return ResponseHandler.internalError(res, 'Failed to fetch bus stops', {
      error: error.message
    });
  }
};