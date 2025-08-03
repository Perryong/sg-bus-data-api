const fetchCommand = require('./fetch');
const patchCommand = require('./patch');
const generateCommand = require('./generate');
const { Logger } = require('../utils');

async function buildCommand() {
  const logger = new Logger('BuildCommand');
  
  try {
    logger.info('Starting complete build process...');
    
    // Step 1: Fetch data
    logger.info('Step 1: Fetching data...');
    await fetchCommand();
    
    // Step 2: Patch data
    logger.info('Step 2: Patching data...');
    await patchCommand();
    
    // Step 3: Generate final outputs
    logger.info('Step 3: Generating outputs...');
    await generateCommand();
    
    logger.success('Complete build process finished successfully');
  } catch (error) {
    logger.error('Build process failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  buildCommand();
}

module.exports = buildCommand;
