const { ResponseHandler } = require('./utils');

module.exports = async (req, res) => {
  try {
    const apiInfo = {
      name: "SG Bus API",
      version: "2.0.0",
      status: "online",
      description: "Singapore Bus Data API with real-time information",
      endpoints: [
        {
          path: "/api/health",
          method: "GET",
          description: "Health check endpoint"
        },
        {
          path: "/api/bus-stops",
          method: "GET",
          description: "Get bus stops with optional filtering",
          parameters: ["bbox", "service", "search", "limit", "format"]
        },
        {
          path: "/api/bus-services",
          method: "GET",
          description: "Get bus services with optional filtering",
          parameters: ["search", "origin", "destination", "limit"]
        },
        {
          path: "/api/bus-routes",
          method: "GET",
          description: "Get bus routes with optional filtering",
          parameters: ["service", "bbox", "simplified", "format"]
        },
        {
          path: "/api/arrivals",
          method: "GET",
          description: "Get real-time bus arrivals",
          parameters: ["busStopCode", "serviceNo"]
        },
        {
          path: "/api/realtime",
          method: "GET",
          description: "Get real-time bus locations",
          parameters: ["serviceNo", "skip"]
        }
      ],
      documentation: "/api/docs",
      source: "https://github.com/your-repo/sg-bus-data"
    };

    return ResponseHandler.success(res, apiInfo);
  } catch (error) {
    console.error('API index error:', error);
    return ResponseHandler.internalError(res, 'Failed to get API information');
  }
};