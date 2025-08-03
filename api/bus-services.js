const { send } = require('micro');
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

async function handler(req, res) {
  loadData();
  
  const { query } = req;
  const { 
    search,         // search by service number or name
    origin,         // filter services passing through origin stop
    destination,    // filter services passing through destination stop
    limit = 100
  } = query;

  try {
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
    services = services.slice(0, parseInt(limit));
    
    return send(res, 200, {
      services: Object.fromEntries(services),
      meta: {
        total: services.length,
        search,
        origin,
        destination,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Services API Error:', error);
    return send(res, 500, {
      error: 'Failed to fetch bus services',
      message: error.message
    });
  }
}

module.exports = handler;