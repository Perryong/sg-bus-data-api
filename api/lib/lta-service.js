// api/lib/lta-service.js
const { HttpClient } = require('./');

class LTAService {
  constructor() {
    this.apiKey = process.env.DatamallAccountKey;
    this.baseURL = 'https://datamall2.mytransport.sg/ltaodataservice';
    this.client = new HttpClient(this.baseURL, {
      'AccountKey': this.apiKey,
      'Accept': 'application/json'
    });
  }

  validateApiKey() {
    if (!this.apiKey) {
      throw new Error('DataMall API key not configured');
    }
  }

  async getBusArrivals(busStopCode, serviceNo = null) {
    this.validateApiKey();
    
    let endpoint = `/v3/BusArrival?BusStopCode=${busStopCode}`;
    if (serviceNo) {
      endpoint += `&ServiceNo=${serviceNo}`;
    }

    console.log(`[DEBUG] LTA API Request: ${endpoint}`);
    
    const response = await this.client.get(endpoint);
    
    console.log(`[DEBUG] LTA API Response status: ${response.status}, success: ${response.success}`);
    
    if (!response.success) {
      console.log(`[DEBUG] LTA API Error Details:`, JSON.stringify({
        error: response.error,
        status: response.status
      }));
      throw new Error(`LTA API Error: ${response.error}`);
    }

    return response.data;
  }

  // Modified method with multiple endpoint attempts
  async getBusLocations(serviceNo = null, skip = 0) {
    this.validateApiKey();
    
    // Array of potential endpoint formats to try
    const endpointFormats = [
      // Original format
      `/BusLocationv2?$skip=${skip}${serviceNo ? `&ServiceNo=${serviceNo}` : ''}`,
      
      // Alternative format without $ prefix on skip
      `/BusLocationv2?skip=${skip}${serviceNo ? `&ServiceNo=${serviceNo}` : ''}`,
      
      // Alternative versioning pattern
      `/v2/BusLocation?$skip=${skip}${serviceNo ? `&ServiceNo=${serviceNo}` : ''}`,
      
      // Alternative with different version
      `/v1/BusLocation?$skip=${skip}${serviceNo ? `&ServiceNo=${serviceNo}` : ''}`,
      
      // Try without versioning in path and with simpler params
      `/BusLocation?skip=${skip}${serviceNo ? `&ServiceNo=${serviceNo}` : ''}`
    ];
    
    let lastError = null;
    
    // Try each endpoint format
    for (const endpoint of endpointFormats) {
      try {
        console.log(`[DEBUG] Trying LTA API Request: ${endpoint}`);
        
        const response = await this.client.get(endpoint);
        
        console.log(`[DEBUG] LTA API Response status: ${response.status}, success: ${response.success}`);
        
        if (response.success) {
          console.log(`[DEBUG] Successful endpoint found: ${endpoint}`);
          return response.data;
        }
        
        console.log(`[DEBUG] LTA API Error Details:`, JSON.stringify({
          error: response.error,
          status: response.status,
          endpoint
        }));
        
        lastError = response.error;
      } catch (error) {
        console.log(`[DEBUG] Error with endpoint ${endpoint}:`, error.message);
        lastError = error.message;
      }
    }
    
    // If we reached here, all attempts failed
    throw new Error(`LTA API Error: Failed to fetch bus locations. Last error: ${lastError}`);
  }

  // Alternative method to use bus arrival data as a fallback for location
  async getBusLocationsFromArrivals(serviceNo = null) {
    try {
      console.log(`[DEBUG] Attempting to get bus locations from arrivals data for service: ${serviceNo || 'all'}`);
      
      // Get list of bus stops (limited to 20 for performance)
      const busStopsEndpoint = `/BusStops?$skip=0`;
      const busStopsResponse = await this.client.get(busStopsEndpoint);
      
      if (!busStopsResponse.success || !busStopsResponse.data || !busStopsResponse.data.value) {
        throw new Error('Failed to fetch bus stops');
      }
      
      // Limit to first 20 bus stops for this fallback method
      const busStops = busStopsResponse.data.value.slice(0, 20);
      
      console.log(`[DEBUG] Retrieved ${busStops.length} bus stops for location fallback`);
      
      // Collect bus positions from multiple bus stops
      const busPositions = [];
      
      for (const stop of busStops) {
        try {
          const busStopCode = stop.BusStopCode;
          const arrivalsData = await this.getBusArrivals(busStopCode, serviceNo);
          
          if (arrivalsData && arrivalsData.Services && Array.isArray(arrivalsData.Services)) {
            arrivalsData.Services.forEach(service => {
              // Extract position data from NextBus, NextBus2, NextBus3
              [service.NextBus, service.NextBus2, service.NextBus3]
                .filter(bus => bus && bus.Latitude && bus.Longitude)
                .forEach(bus => {
                  busPositions.push({
                    ServiceNo: service.ServiceNo,
                    BusId: bus.VisitNumber || 'Unknown',
                    Operator: service.Operator,
                    Latitude: bus.Latitude,
                    Longitude: bus.Longitude,
                    Bearing: '0', // Not available in arrivals data
                    GPSTimestamp: bus.EstimatedArrival,
                    CongestionLevel: bus.Load || 'Unknown',
                    BusType: bus.Type || 'Unknown'
                  });
                });
            });
          }
        } catch (error) {
          console.log(`[DEBUG] Error getting arrivals for stop ${stop.BusStopCode}:`, error.message);
          // Continue with next bus stop
        }
      }
      
      // Create a compatible response format
      return {
        value: busPositions
      };
      
    } catch (error) {
      console.error('[DEBUG] Failed to get bus locations from arrivals:', error);
      throw new Error(`Failed to get bus locations from arrivals: ${error.message}`);
    }
  }

  formatArrivalData(rawData) {
    if (!rawData || !rawData.Services || !Array.isArray(rawData.Services)) {
      return [];
    }

    return rawData.Services.map(service => {
      const { ServiceNo, Operator, NextBus, NextBus2, NextBus3 } = service;
      
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
            monitored: bus.Monitored === 1,
            visitNumber: bus.VisitNumber,
            originCode: bus.OriginCode,
            destinationCode: bus.DestinationCode,
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
  }

  formatLocationData(rawData) {
    if (!rawData || !rawData.value || !Array.isArray(rawData.value)) {
      return [];
    }

    return rawData.value.map(bus => ({
      serviceNo: bus.ServiceNo,
      busId: bus.BusId,
      operator: bus.Operator,
      coordinates: [parseFloat(bus.Longitude), parseFloat(bus.Latitude)],
      bearing: parseFloat(bus.Bearing) || 0,
      timestamp: bus.GPSTimestamp,
      congestion: bus.CongestionLevel,
      busType: bus.BusType
    })).filter(bus => 
      // Filter out invalid coordinates
      bus.coordinates[0] !== 0 && bus.coordinates[1] !== 0
    );
  }
}

module.exports = LTAService;