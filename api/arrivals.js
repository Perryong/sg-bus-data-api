// api/arrivals.js
const { ResponseHandler, Validators } = require('./utils');
const LTAService = require('./services/lta-service');

module.exports = async (req, res) => {
  try {
    const { busStopCode, serviceNo } = req.query;
    
    // Validate parameters
    const busStopValidation = Validators.validateBusStopCode(busStopCode);
    if (!busStopValidation.valid) {
      return ResponseHandler.badRequest(res, busStopValidation.error);
    }

    const serviceValidation = Validators.validateServiceNo(serviceNo);
    if (!serviceValidation.valid) {
      return ResponseHandler.badRequest(res, serviceValidation.error);
    }

    // Initialize LTA service
    const ltaService = new LTAService();
    
    // Get arrival data from LTA API
    const rawData = await ltaService.getBusArrivals(busStopCode, serviceNo);
    
    // Format the data
    const arrivals = ltaService.formatArrivalData(rawData);
    
    // Return successful response
    return ResponseHandler.success(res, {
      busStopCode,
      arrivals
    }, {
      meta: {
        total: arrivals.length,
        serviceFilter: serviceNo || null
      }
    });

  } catch (error) {
    console.error('Arrivals API Error:', error);
    
    // Handle specific error cases
    if (error.message.includes('DataMall API key not configured')) {
      return ResponseHandler.internalError(res, 'DataMall API key not configured');
    }
    
    if (error.message.includes('LTA API Error')) {
      return ResponseHandler.serviceUnavailable(res, 'Unable to fetch arrival data from LTA', {
        suggestion: 'Try a different bus stop code such as 65011 (Sengkang Int) or 01012 (Dhoby Ghaut)'
      });
    }
    
    return ResponseHandler.internalError(res, 'Failed to fetch bus arrivals', {
      error: error.message
    });
  }
};