// api/arrivals.js
const { ResponseHandler, Validators } = require('./lib');
const LTAService = require('./lib/lta-service');

module.exports = async (req, res) => {
  try {
    const { busStopCode, serviceNo } = req.query;
    
    console.log(`[DEBUG] Arrivals API request for busStopCode: ${busStopCode}, serviceNo: ${serviceNo}`);
    
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
    
    // Log API key status
    console.log(`[DEBUG] API Key configured: ${Boolean(process.env.DatamallAccountKey)}`);
    
    // Get arrival data from LTA API
    const rawData = await ltaService.getBusArrivals(busStopCode, serviceNo);
    
    // Format the data
    const arrivals = ltaService.formatArrivalData(rawData);
    
    console.log(`[DEBUG] Successfully retrieved ${arrivals.length} arrivals`);
    
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
        suggestion: 'Try a different bus stop code such as 65011 (Sengkang Int) or 01012 (Dhoby Ghaut)',
        error: error.message // Add more error details
      });
    }
    
    return ResponseHandler.internalError(res, 'Failed to fetch bus arrivals', {
      error: error.message
    });
  }
};