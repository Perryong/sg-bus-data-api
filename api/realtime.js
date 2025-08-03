const { send } = require('micro');
const got = require('got');

const LTA_API_BASE = 'https://datamall2.mytransport.sg/ltaodataservice';
const API_KEY = process.env.DatamallAccountKey;

async function handler(req, res) {
  const { query } = req;
  const { serviceNo, skip = 0 } = query;
  
  if (!API_KEY) {
    return send(res, 500, {
      error: 'Configuration Error', 
      message: 'DataMall API key not configured. Real-time features are disabled.',
      suggestion: 'Please set the DatamallAccountKey environment variable.'
    });
  }

  try {
    let url = `${LTA_API_BASE}/BusLocationv2?$skip=${skip}`;
    if (serviceNo) {
      url += `&ServiceNo=${serviceNo}`;
    }

    const response = await got(url, {
      headers: {
        AccountKey: API_KEY
      },
      responseType: 'json',
      timeout: 15000
    });

    const positions = response.body.value.map(bus => ({
      serviceNo: bus.ServiceNo,
      busId: bus.BusId,
      operator: bus.Operator,
      coordinates: [parseFloat(bus.Longitude), parseFloat(bus.Latitude)],
      bearing: parseFloat(bus.Bearing) || 0,
      timestamp: bus.GPSTimestamp,
      congestion: bus.CongestionLevel, // 0 = No congestion, 1 = Light, 2 = Moderate, 3 = Heavy
      busType: bus.BusType // 'SD' = Single Deck, 'DD' = Double Deck, 'BD' = Bendy
    })).filter(bus => 
      // Filter out invalid coordinates
      bus.coordinates[0] !== 0 && bus.coordinates[1] !== 0
    );

    return send(res, 200, {
      positions,
      timestamp: new Date().toISOString(),
      meta: {
        total: positions.length,
        serviceFilter: serviceNo || null,
        skip: parseInt(skip),
        source: 'LTA DataMall BusLocationv2'
      }
    });
  } catch (error) {
    console.error('Realtime API Error:', error);
    
    // Handle specific error cases
    if (error.response?.statusCode === 401) {
      return send(res, 401, {
        error: 'Unauthorized',
        message: 'Invalid DataMall API key'
      });
    } else if (error.response?.statusCode === 429) {
      return send(res, 429, {
        error: 'Rate Limited',
        message: 'Too many requests to DataMall API'
      });
    }
    
    return send(res, 500, {
      error: 'Failed to fetch bus positions',
      message: error.message
    });
  }
}

module.exports = handler;
