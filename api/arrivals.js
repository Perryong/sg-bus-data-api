// api/arrivals.js
const { send } = require('micro');
const got = require('got');

const LTA_API_BASE = 'https://datamall2.mytransport.sg/ltaodataservice';
const API_KEY = process.env.DatamallAccountKey;

async function handler(req, res) {
  const { query } = req;
  const { busStopCode, serviceNo } = query;
  
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
    return send(res, 200, 'OK');
  }
  
  if (!busStopCode) {
    return send(res, 400, {
      error: 'Bad Request',
      message: 'busStopCode parameter is required'
    });
  }
  
  if (!API_KEY) {
    return send(res, 500, {
      error: 'Configuration Error',
      message: 'DataMall API key not configured',
      troubleshooting: 'Make sure the DatamallAccountKey environment variable is set in your Vercel deployment'
    });
  }

  try {
    // Log request details for debugging
    console.log(`Fetching arrivals for bus stop: ${busStopCode}, service: ${serviceNo || 'all'}`);
    console.log(`API Key present: ${!!API_KEY}, Key length: ${API_KEY?.length || 0}`);
    
    let url = `${LTA_API_BASE}/BusArrivalv2?BusStopCode=${busStopCode}`;
    if (serviceNo) {
      url += `&ServiceNo=${serviceNo}`;
    }

    console.log(`Making request to: ${url}`);

    // Add better error handling for the API request
    try {
      const response = await got(url, {
        headers: {
          AccountKey: API_KEY
        },
        responseType: 'json',
        timeout: 10000,
        retry: {
          limit: 2,
          methods: ['GET']
        }
      });

      console.log(`Response status: ${response.statusCode}`);
      
      // Check if the response contains the expected data
      if (!response.body || !response.body.Services) {
        console.log('Unexpected response format:', JSON.stringify(response.body));
        return send(res, 200, {
          busStopCode: busStopCode,
          arrivals: [],
          timestamp: new Date().toISOString(),
          meta: {
            total: 0,
            serviceFilter: serviceNo || null,
            message: "No services found for this bus stop or the bus stop code may be invalid"
          }
        });
      }

      const { Services } = response.body;
      
      // Process and format the arrival data
      const arrivals = Services.map(service => {
        const { ServiceNo, Operator, NextBus, NextBus2, NextBus3 } = service;
        
        const formatBus = (bus) => {
          if (!bus || !bus.EstimatedArrival) return null;
          
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
        busStopCode: busStopCode,
        arrivals,
        timestamp: new Date().toISOString(),
        meta: {
          total: arrivals.length,
          serviceFilter: serviceNo || null
        }
      });
    } catch (apiError) {
      // Handle specific API errors
      console.error('API request error:', apiError);
      
      if (apiError.response) {
        console.log(`API response status: ${apiError.response.statusCode}`);
        console.log(`API response body:`, apiError.response.body);
        
        // Handle 404 errors specially - might be an invalid bus stop code
        if (apiError.response.statusCode === 404) {
          return send(res, 404, {
            error: 'Invalid Bus Stop',
            message: `Bus stop code ${busStopCode} appears to be invalid or no longer in service`,
            suggestion: 'Try a different bus stop code. Common bus stops in Sengkang include 65061, 65099, 65111'
          });
        }
        
        // Handle 401/403 errors - API key issues
        if (apiError.response.statusCode === 401 || apiError.response.statusCode === 403) {
          return send(res, apiError.response.statusCode, {
            error: 'API Authorization Error',
            message: 'The DataMall API key appears to be invalid or unauthorized',
            troubleshooting: 'Verify your DatamallAccountKey is correctly set in Vercel'
          });
        }
      }
      
      throw apiError; // Re-throw to be caught by the outer catch
    }
  } catch (error) {
    console.error('Arrivals API Error:', error);
    
    // Provide a more helpful error message
    return send(res, 500, {
      error: 'Failed to fetch bus arrivals',
      message: error.message,
      troubleshooting: {
        apiKey: 'Verify your DatamallAccountKey is correctly set in Vercel',
        busStopCode: 'Verify the bus stop code is correct (try 65061 for testing)',
        contact: 'If issues persist, contact LTA DataMall support'
      }
    });
  }
}

module.exports = handler;