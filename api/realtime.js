const { ResponseHandler, Validators } = require('./utils');
const LTAService = require('./services/lta-service');

module.exports = async (req, res) => {
  try {
    const { serviceNo, skip } = req.query;
    
    // Validate parameters
    const serviceValidation = Validators.validateServiceNo(serviceNo);
    if (!serviceValidation.valid) {
      return ResponseHandler.badRequest(res, serviceValidation.error);
    }

    const skipValidation = Validators.validateSkip(skip);
    if (!skipValidation.valid) {
      return ResponseHandler.badRequest(res, skipValidation.error);
    }

    // Initialize LTA service
    const ltaService = new LTAService();
    
    // Get location data from LTA API
    const rawData = await ltaService.getBusLocations(serviceNo, skipValidation.value);
    
    // Format the data
    const positions = ltaService.formatLocationData(rawData);
    
    // Return successful response
    return ResponseHandler.success(res, {
      positions
    }, {
      meta: {
        total: positions.length,
        serviceFilter: serviceNo || null,
        skip: skipValidation.value,
        source: 'LTA DataMall BusLocationv2'
      }
    });

  } catch (error) {
    console.error('Realtime API Error:', error);
    
    // Handle specific error cases
    if (error.message.includes('DataMall API key not configured')) {
      return ResponseHandler.internalError(res, 'DataMall API key not configured');
    }
    
    if (error.message.includes('LTA API Error')) {
      return ResponseHandler.serviceUnavailable(res, 'Unable to fetch bus location data from LTA');
    }
    
    return ResponseHandler.internalError(res, 'Failed to fetch bus positions', {
      error: error.message
    });
  }
};
