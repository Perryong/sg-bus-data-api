class ResponseHandler {
  static success(res, data, meta = {}) {
    const response = {
      success: true,
      data,
      timestamp: new Date().toISOString(),
      ...meta
    };
    
    return res.status(200).json(response);
  }

  static error(res, statusCode, message, details = {}) {
    const response = {
      success: false,
      error: {
        code: statusCode,
        message,
        ...details
      },
      timestamp: new Date().toISOString()
    };
    
    return res.status(statusCode).json(response);
  }

  static badRequest(res, message, details = {}) {
    return this.error(res, 400, message, details);
  }

  static unauthorized(res, message = 'Unauthorized', details = {}) {
    return this.error(res, 401, message, details);
  }

  static forbidden(res, message = 'Forbidden', details = {}) {
    return this.error(res, 403, message, details);
  }

  static notFound(res, message = 'Resource not found', details = {}) {
    return this.error(res, 404, message, details);
  }

  static tooManyRequests(res, message = 'Rate limit exceeded', details = {}) {
    return this.error(res, 429, message, details);
  }

  static internalError(res, message = 'Internal server error', details = {}) {
    return this.error(res, 500, message, details);
  }

  static serviceUnavailable(res, message = 'Service temporarily unavailable', details = {}) {
    return this.error(res, 503, message, details);
  }
}

module.exports = ResponseHandler; 