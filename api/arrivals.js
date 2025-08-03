const { send } = require('micro');
const got = require('got');

const LTA_API_BASE = 'https://datamall2.mytransport.sg/ltaodataservice';
const API_KEY = process.env.DatamallAccountKey;

async function handler(req, res) {
  const { query } = req;
  const { busStopCode, serviceNo } = query;
  
  if (!busStopCode) {
    return send(res, 400, {
      error: 'Bad Request',
      message: 'busStopCode parameter is required'
    });
  }
  
  if (!API_KEY) {
    return send(res, 500, {
      error: 'Configuration Error',
      message: 'DataMall API key not configured'
    });
  }

  try {
    let url = `${LTA_API_BASE}/BusArrivalv2?BusStopCode=${busStopCode}`;
    if (serviceNo) {
      url += `&ServiceNo=${serviceNo}`;
    }

    const response = await got(url, {
      headers: {
        AccountKey: API_KEY
      },
      responseType: 'json',
      timeout: 10000
    });

    const { BusStopCode, Services } = response.body;
    
    // Process and format the arrival data
    const arrivals = Services.map(service => {
      const { ServiceNo, Operator, NextBus, NextBus2, NextBus3 } = service;
      
      const formatBus = (bus) => {
        if (!bus.EstimatedArrival) return null;
        
        const arrivalTime = new Date(bus.EstimatedArrival);
        const now = new Date();
        const minutesAway = Math.max(0, Math.round((arrivalTime - now) / 60000));
        
        return {
          estimatedArrival: bus.EstimatedArrival,
          minutesAway,
          load: bus.Load, // 'SEA' = Seats Available, 'SDA' = Standing Available, 'LSD' = Limited Standing
          feature: bus.Feature, // 'WAB' = Wheelchair Accessible Bus
          type: bus.Type, // 'SD' = Single Deck, 'DD' = Double Deck, 'BD' = Bendy
          latitude: parseFloat(bus.Latitude) || null,
          longitude: parseFloat(bus.Longitude) || null
        };
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

    return send(res, 200, {
      busStopCode: BusStopCode,
      arrivals,
      timestamp: new Date().toISOString(),
      meta: {
        total: arrivals.length,
        serviceFilter: serviceNo || null
      }
    });
  } catch (error) {
    console.error('Arrivals API Error:', error);
    return send(res, 500, {
      error: 'Failed to fetch bus arrivals',
      message: error.message
    });
  }
}

module.exports = handler;