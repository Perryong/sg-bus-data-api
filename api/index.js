const { createError, json, send } = require('micro');
const cors = require('micro-cors')();
const { parse } = require('url');

// Import API handlers
const busStopsHandler = require('./bus-stops');
const busServicesHandler = require('./bus-services');
const busRoutesHandler = require('./bus-routes');
const realtimeHandler = require('./realtime');
const arrivalsHandler = require('./arrivals');

// API route mapping
const routes = {
  '/api/bus-stops': busStopsHandler,
  '/api/bus-stops/geojson': (req, res) => busStopsHandler(req, res, 'geojson'),
  '/api/bus-services': busServicesHandler,
  '/api/bus-routes': busRoutesHandler,
  '/api/bus-routes/geojson': (req, res) => busRoutesHandler(req, res, 'geojson'),
  '/api/realtime/arrivals': arrivalsHandler,
  '/api/realtime/positions': realtimeHandler,
  '/api/health': require('./health'),
  '/api/docs': require('./docs')
};

async function handler(req, res) {
  const { pathname, query } = parse(req.url, true);
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return send(res, 200, 'OK');
  }

  // Find matching route
  const routeHandler = routes[pathname];
  
  if (!routeHandler) {
    return send(res, 404, {
      error: 'Not Found',
      message: `Endpoint ${pathname} not found`,
      availableEndpoints: Object.keys(routes)
    });
  }

  try {
    // Add query parameters to request
    req.query = query;
    
    // Set common headers
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    
    return await routeHandler(req, res);
  } catch (error) {
    console.error('API Error:', error);
    return send(res, 500, {
      error: 'Internal Server Error',
      message: error.message
    });
  }
}

module.exports = cors(handler);