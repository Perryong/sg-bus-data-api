const ChangeDetector = require('../services/change-detector');
const { Logger } = require('../utils');

async function changesCommand() {
  const logger = new Logger('ChangesCommand');
  
  try {
    logger.info('Detecting data changes...');
    
    const detector = new ChangeDetector();
    const changes = await detector.execute();
    
    logger.success('Change detection completed successfully');
    return changes;
  } catch (error) {
    if (error.message.includes('No changes detected')) {
      logger.info('No changes detected in data files');
      process.exit(0);
    }
    
    logger.error('Change detection failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  changesCommand();
}

module.exports = changesCommand;