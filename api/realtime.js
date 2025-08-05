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
    
    let rawData;
    let usedFallback = false;
    
    try {
      // First try the primary method to get bus locations
      rawData = await ltaService.getBusLocations(serviceNo, skipValidation.value);
    } catch (locationError) {
      console.error('[DEBUG] Primary location method failed:', locationError.message);
      
      // If the API call fails with 404, try the fallback method
      if (locationError.message.includes('404')) {
        console.log('[DEBUG] Attempting fallback method using bus arrivals data');
        try {
          rawData = await ltaService.getBusLocationsFromArrivals(serviceNo);
          usedFallback = true;
        } catch (fallbackError) {
          console.error('[DEBUG] Fallback method failed:', fallbackError.message);
          throw new Error(`BusLocationv2 API error: ${locationError.message}. Fallback also failed: ${fallbackError.message}`);
        }
      } else {
        // If not a 404, rethrow the original error
        throw locationError;
      }
    }
    
    // Format the data
    const positions = ltaService.formatLocationData(rawData);
    
    console.log(`[DEBUG] Successfully retrieved ${positions.length} bus positions${usedFallback ? ' (using fallback method)' : ''}`);
    
    // Return successful response
    return ResponseHandler.success(res, {
      positions
    }, {
      meta: {
        total: positions.length,
        serviceFilter: serviceNo || null,
        skip: skipValidation.value,
        source: usedFallback ? 'Derived from BusArrival data' : 'LTA DataMall BusLocationv2',
        note: usedFallback ? 'Using fallback method due to BusLocationv2 API unavailability' : undefined
      }
    });

  } catch (error) {
    console.error('Realtime API Error:', error);
    
    // Handle specific error cases
    if (error.message.includes('DataMall API key not configured')) {
      return ResponseHandler.internalError(res, 'DataMall API key not configured');
    }
    
    if (error.message.includes('maintenance')) {
      return ResponseHandler.serviceUnavailable(res, 'LTA API currently undergoing maintenance', {
        suggestion: 'The API might be unavailable due to scheduled maintenance. Please try again later.',
        error: error.message
      });
    }
    
    if (error.message.includes('LTA API Error')) {
      return ResponseHandler.serviceUnavailable(res, 'Unable to fetch bus location data from LTA', {
        suggestion: 'This might be due to a temporary issue with the LTA DataMall service or an API change. Try the bus arrival endpoint as an alternative.',
        error: error.message
      });
    }
    
    return ResponseHandler.internalError(res, 'Failed to fetch bus positions', {
      error: error.message
    });
  }
};