const config = require('./config');
const { Logger } = require('./utils');
const buildCommand = require('./commands/build');

class SGBusDataApp {
  constructor() {
    this.logger = new Logger('SGBusDataApp');
  }

  async start() {
    try {
      this.logger.info('SG Bus Data v2.0 - Starting application...');
      
      // Validate environment
      this.validateEnvironment();
      
      // Run build process
      await buildCommand();
      
      this.logger.success('Application completed successfully');
    } catch (error) {
      this.logger.error('Application failed:', error);
      process.exit(1);
    }
  }

  validateEnvironment() {
    if (!config.apis.lta.datamall.accountKey) {
      throw new Error('DatamallAccountKey environment variable is required');
    }
    
    this.logger.info('Environment validation passed');
  }
}

// Start application if run directly
if (require.main === module) {
  const app = new SGBusDataApp();
  app.start();
}

module.exports = SGBusDataApp;