const { ResponseHandler } = require('./lib');
const { readFileSync } = require('fs');
const path = require('path');

// Whitelist of allowed dataset files under data/v1
const allowedFiles = {
  'firstlast': 'firstlast.json',
  'firstlast.min': 'firstlast.min.json',
  'routes': 'routes.json',
  'routes.geojson': 'routes.geojson',
  'routes.min': 'routes.min.json',
  'routes.min.geojson': 'routes.min.geojson',
  'services': 'services.json',
  'services.min': 'services.min.json',
  'stops': 'stops.json',
  'stops.geojson': 'stops.geojson',
  'stops.min': 'stops.min.json',
  'stops.min.geojson': 'stops.min.geojson'
};

function resolveFilename(requestedName) {
  if (!requestedName) return null;

  // Normalize and strip any directory parts to avoid traversal
  const baseName = path.basename(requestedName);

  // Allow using keys or direct filenames
  if (allowedFiles[baseName]) return allowedFiles[baseName];
  const allowedSet = new Set(Object.values(allowedFiles));
  if (allowedSet.has(baseName)) return baseName;
  return null;
}

module.exports = async (req, res) => {
  try {
    const { name } = req.query;
    const filename = resolveFilename(name);

    if (!filename) {
      return ResponseHandler.badRequest(res, 'Invalid or missing "name". Use one of: ' + Object.keys(allowedFiles).join(', '));
    }

    const fullPath = path.join(__dirname, '../data/v1/', filename);
    let parsed;
    try {
      const fileContent = readFileSync(fullPath, 'utf8');
      parsed = JSON.parse(fileContent);
    } catch (err) {
      return ResponseHandler.internalError(res, 'Failed to read dataset', { error: err.message, file: filename });
    }

    return ResponseHandler.success(res, parsed, { meta: { file: filename } });
  } catch (error) {
    return ResponseHandler.internalError(res, 'Unexpected error fetching dataset', { error: error.message });
  }
};


