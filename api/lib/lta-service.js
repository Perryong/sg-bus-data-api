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

    // Log a sample of the response structure for debugging
    if (response.data && response.data.Services && response.data.Services.length > 0) {
      const sampleService = response.data.Services[0];
      console.log(`[DEBUG] Sample service structure:`, {
        serviceNo: sampleService.ServiceNo,
        operator: sampleService.Operator,
        nextBusFields: sampleService.NextBus ? Object.keys(sampleService.NextBus) : 'No NextBus data',
        nextBus2Fields: sampleService.NextBus2 ? Object.keys(sampleService.NextBus2) : 'No NextBus2 data',
        nextBus3Fields: sampleService.NextBus3 ? Object.keys(sampleService.NextBus3) : 'No NextBus3 data'
      });
      
      // Log coordinate fields if they exist
      if (sampleService.NextBus) {
        const coordFields = ['Latitude', 'Longitude', 'Lat', 'Lng', 'latitude', 'longitude'];
        const foundCoords = coordFields.filter(field => sampleService.NextBus.hasOwnProperty(field));
        if (foundCoords.length > 0) {
          console.log(`[DEBUG] Found coordinate fields:`, foundCoords);
          foundCoords.forEach(field => {
            console.log(`[DEBUG] ${field}:`, sampleService.NextBus[field]);
          });
        } else {
          console.log(`[DEBUG] No coordinate fields found in NextBus data`);
        }
      }
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
          
          // Enhanced coordinate parsing with multiple field name variations
          const getCoordinate = (obj, latField, lngField) => {
            const lat = obj[latField];
            const lng = obj[lngField];
            
            // Try to parse as float, handle various formats
            const parsedLat = lat !== undefined && lat !== null && lat !== '' ? parseFloat(lat) : null;
            const parsedLng = lng !== undefined && lng !== null && lng !== '' ? parseFloat(lng) : null;
            
            // Validate coordinates are within reasonable bounds
            if (parsedLat !== null && (parsedLat < -90 || parsedLat > 90)) {
              console.log(`[DEBUG] Invalid latitude value: ${lat} (parsed: ${parsedLat})`);
              return { latitude: null, longitude: null };
            }
            
            if (parsedLng !== null && (parsedLng < -180 || parsedLng > 180)) {
              console.log(`[DEBUG] Invalid longitude value: ${lng} (parsed: ${parsedLng})`);
              return { latitude: null, longitude: null };
            }
            
            return { latitude: parsedLat, longitude: parsedLng };
          };
          
          // Try multiple possible field name variations
          let coordinates = getCoordinate(bus, 'Latitude', 'Longitude');
          if (coordinates.latitude === null && coordinates.longitude === null) {
            coordinates = getCoordinate(bus, 'Lat', 'Lng');
          }
          if (coordinates.latitude === null && coordinates.longitude === null) {
            coordinates = getCoordinate(bus, 'latitude', 'longitude');
          }
          
          // Log coordinate availability for debugging
          if (coordinates.latitude !== null || coordinates.longitude !== null) {
            console.log(`[DEBUG] Found coordinates for bus: ${coordinates.latitude}, ${coordinates.longitude}`);
          } else {
            console.log(`[DEBUG] No coordinates found for bus. Available fields:`, Object.keys(bus));
          }
          
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
            latitude: coordinates.latitude,
            longitude: coordinates.longitude
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