// api/realtime.js
const { ResponseHandler, Validators } = require('./lib');
const LTAService = require('./lib/lta-service');

module.exports = async (req, res) => {
  try {
    const { serviceNo, skip } = req.query;
    console.log(`[DEBUG] Realtime API request for serviceNo: ${serviceNo}, skip: ${skip}`);
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
    // Log API key status
    console.log(`[DEBUG] API Key configured: ${Boolean(process.env.DatamallAccountKey)}`);
    // Get location data from LTA API
    const rawData = await ltaService.getBusLocations(serviceNo, skipValidation.value);
    // Format the data
    const positions = ltaService.formatLocationData(rawData);
    console.log(`[DEBUG] Successfully retrieved ${positions.length} bus positions`);
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
      return ResponseHandler.serviceUnavailable(res, 'Unable to fetch bus location data from LTA', {
        error: error.message // Add more error details

      });
    }
    return ResponseHandler.internalError(res, 'Failed to fetch bus positions', {
      error: error.message
    });
  }