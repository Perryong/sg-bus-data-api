// api/test-arrivals.js
module.exports = (req, res) => {
  const busStopCode = req.query.busStopCode || '01012';
  
  // Return mock data that resembles real bus arrivals
  res.status(200).json({
    busStopCode: busStopCode,
    arrivals: [
      {
        serviceNo: "10",
        operator: "SBST",
        buses: [
          {
            estimatedArrival: new Date(Date.now() + 5 * 60000).toISOString(),
            minutesAway: 5,
            load: "SEA",
            feature: "WAB",
            type: "DD",
            latitude: 1.2938,
            longitude: 103.8544
          },
          {
            estimatedArrival: new Date(Date.now() + 15 * 60000).toISOString(),
            minutesAway: 15,
            load: "SDA",
            feature: "WAB",
            type: "DD",
            latitude: 1.2899,
            longitude: 103.8501
          }
        ]
      },
      {
        serviceNo: "7",
        operator: "SBST",
        buses: [
          {
            estimatedArrival: new Date(Date.now() + 3 * 60000).toISOString(),
            minutesAway: 3,
            load: "SDA",
            feature: "WAB", 
            type: "SD",
            latitude: 1.2957,
            longitude: 103.8560
          }
        ]
      }
    ],
    timestamp: new Date().toISOString(),
    meta: {
      total: 2,
      serviceFilter: null,
      note: "This is mock data for testing. It does not reflect actual bus arrivals."
    }
  });
};