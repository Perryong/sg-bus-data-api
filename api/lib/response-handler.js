// api/lib/response-handler.js
class ResponseHandler {
  static success(res, data, options = {}) {
    const response = {
      success: true,
      data,
      timestamp: new Date().toISOString(),
      ...options
    };
    
    return res.status(200).json(response);
  }
  
  static badRequest(res, message, options = {}) {
    const response = {
      success: false,
      error: {
        code: 400,
        message
      },
      timestamp: new Date().toISOString(),
      ...options
    };
    
    return res.status(400).json(response);
  }
  
  static internalError(res, message, options = {}) {
    const response = {
      success: false,
      error: {
        code: 500,
        message
      },
      timestamp: new Date().toISOString(),
      ...options
    };
    
    return res.status(500).json(response);
  }
  
  static serviceUnavailable(res, message, options = {}) {
    const response = {
      success: false,
      error: {
        code: 503,
        message
      },
      timestamp: new Date().toISOString(),
      ...options
    };
    
    return res.status(503).json(response);
  }
}

module.exports = ResponseHandler;