const { ResponseHandler, Validators, HttpClient } = require('./lib');
const { readFileSync } = require('fs');
const path = require('path');

// Load pre-generated data
let stopsData = null;
let stopsGeoJSON = null;

function loadData() {
  if (!stopsData) {
    try {
      // Always source from the canonical JSON dataset
      const raw = readFileSync(path.join(__dirname, '../data/v1/stops.json'), 'utf8');
      stopsData = JSON.parse(raw);

      // Build GeoJSON once from stops.json for consistent searchability
      const features = [];
      for (const [stopCode, stopInfo] of Object.entries(stopsData)) {
        let lat;
        let lng;
        let name = '';
        let road = '';
        let services = [];

        if (Array.isArray(stopInfo)) {
          // Expected schema: [lng, lat, name, road]
          lng = parseFloat(stopInfo[0]);
          lat = parseFloat(stopInfo[1]);
          name = typeof stopInfo[2] === 'string' ? stopInfo[2] : '';
          road = typeof stopInfo[3] === 'string' ? stopInfo[3] : '';
        } else {
          if (Array.isArray(stopInfo.coordinates) && stopInfo.coordinates.length >= 2) {
            // coordinates: [lng, lat]
            lng = parseFloat(stopInfo.coordinates[0]);
            lat = parseFloat(stopInfo.coordinates[1]);
          } else if (stopInfo.lat !== undefined && stopInfo.lng !== undefined) {
            lat = parseFloat(stopInfo.lat);
            lng = parseFloat(stopInfo.lng);
          }
          name = stopInfo.name || '';
          road = stopInfo.road || '';
          services = Array.isArray(stopInfo.services) ? stopInfo.services : [];
        }

        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
          continue;
        }

        features.push({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [lng, lat]
          },
          properties: {
            code: stopCode,
            name,
            road,
            services
          }
        });
      }

      stopsGeoJSON = { type: 'FeatureCollection', features };

      console.log('Successfully loaded bus stops data');
      console.log(`Loaded ${Object.keys(stopsData).length} bus stops from stops.json`);
      console.log(`Constructed ${stopsGeoJSON.features.length} GeoJSON features from stops.json`);
    } catch (error) {
      console.error('Failed to load stops data:', error);
      console.error('Attempted to load from:', path.join(__dirname, '../data/v1/stops.json'));
      throw new Error('Bus stops data not available');
    }
  }
}

module.exports = async (req, res) => {
  try {
    loadData();
    
    const { bbox, service, search, limit } = req.query;
    const format = req.query.format || 'json';

    console.log(`[DEBUG] Bus stops API request - format: ${format}, search: ${search}, service: ${service}, limit: ${limit}`);

    // Validate parameters
    const limitValidation = Validators.validateLimit(limit, 1000);
    if (!limitValidation.valid) {
      return ResponseHandler.badRequest(res, limitValidation.error);
    }

    const bboxValidation = Validators.validateBbox(bbox);
    if (!bboxValidation.valid) {
      return ResponseHandler.badRequest(res, bboxValidation.error);
    }

    // Remote-first when a search term is provided, to mirror deployed behavior
    if (search) {
      try {
        const client = new HttpClient('https://sg-bus-data-api.vercel.app');
        const params = new URLSearchParams();
        params.set('search', search);
        if (service) params.set('service', service);
        if (bbox) params.set('bbox', bbox);
        params.set('limit', String(limitValidation.value));
        params.set('format', format);

        const remote = await client.get(`/api/bus-stops?${params.toString()}`);
        if (remote.success && remote.data && remote.data.data) {
          return ResponseHandler.success(res, remote.data.data, {
            meta: { source: 'remote', search, service, bbox, limit: limitValidation.value, format }
          });
        }
      } catch (e) {
        console.warn('Remote-first search failed, falling back to local dataset:', e.message);
      }
    }

    let data = format === 'geojson' ? stopsGeoJSON : stopsData;
    
    if (format === 'geojson') {
      let features = data.features;
      console.log(`[DEBUG] Starting with ${features.length} GeoJSON features`);
      
      // Apply bounding box filter
      if (bboxValidation.value) {
        const [minLng, minLat, maxLng, maxLat] = bboxValidation.value;
        features = features.filter(feature => {
          const [lng, lat] = feature.geometry.coordinates;
          return lng >= minLng && lng <= maxLng && lat >= minLat && lat <= maxLat;
        });
        console.log(`[DEBUG] After bbox filter: ${features.length} features`);
      }
      
      // Apply service filter
      if (service) {
        features = features.filter(feature => 
          feature.properties.services && 
          Array.isArray(feature.properties.services) && 
          feature.properties.services.includes(service)
        );
        console.log(`[DEBUG] After service filter (${service}): ${features.length} features`);
      }
      
      // Apply search filter
      if (search) {
        const searchTerm = search.toLowerCase();
        features = features.filter(feature => {
          const props = feature.properties;
          return (props.name && props.name.toLowerCase().includes(searchTerm)) ||
                 (props.road && props.road.toLowerCase().includes(searchTerm)) ||
                 (props.code && props.code.toLowerCase().includes(searchTerm));
        });
        console.log(`[DEBUG] After search filter (${searchTerm}): ${features.length} features`);
      }
      
      // If no local results and a search term exists, fall back to hosted API
      if (features.length === 0 && search) {
        try {
          const client = new HttpClient('https://sg-bus-data-api.vercel.app');
          const remote = await client.get(`/api/bus-stops?search=${encodeURIComponent(search)}&limit=${limitValidation.value}&format=geojson`);
          if (remote.success && remote.data && remote.data.data) {
            const remoteData = remote.data.data;
            return ResponseHandler.success(res, remoteData, {
              meta: { source: 'remote', search, limit: limitValidation.value, format: 'geojson' }
            });
          }
        } catch (e) {
          console.warn('Remote fallback failed (geojson):', e.message);
        }
      }

      // Apply limit
      const originalCount = features.length;
      features = features.slice(0, limitValidation.value);
      console.log(`[DEBUG] After limit (${limitValidation.value}): ${features.length} features (from ${originalCount})`);
      
      return ResponseHandler.success(res, {
        type: data.type,
        features
      }, {
        meta: {
          total: features.length,
          totalBeforeLimit: originalCount,
          bbox,
          service,
          search,
          limit: limitValidation.value,
          format: 'geojson'
        }
      });
    } else {
      // JSON format processing
      let stops = Object.entries(data);
      console.log(`[DEBUG] Starting with ${stops.length} JSON stops`);
      
      // Apply service filter
      if (service) {
        stops = stops.filter(([stopCode, stopData]) =>
          stopData.services && 
          Array.isArray(stopData.services) && 
          stopData.services.includes(service)
        );
        console.log(`[DEBUG] After service filter (${service}): ${stops.length} stops`);
      }
      
      // Apply search filter
      if (search) {
        const searchTerm = search.toLowerCase();
        stops = stops.filter(([stopCode, stopData]) => {
          if (Array.isArray(stopData)) {
            const name = typeof stopData[2] === 'string' ? stopData[2].toLowerCase() : '';
            const road = typeof stopData[3] === 'string' ? stopData[3].toLowerCase() : '';
            return name.includes(searchTerm) || road.includes(searchTerm) || stopCode.toLowerCase().includes(searchTerm);
          }
          const hasName = stopData.name && typeof stopData.name === 'string' && stopData.name.toLowerCase().includes(searchTerm);
          const hasRoad = stopData.road && typeof stopData.road === 'string' && stopData.road.toLowerCase().includes(searchTerm);
          return hasName || hasRoad || stopCode.toLowerCase().includes(searchTerm);
        });
        console.log(`[DEBUG] After search filter (${searchTerm}): ${stops.length} stops`);
      }
      
      // Apply bounding box filter for JSON format
      if (bboxValidation.value) {
        const [minLng, minLat, maxLng, maxLat] = bboxValidation.value;
        stops = stops.filter(([stopCode, stopData]) => {
          if (stopData.coordinates && Array.isArray(stopData.coordinates) && stopData.coordinates.length >= 2) {
            const [lng, lat] = stopData.coordinates;
            return lng >= minLng && lng <= maxLng && lat >= minLat && lat <= maxLat;
          }
          // If coordinates are stored differently, try lat/lng properties
          if (stopData.lat !== undefined && stopData.lng !== undefined) {
            const lat = parseFloat(stopData.lat);
            const lng = parseFloat(stopData.lng);
            return lng >= minLng && lng <= maxLng && lat >= minLat && lat <= maxLat;
          }
          // Array schema: [lng, lat, name, road]
          if (Array.isArray(stopData) && stopData.length >= 2) {
            const lng = parseFloat(stopData[0]);
            const lat = parseFloat(stopData[1]);
            return lng >= minLng && lng <= maxLng && lat >= minLat && lat <= maxLat;
          }
          return false;
        });
        console.log(`[DEBUG] After bbox filter: ${stops.length} stops`);
      }
      
      // If no local results and a search term exists, fall back to hosted API
      if (stops.length === 0 && search) {
        try {
          const client = new HttpClient('https://sg-bus-data-api.vercel.app');
          const remote = await client.get(`/api/bus-stops?search=${encodeURIComponent(search)}&limit=${limitValidation.value}&format=json`);
          if (remote.success && remote.data && remote.data.data && remote.data.data.stops) {
            return ResponseHandler.success(res, { stops: remote.data.data.stops }, {
              meta: { source: 'remote', search, limit: limitValidation.value, format: 'json' }
            });
          }
        } catch (e) {
          console.warn('Remote fallback failed (json):', e.message);
        }
      }

      // Apply limit
      const originalCount = stops.length;
      stops = stops.slice(0, limitValidation.value);
      console.log(`[DEBUG] After limit (${limitValidation.value}): ${stops.length} stops (from ${originalCount})`);
      
      return ResponseHandler.success(res, {
        stops: Object.fromEntries(stops)
      }, {
        meta: {
          total: stops.length,
          totalBeforeLimit: originalCount,
          service,
          search,
          limit: limitValidation.value,
          format: 'json'
        }
      });
    }
  } catch (error) {
    console.error('Bus stops API Error:', error);
    console.error('Error stack:', error.stack);
    return ResponseHandler.internalError(res, 'Failed to fetch bus stops', {
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};