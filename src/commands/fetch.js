const DataFetcher = require('../services/data-fetcher');
const { Logger } = require('../utils');

async function fetchCommand() {
  const logger = new Logger('FetchCommand');
  
  try {
    logger.info('Starting data fetch process...');
    
    const fetcher = new DataFetcher();
    const results = await fetcher.execute();
    
    logger.success('Data fetch completed successfully');
    return results;
  } catch (error) {
    logger.error('Data fetch failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  fetchCommand();
}

module.exports = fetchCommand;