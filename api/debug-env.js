// api/debug-env.js
module.exports = (req, res) => {
  // Security check - only show in development or with a special parameter
  const isDebugAllowed = process.env.NODE_ENV === 'development' || 
                        req.query.debugToken === 'sg-bus-debug-2025';
  
  if (!isDebugAllowed) {
    return res.status(403).json({
      error: 'Access Denied',
      message: 'Debug endpoint is only available in development or with the correct debugToken'
    });
  }
  
  const API_KEY = process.env.DatamallAccountKey;
  
  // Create a safe response that doesn't expose the full key
  const safeResponse = {
    timestamp: new Date().toISOString(),
    environment: process.env.VERCEL ? 'vercel' : (process.env.NODE_ENV || 'unknown'),
    apiKeyPresent: !!API_KEY,
    apiKeyLength: API_KEY ? API_KEY.length : 0,
    apiKeyStart: API_KEY ? `${API_KEY.substring(0, 3)}...` : null,
    apiKeyEnd: API_KEY ? `...${API_KEY.substring(API_KEY.length - 3)}` : null,
    envVars: Object.keys(process.env)
      .filter(key => !key.toLowerCase().includes('key') && 
                    !key.toLowerCase().includes('secret') && 
                    !key.toLowerCase().includes('token') &&
                    !key.toLowerCase().includes('password'))
      .sort()
  };
  
  return res.status(200).json(safeResponse);
};