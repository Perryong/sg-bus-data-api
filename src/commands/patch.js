const DataPatcher = require('../services/data-patcher');
const { Logger } = require('../utils');

async function patchCommand() {
  const logger = new Logger('PatchCommand');
  
  try {
    logger.info('Starting data patch process...');
    
    const patcher = new DataPatcher();
    const results = await patcher.execute();
    
    logger.success('Data patch completed successfully');
    return results;
  } catch (error) {
    logger.error('Data patch failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  patchCommand();
}

module.exports = patchCommand;