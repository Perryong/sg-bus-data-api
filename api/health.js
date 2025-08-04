const { ResponseHandler } = require('./lib');

module.exports = async (req, res) => {
  try {
    const healthData = {
      status: 'healthy',
      version: '2.0.0',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      environment: process.env.NODE_ENV || 'development'
    };

    return ResponseHandler.success(res, healthData);
  } catch (error) {
    console.error('Health check error:', error);
    return ResponseHandler.internalError(res, 'Health check failed');
  }
}; 