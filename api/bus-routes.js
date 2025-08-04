const { ResponseHandler, Validators } = require('./utils');
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

module.exports = async (req, res) => {
  try {
    loadData();
    
    const { service, bbox, simplified = 'true' } = req.query;
    const format = req.query.format || 'json';

    // Validate parameters
    const bboxValidation = Validators.validateBbox(bbox);
    if (!bboxValidation.valid) {
      return ResponseHandler.badRequest(res, bboxValidation.error);
    }

    if (format === 'geojson') {
      let features = routesGeoJSON.features;
      
      // Apply service filter
      if (service) {
        features = features.filter(feature => 
          feature.properties.number === service
        );
      }
      
      // Apply bounding box filter
      if (bboxValidation.value) {
        const [minLng, minLat, maxLng, maxLat] = bboxValidation.value;
        features = features.filter(feature => {
          const coords = feature.geometry.coordinates;
          return coords.some(([lng, lat]) => 
            lng >= minLng && lng <= maxLng && lat >= minLat && lat <= maxLat
          );
        });
      }
      
      return ResponseHandler.success(res, {
        type: 'FeatureCollection',
        features
      }, {
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
      
      return ResponseHandler.success(res, {
        routes
      }, {
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
    return ResponseHandler.internalError(res, 'Failed to fetch bus routes', {
      error: error.message
    });
  }
};