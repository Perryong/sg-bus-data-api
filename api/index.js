// api/index.js
module.exports = (req, res) => {
  res.status(200).json({
    name: "SG Bus API",
    version: "2.0.0",
    status: "online",
    timestamp: new Date().toISOString(),
    endpoints: [
      "/api/health",
      "/api/bus-stops",
      "/api/bus-services",
      "/api/bus-routes",
      "/api/realtime/arrivals",
      "/api/realtime/positions"
    ],
    message: "API is functioning"
  });
};