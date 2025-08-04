class Validators {
  static validateBusStopCode(busStopCode) {
    if (!busStopCode) {
      return { valid: false, error: 'busStopCode parameter is required' };
    }
    
    if (typeof busStopCode !== 'string' || busStopCode.trim().length === 0) {
      return { valid: false, error: 'busStopCode must be a non-empty string' };
    }
    
    // Bus stop codes are typically 5 digits
    if (!/^\d{5}$/.test(busStopCode)) {
      return { valid: false, error: 'busStopCode must be a 5-digit number' };
    }
    
    return { valid: true };
  }

  static validateServiceNo(serviceNo) {
    if (!serviceNo) {
      return { valid: true }; // Optional parameter
    }
    
    if (typeof serviceNo !== 'string' || serviceNo.trim().length === 0) {
      return { valid: false, error: 'serviceNo must be a non-empty string' };
    }
    
    // Service numbers can be 1-4 digits, optionally with letters
    if (!/^[0-9]{1,4}[A-Z]?$/.test(serviceNo.toUpperCase())) {
      return { valid: false, error: 'serviceNo must be 1-4 digits optionally followed by a letter' };
    }
    
    return { valid: true };
  }

  static validateLimit(limit, maxLimit = 1000) {
    if (!limit) {
      return { valid: true, value: 100 }; // Default limit
    }
    
    const numLimit = parseInt(limit);
    if (isNaN(numLimit) || numLimit < 1) {
      return { valid: false, error: 'limit must be a positive number' };
    }
    
    if (numLimit > maxLimit) {
      return { valid: false, error: `limit cannot exceed ${maxLimit}` };
    }
    
    return { valid: true, value: numLimit };
  }

  static validateBbox(bbox) {
    if (!bbox) {
      return { valid: true }; // Optional parameter
    }
    
    const coords = bbox.split(',').map(Number);
    if (coords.length !== 4 || coords.some(isNaN)) {
      return { valid: false, error: 'bbox must be in format "lng1,lat1,lng2,lat2"' };
    }
    
    const [minLng, minLat, maxLng, maxLat] = coords;
    if (minLng >= maxLng || minLat >= maxLat) {
      return { valid: false, error: 'bbox coordinates must form a valid bounding box' };
    }
    
    return { valid: true, value: coords };
  }

  static validateSkip(skip) {
    if (!skip) {
      return { valid: true, value: 0 }; // Default skip
    }
    
    const numSkip = parseInt(skip);
    if (isNaN(numSkip) || numSkip < 0) {
      return { valid: false, error: 'skip must be a non-negative number' };
    }
    
    return { valid: true, value: numSkip };
  }
}

module.exports = Validators; 