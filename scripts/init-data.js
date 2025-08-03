const fs = require('fs');
const path = require('path');
const got = require('got');

async function initData() {
  console.log('🚀 Initializing data for new deployment...');
  
  const dataDir = path.join(process.cwd(), 'data/v1');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  // Example of how you could download data from a public GitHub repository
  const dataFiles = [
    'stops.min.json',
    'services.min.json', 
    'routes.min.json',
    'stops.min.geojson',
    'routes.min.geojson',
    'firstlast.min.json'
  ];
  
  // Replace with your actual GitHub repository URL
  const baseUrl = 'https://raw.githubusercontent.com/yourusername/sgbusdata/main/data/v1/';
  
  for (const file of dataFiles) {
    try {
      console.log(`Downloading ${file}...`);
      const response = await got(baseUrl + file);
      fs.writeFileSync(path.join(dataDir, file), response.body);
      console.log(`✅ Downloaded ${file}`);
    } catch (error) {
      console.warn(`⚠️ Failed to download ${file}: ${error.message}`);
      
      // Create placeholder file
      console.log(`Creating placeholder for ${file}`);
      const placeholder = file.includes('.geojson') 
        ? { type: 'FeatureCollection', features: [] }
        : {};
      fs.writeFileSync(path.join(dataDir, file), JSON.stringify(placeholder));
    }
  }
  
  console.log('✅ Data initialization complete');
}

if (require.main === module) {
  initData().catch(error => {
    console.error('❌ Data initialization failed:', error);
    process.exit(1);
  });
}