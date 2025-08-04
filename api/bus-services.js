const { ResponseHandler, Validators } = require('./utils');
const { readFileSync } = require('fs');
const path = require('path');

let servicesData = null;

function loadData() {
  if (!servicesData) {
    try {
      servicesData = JSON.parse(readFileSync(path.join(__dirname, '../data/v1/services.min.json'), 'utf8'));
    } catch (error) {
      console.error('Failed to load services data:', error);
      throw new Error('Bus services data not available');
    }
  }
}

module.exports = async (req, res) => {
  try {
    loadData();
    
    const { search, origin, destination, limit } = req.query;

    // Validate parameters
    const limitValidation = Validators.validateLimit(limit, 100);
    if (!limitValidation.valid) {
      return ResponseHandler.badRequest(res, limitValidation.error);
    }

    let services = Object.entries(servicesData);
    
    // Apply search filter
    if (search) {
      const searchTerm = search.toLowerCase();
      services = services.filter(([serviceNumber, serviceData]) =>
        serviceNumber.toLowerCase().includes(searchTerm) ||
        serviceData.name.toLowerCase().includes(searchTerm)
      );
    }
    
    // Apply origin filter
    if (origin) {
      services = services.filter(([serviceNumber, serviceData]) =>
        serviceData.routes.some(route => route.includes(origin))
      );
    }
    
    // Apply destination filter
    if (destination) {
      services = services.filter(([serviceNumber, serviceData]) =>
        serviceData.routes.some(route => route.includes(destination))
      );
    }
    
    // Apply limit
    services = services.slice(0, limitValidation.value);
    
    return ResponseHandler.success(res, {
      services: Object.fromEntries(services)
    }, {
      meta: {
        total: services.length,
        search,
        origin,
        destination,
        limit: limitValidation.value
      }
    });
  } catch (error) {
    console.error('Services API Error:', error);
    return ResponseHandler.internalError(res, 'Failed to fetch bus services', {
      error: error.message
    });
  }
};