const DirectoryIndexer = require('../services/directory-indexer');
const { Logger } = require('../utils');

async function dirlistCommand() {
  const logger = new Logger('DirlistCommand');
  
  try {
    logger.info('Generating directory indexes...');
    
    const indexer = new DirectoryIndexer();
    const results = await indexer.execute();
    
    logger.success('Directory indexing completed successfully');
    return results;
  } catch (error) {
    logger.error('Directory indexing failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  dirlistCommand();
}

module.exports = dirlistCommand;