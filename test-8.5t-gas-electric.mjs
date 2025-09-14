// Test script to verify 8.5T Gas/Electric unit generation
import './server/services/daikinMatcher.js';

// Simplified test function
async function test8_5TGasElectricSearch() {
  console.log('Testing 8.5T Gas/Electric unit search...');
  
  // Test criteria for 8.5T Gas/Electric unit
  const searchCriteria = {
    systemType: "Gas/Electric",
    tonnage: "8.5",
    voltage: "208-230", 
    phases: "3",
    heatingBTU: 140000,
    efficiency: "standard", // For DSG family
    gasCategory: "Natural Gas"
  };
  
  console.log('Search criteria:', JSON.stringify(searchCriteria, null, 2));
  
  // Since we can't directly import the class, let's test via HTTP API
  try {
    const response = await fetch('http://localhost:5000/api/search-by-spec', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(searchCriteria)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const results = await response.json();
    
    console.log(`\nFound ${results.length} results:`);
    
    results.forEach((result, index) => {
      console.log(`\nResult ${index + 1}:`);
      console.log(`  Model: ${result.modelNumber}`);
      console.log(`  Tonnage: ${result.tonnage}`);
      console.log(`  System Type: ${result.systemType}`);
      console.log(`  Voltage/Phase: ${result.voltage}/${result.phases}`);
      console.log(`  Heating BTU: ${result.heatingBTU}`);
      console.log(`  Gas Category: ${result.gasCategory}`);
      console.log(`  ID: ${result.id}`);
    });
    
    // Check if we found any 8.5T units
    const eightHalfTonUnits = results.filter(unit => parseFloat(unit.tonnage) === 8.5);
    
    if (eightHalfTonUnits.length > 0) {
      console.log(`\n✅ SUCCESS: Found ${eightHalfTonUnits.length} 8.5T Gas/Electric units!`);
      eightHalfTonUnits.forEach(unit => {
        console.log(`   - ${unit.modelNumber} (${unit.heatingBTU} BTU)`);
      });
    } else {
      console.log('\n❌ FAILED: No 8.5T Gas/Electric units found');
    }
    
  } catch (error) {
    console.error('Error during search:', error);
  }
}

// Wait a bit for server to start, then run test
setTimeout(() => {
  test8_5TGasElectricSearch().catch(console.error);
}, 2000);