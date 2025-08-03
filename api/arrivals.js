// api/arrivals.js
const fetch = require('node-fetch');

// This endpoint uses node-fetch instead of got for simplicity
module.exports = async (req, res) => {
  try {
    // 1. Parse query parameters
    const { busStopCode, serviceNo } = req.query;
    
    // 2. Validate required parameters
    if (!busStopCode) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'busStopCode parameter is required'
      });
    }
    
    // 3. Check for API key
    const API_KEY = process.env.DatamallAccountKey;
    if (!API_KEY) {
      return res.status(500).json({
        error: 'Configuration Error',
        message: 'DataMall API key not configured',
        debug: {
          env: Object.keys(process.env).filter(key => !key.toLowerCase().includes('key')).join(', ')
        }
      });
    }
    
    console.log(`Making request for bus stop ${busStopCode}, API key length: ${API_KEY.length}`);
    
    // 4. Build API URL
    const url = `https://datamall2.mytransport.sg/ltaodataservice/BusArrivalv2?BusStopCode=${busStopCode}${serviceNo ? `&ServiceNo=${serviceNo}` : ''}`;
    
    // 5. Make request to LTA API
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'AccountKey': API_KEY,
        'Accept': 'application/json'
      }
    });
    
    // 6. Handle API response
    if (!response.ok) {
      return res.status(response.status).json({
        error: `API Error (${response.status})`,
        message: `The LTA API returned a ${response.status} status code`,
        busStopCode,
        suggestion: 'Try a different bus stop code such as 65011 (Sengkang Int) or 01012 (Dhoby Ghaut)'
      });
    }
    
    // 7. Parse response
    const data = await response.json();
    
    // 8. Check if Services array exists
    if (!data.Services || !Array.isArray(data.Services)) {
      return res.status(200).json({
        busStopCode,
        arrivals: [],
        timestamp: new Date().toISOString(),
        meta: {
          total: 0,
          serviceFilter: serviceNo || null,
          message: "No services found for this bus stop"
        }
      });
    }
    
    // 9. Process arrival data
    const arrivals = data.Services.map(service => {
      const { ServiceNo, Operator, NextBus, NextBus2, NextBus3 } = service;
      
      // Helper function to format bus data
      const formatBus = (bus) => {
        if (!bus || !bus.EstimatedArrival) return null;
        
        try {
          const arrivalTime = new Date(bus.EstimatedArrival);
          const now = new Date();
          const minutesAway = Math.max(0, Math.round((arrivalTime - now) / 60000));
          
          return {
            estimatedArrival: bus.EstimatedArrival,
            minutesAway,
            load: bus.Load,
            feature: bus.Feature,
            type: bus.Type,
            latitude: parseFloat(bus.Latitude) || null,
            longitude: parseFloat(bus.Longitude) || null
          };
        } catch (e) {
          console.error('Error formatting bus data:', e);
          return null;
        }
      };
      
      return {
        serviceNo: ServiceNo,
        operator: Operator,
        buses: [
          formatBus(NextBus),
          formatBus(NextBus2),
          formatBus(NextBus3)
        ].filter(Boolean)
      };
    });
    
    // 10. Send successful response
    return res.status(200).json({
      busStopCode,
      arrivals,
      timestamp: new Date().toISOString(),
      meta: {
        total: arrivals.length,
        serviceFilter: serviceNo || null
      }
    });
  } catch (error) {
    // 11. Handle unexpected errors
    console.error('Arrivals API Error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: error.message,
      trace: error.stack
    });
  }
};