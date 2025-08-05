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

  async getBusLocations(serviceNo = null, skip = 0) {
    this.validateApiKey();
    
    let endpoint = `/BusLocationv2?$skip=${skip}`;
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