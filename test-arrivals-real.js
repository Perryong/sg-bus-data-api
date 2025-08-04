const arrivals = require('./api/arrivals.js');

// Test a single bus stop with real data
async function testRealArrivals(busStopCode, serviceNo = null) {
  console.log(`\n🚌 Testing REAL arrivals for bus stop: ${busStopCode}${serviceNo ? `, service: ${serviceNo}` : ''}`);
  
  const mockReq = { 
    query: { 
      busStopCode,
      ...(serviceNo && { serviceNo })
    } 
  };
  
  const mockRes = {
    status: (code) => ({
      json: (data) => {
        console.log(`Status: ${code}`);
        if (data.success) {
          console.log(`✅ SUCCESS! Found ${data.data.arrivals.length} services`);
          if (data.data.arrivals.length > 0) {
            console.log('\n📋 REAL ARRIVAL DATA:');
            data.data.arrivals.slice(0, 5).forEach((service, index) => {
              console.log(`\n  ${index + 1}. Service ${service.serviceNo} (${service.operator})`);
              if (service.buses.length > 0) {
                service.buses.forEach((bus, busIndex) => {
                  console.log(`     Bus ${busIndex + 1}: ${bus.minutesAway} min away`);
                  console.log(`        Arrival: ${bus.estimatedArrival}`);
                  console.log(`        Load: ${bus.load || 'Unknown'}`);
                  console.log(`        Type: ${bus.type || 'Unknown'}`);
                  if (bus.latitude && bus.longitude) {
                    console.log(`        Location: ${bus.latitude}, ${bus.longitude}`);
                  }
                });
              } else {
                console.log('     No buses currently available');
              }
            });
          } else {
            console.log('No services found for this bus stop');
          }
        } else {
          console.log('❌ Error:', data.error.message);
          if (data.error.details) {
            console.log('Details:', data.error.details);
          }
        }
      }
    })
  };

  try {
    await arrivals(mockReq, mockRes);
  } catch (error) {
    console.log('❌ Test failed:', error.message);
  }
}

// Main function
async function main() {
  console.log('🚌 SG Bus Arrivals API - REAL DATA TEST\n');
  
  // Check if API key is set
  if (!process.env.DatamallAccountKey) {
    console.log('❌ ERROR: DatamallAccountKey environment variable not set');
    console.log('\n📋 TO GET YOUR FREE API KEY:');
    console.log('1. Go to: https://www.mytransport.sg/content/mytransport/home/dataMall.html');
    console.log('2. Click "Get API Key"');
    console.log('3. Register for a free account');
    console.log('4. Copy your API key');
    console.log('\n🔧 TO SET YOUR API KEY:');
    console.log('Windows: set DatamallAccountKey=your_api_key_here');
    console.log('Linux/Mac: export DatamallAccountKey=your_api_key_here');
    console.log('\n💡 EXAMPLE:');
    console.log('set DatamallAccountKey=abc123def456 && node test-arrivals-real.js');
    console.log('\n🎯 POPULAR BUS STOPS TO TEST:');
    console.log('- 65011: Sengkang Interchange');
    console.log('- 01012: Dhoby Ghaut Station');
    console.log('- 75009: Punggol Interchange');
    console.log('- 28009: Bedok Interchange');
    console.log('- 52009: Jurong East Interchange');
    return;
  }

  console.log('✅ API Key found! Testing with REAL data...\n');
  console.log('🔍 Testing popular bus stops with live arrival data...\n');

  // Test popular bus stops with real data
  await testRealArrivals('65011'); // Sengkang Interchange
  await testRealArrivals('01012'); // Dhoby Ghaut Station
  await testRealArrivals('75009'); // Punggol Interchange
  
  // Test with specific services
  console.log('\n🎯 Testing specific services...\n');
  await testRealArrivals('01012', '10'); // Service 10 at Dhoby Ghaut
  await testRealArrivals('65011', '70'); // Service 70 at Sengkang
  
  console.log('\n🏁 REAL DATA TESTING COMPLETED!');
  console.log('✅ If you see arrival times above, your API is working perfectly!');
}

// Run the test
main().catch(console.error); 