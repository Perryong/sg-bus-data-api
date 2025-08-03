const DataGenerator = require('../services/data-generator');
const { Logger } = require('../utils');

async function generateCommand() {
  const logger = new Logger('GenerateCommand');
  
  try {
    logger.info('Starting data generation process...');
    
    const generator = new DataGenerator();
    const results = await generator.execute();
    
    logger.success('Data generation completed successfully');
    return results;
  } catch (error) {
    logger.error('Data generation failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  generateCommand();
}

module.exports = generateCommand;
