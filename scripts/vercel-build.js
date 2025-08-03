const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function vercelBuild() {
  console.log('🚀 Running Vercel build process...');
  
  // Check for DataMall API key
  if (!process.env.DatamallAccountKey) {
    console.warn('⚠️ Warning: DatamallAccountKey environment variable is not set.');
    console.log('   Some API endpoints may not work without this key.');
  }
  
  // Create data directories
  const dataDirs = [
    'data/v1',
    'data/v1/raw',
    'data/v1/patch',
    'data/v1/raw/services'
  ];
  
  dataDirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`📁 Created directory: ${dir}`);
    }
  });
  
  // Check if data files exist in source control
  const requiredFiles = [
    'data/v1/stops.min.json',
    'data/v1/services.min.json',
    'data/v1/routes.min.json',
    'data/v1/stops.min.geojson',
    'data/v1/routes.min.geojson',
    'data/v1/firstlast.min.json'
  ];
  
  const missingFiles = requiredFiles.filter(file => !fs.existsSync(file));
  
  if (missingFiles.length > 0) {
    console.warn('⚠️ Warning: Missing data files that should be included in source control:');
    missingFiles.forEach(file => console.log(`   - ${file}`));
    
    // Create placeholder files to prevent deployment errors
    console.log('📝 Creating placeholder files...');
    missingFiles.forEach(file => {
      const filePath = path.resolve(file);
      const placeholder = file.includes('.geojson') 
        ? { type: 'FeatureCollection', features: [] }
        : {};
      fs.writeFileSync(filePath, JSON.stringify(placeholder));
      console.log(`   - Created placeholder: ${file}`);
    });
    
    console.warn('⚠️ Important: For production, you should run the full data build process locally');
    console.warn('   and commit the real data files to your repository.');
  } else {
    console.log('✅ All required data files are present');
  }
  
  // Check file sizes
  let totalSize = 0;
  requiredFiles.forEach(file => {
    if (fs.existsSync(file)) {
      const stats = fs.statSync(file);
      const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
      totalSize += stats.size;
      console.log(`📄 ${file}: ${sizeMB}MB`);
    }
  });
  
  console.log(`📊 Total data size: ${(totalSize / 1024 / 1024).toFixed(2)}MB`);
  
  // Warn if approaching Vercel limits
  if (totalSize > 45 * 1024 * 1024) {
    console.warn('⚠️ Warning: Total data size is approaching Vercel function limit (50MB)');
    console.warn('   Consider using external storage for larger files');
  }
  
  console.log('🎉 Vercel build process completed!');
}

vercelBuild().catch(error => {
  console.error('❌ Build process failed:', error);
  process.exit(1);
});