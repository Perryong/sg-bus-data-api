const fs = require('fs');
const path = require('path');
const { Logger } = require('../utils');

class DataManager {
  constructor() {
    this.logger = new Logger('DataManager');
    this.cache = new Map();
  }

  checkVercelDeployment() {
    return process.env.VERCEL === '1';
  }

  ensureDirectory(filePath) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  read(filePath) {
    try {
      if (this.cache.has(filePath)) {
        return this.cache.get(filePath);
      }

      this.logger.info(`📖 Reading: ${filePath}`);
      
      // For Vercel deployments, try to read from both absolute and relative paths
      let content;
      if (this.checkVercelDeployment()) {
        try {
          // Try absolute path first
          content = fs.readFileSync(path.resolve(filePath), 'utf-8');
        } catch (error) {
          // Fallback to relative path
          content = fs.readFileSync(filePath, 'utf-8');
        }
      } else {
        content = fs.readFileSync(filePath, 'utf-8');
      }
      
      const data = JSON.parse(content);
      
      this.cache.set(filePath, data);
      return data;
    } catch (error) {
      this.logger.error(`Failed to read ${filePath}:`, error.message);
      throw error;
    }
  }

  write(filePath, data, options = {}) {
    try {
      this.ensureDirectory(filePath);
      
      const { minified = false, formatted = true } = options;
      const content = minified || filePath.includes('.min.') 
        ? JSON.stringify(data)
        : JSON.stringify(data, null, formatted ? '\t' : 0);
      
      fs.writeFileSync(filePath, content);
      this.logger.success(`✏️ Written: ${filePath}`);
      
      // Update cache
      this.cache.set(filePath, data);
    } catch (error) {
      this.logger.error(`Failed to write ${filePath}:`, error.message);
      throw error;
    }
  }

  exists(filePath) {
    return fs.existsSync(filePath);
  }

  remove(filePath) {
    if (this.exists(filePath)) {
      fs.unlinkSync(filePath);
      this.cache.delete(filePath);
      this.logger.info(`🗑️ Removed: ${filePath}`);
    }
  }

  clearCache() {
    this.cache.clear();
    this.logger.info('Cache cleared');
  }

  list(directory, filter = null) {
    try {
      if (!fs.existsSync(directory)) {
        this.logger.warn(`Directory does not exist: ${directory}`);
        return [];
      }
      
      const files = fs.readdirSync(directory, { withFileTypes: true });
      return files
        .filter(file => filter ? filter(file) : true)
        .map(file => ({
          name: file.name,
          isDirectory: file.isDirectory(),
          path: path.join(directory, file.name)
        }));
    } catch (error) {
      this.logger.error(`Failed to list directory ${directory}:`, error.message);
      return [];
    }
  }
}

module.exports = DataManager;