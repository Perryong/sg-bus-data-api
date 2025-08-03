const { send } = require('micro');
const { readFileSync, existsSync } = require('fs');
const path = require('path');

async function handler(req, res) {
  try {
    const dataFiles = [
      'stops.min.json',
      'services.min.json', 
      'routes.min.json',
      'stops.min.geojson',
      'routes.min.geojson',
      'firstlast.min.json'
    ];
    
    const dataStatus = {};
    let allFilesExist = true;
    let totalSize = 0;
    
    for (const file of dataFiles) {
      const filePath = path.join(__dirname, '../data/v1', file);
      const exists = existsSync(filePath);
      const size = exists ? readFileSync(filePath).length : 0;
      
      dataStatus[file] = {
        exists,
        size,
        sizeKB: Math.round(size / 1024),
        sizeMB: Math.round(size / 1024 / 1024 * 100) / 100
      };
      
      if (!exists) allFilesExist = false;
      totalSize += size;
    }
    
    // Fallback for Vercel deployment when files might not be accessible
    if (process.env.VERCEL === '1' && !allFilesExist) {
      console.log('Using fallback status for Vercel deployment');
      return send(res, 200, {
        status: 'limited',
        timestamp: new Date().toISOString(),
        version: '2.0.0',
        uptime: {
          seconds: Math.floor(process.uptime()),
          human: `${Math.floor(process.uptime() / 3600)}h ${Math.floor((process.uptime() % 3600) / 60)}m ${Math.floor(process.uptime() % 60)}s`
        },
        features: {
          staticData: true,
          realtimeData: !!process.env.DatamallAccountKey,
          cors: true,
          caching: true
        },
        environment: 'vercel',
        endpoints: {
          '/api/bus-stops': 'Static bus stops data',
          '/api/bus-services': 'Static bus services data',
          '/api/bus-routes': 'Static bus routes data',
          '/api/realtime/arrivals': process.env.DatamallAccountKey ? 'Live arrivals' : 'Disabled (no API key)',
          '/api/realtime/positions': process.env.DatamallAccountKey ? 'Live positions' : 'Disabled (no API key)'
        },
        message: 'Running in limited mode on Vercel. Some features may be restricted.'
      });
    }
    
    // Test API key availability
    const hasApiKey = !!process.env.DatamallAccountKey;
    
    // Calculate uptime (simple version)
    const uptime = process.uptime();
    
    const status = {
      status: allFilesExist ? (hasApiKey ? 'healthy' : 'degraded') : 'unhealthy',
      timestamp: new Date().toISOString(),
      version: '2.0.0',
      uptime: {
        seconds: Math.floor(uptime),
        human: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${Math.floor(uptime % 60)}s`
      },
      dataFiles: {
        ...dataStatus,
        summary: {
          totalFiles: dataFiles.length,
          existingFiles: Object.values(dataStatus).filter(f => f.exists).length,
          totalSizeMB: Math.round(totalSize / 1024 / 1024 * 100) / 100
        }
      },
      environment: process.env.VERCEL === '1' ? 'vercel' : (process.env.NODE_ENV || 'development'),
      features: {
        staticData: allFilesExist,
        realtimeData: hasApiKey,
        cors: true,
        caching: true
      },
      endpoints: {
        '/api/bus-stops': 'Static bus stops data',
        '/api/bus-services': 'Static bus services data',
        '/api/bus-routes': 'Static bus routes data',
        '/api/realtime/arrivals': hasApiKey ? 'Live arrivals' : 'Disabled (no API key)',
        '/api/realtime/positions': hasApiKey ? 'Live positions' : 'Disabled (no API key)'
      }
    };
    
    const responseCode = status.status === 'healthy' ? 200 : 
                        status.status === 'degraded' ? 206 : 503;
    
    return send(res, responseCode, status);
  } catch (error) {
    console.error('Health check error:', error);
    return send(res, 500, {
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

module.exports = handler;