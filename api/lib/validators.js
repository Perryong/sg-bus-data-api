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
}

module.exports = Validators;