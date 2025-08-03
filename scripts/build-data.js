const path = require('path');
const { execSync } = require('child_process');
const fs = require('fs');

async function buildData() {
  console.log('🚀 Building SG Bus Data for Vercel deployment...');
  
  try {
    // Check if data directory exists
    const dataDir = path.join(__dirname, '../data/v1');
    if (!fs.existsSync(dataDir)) {
      console.log('📁 Creating data directory...');
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    // Check if we have pre-built data
    const requiredFiles = [
      'stops.min.json',
      'services.min.json', 
      'routes.min.json',
      'stops.min.geojson',
      'routes.min.geojson',
      'firstlast.min.json'
    ];
    
    const missingFiles = requiredFiles.filter(file => 
      !fs.existsSync(path.join(dataDir, file))
    );
    
    if (missingFiles.length > 0) {
      console.log('⚠️ Missing data files:', missingFiles);
      console.log('🔄 You need to run the data build process locally first:');
      console.log('   npm run build');
      console.log('   Then commit the generated data files to your repository.');
      
      // For now, create empty files to prevent deployment errors
      console.log('📝 Creating placeholder files...');
      missingFiles.forEach(file => {
        const filePath = path.join(dataDir, file);
        const placeholder = file.includes('.geojson') 
          ? { type: 'FeatureCollection', features: [] }
          : {};
        fs.writeFileSync(filePath, JSON.stringify(placeholder));
        console.log(`📄 Created placeholder: ${file}`);
      });
      
      console.log('⚠️ IMPORTANT: These are placeholder files!');
      console.log('   Run the full build process locally and commit the real data files.');
    } else {
      console.log('✅ All required data files are present');
    }
    
    // Verify file sizes
    let totalSize = 0;
    requiredFiles.forEach(file => {
      const filePath = path.join(dataDir, file);
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        totalSize += stats.size;
        console.log(`📄 ${file}: ${(stats.size / 1024 / 1024).toFixed(2)}MB`);
      }
    });
    
    console.log(`📊 Total data size: ${(totalSize / 1024 / 1024).toFixed(2)}MB`);
    
    // Check Vercel function size limits (50MB max)
    if (totalSize > 50 * 1024 * 1024) {
      console.warn('⚠️ Warning: Total data size exceeds Vercel function limits');
      console.log('   Consider serving large files from external storage');
    }
    
    console.log('🎉 Data build verification completed!');
  } catch (error) {
    console.error('❌ Data build verification failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  buildData();
}

module.exports = buildData;