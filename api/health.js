// api/health.js
module.exports = (req, res) => {
  // Simple health check that will always work
  res.status(200).json({
    status: 'online',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    message: 'API is functioning',
    env: process.env.VERCEL ? 'vercel' : 'development',
    hasApiKey: !!process.env.DatamallAccountKey
  });
};