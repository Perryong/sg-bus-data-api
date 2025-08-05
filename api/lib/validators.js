// api/lib/validators.js
class Validators {
  static validateBusStopCode(busStopCode) {
    if (!busStopCode) {
      return {
        valid: false,
        error: 'Bus stop code is required'
      };
    }
    
    // Bus stop code should be 5 digits
    const busStopRegex = /^\d{5}$/;
    if (!busStopRegex.test(busStopCode)) {
      return {
        valid: false,
        error: 'Invalid bus stop code. It should be a 5-digit number'
      };
    }
    
    return {
      valid: true,
      value: busStopCode
    };
  }
  
  static validateServiceNo(serviceNo) {
    if (!serviceNo) {
      return {
        valid: true,
        value: null
      };
    }
    
    // Service number validation (allow alphanumeric with some special chars)
    const serviceRegex = /^[a-zA-Z0-9]{1,3}[a-zA-Z]?$/;
    if (!serviceRegex.test(serviceNo)) {
      return {
        valid: false,
        error: 'Invalid service number format'
      };
    }
    
    return {
      valid: true,
      value: serviceNo
    };
  }
  
  static validateSkip(skip) {
    if (!skip) {
      return {
        valid: true,
        value: 0
      };
    }
    
    const skipNumber = parseInt(skip, 10);
    
    if (isNaN(skipNumber) || skipNumber < 0) {
      return {
        valid: false,
        error: 'Skip parameter must be a non-negative integer'
      };
    }
    
    return {
      valid: true,
      value: skipNumber
    };
  }

  static validateLimit(limit, maxLimit = 100) {
    if (!limit) {
      return {
        valid: true,
        value: 100
      };
    }
    
    const limitNumber = parseInt(limit, 10);
    
    if (isNaN(limitNumber) || limitNumber <= 0) {
      return {
        valid: false,
        error: `Limit parameter must be a positive integer`
      };
    }
    
    if (limitNumber > maxLimit) {
      return {
        valid: false,
        error: `Limit parameter cannot exceed ${maxLimit}`
      };
    }
    
    return {
      valid: true,
      value: limitNumber
    };
  }

  static validateBbox(bbox) {
    if (!bbox) {
      return {
        valid: true,
        value: null
      };
    }
    
    // Bbox should be 4 comma-separated numbers: lng1,lat1,lng2,lat2
    const bboxParts = bbox.split(',');
    
    if (bboxParts.length !== 4) {
      return {
        valid: false,
        error: 'Bbox parameter must be 4 comma-separated numbers: lng1,lat1,lng2,lat2'
      };
    }
    
    const coordinates = bboxParts.map(coord => parseFloat(coord.trim()));
    
    if (coordinates.some(isNaN)) {
      return {
        valid: false,
        error: 'Bbox parameter must contain valid numbers'
      };
    }
    
    const [lng1, lat1, lng2, lat2] = coordinates;
    
    // Validate longitude range (-180 to 180)
    if (lng1 < -180 || lng1 > 180 || lng2 < -180 || lng2 > 180) {
      return {
        valid: false,
        error: 'Longitude values must be between -180 and 180'
      };
    }
    
    // Validate latitude range (-90 to 90)
    if (lat1 < -90 || lat1 > 90 || lat2 < -90 || lat2 > 90) {
      return {
        valid: false,
        error: 'Latitude values must be between -90 and 90'
      };
    }
    
    return {
      valid: true,
      value: coordinates
    };
  }
}

module.exports = Validators;