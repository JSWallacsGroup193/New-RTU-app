// Test script to verify 8.5T Gas/Electric unit generation
import { DaikinMatcher } from './server/services/daikinMatcher.js';

async function test8_5TGasElectricSearch() {
  console.log('Testing 8.5T Gas/Electric unit search...');
  
  const matcher = new DaikinMatcher();
  
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
  
  try {
    const results = matcher.searchBySpecInput(searchCriteria);
    
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
    
    // Also test high efficiency (DHG family)
    console.log('\n\nTesting DHG (High Efficiency) family...');
    const dhgCriteria = {
      ...searchCriteria,
      efficiency: "high"
    };
    
    const dhgResults = matcher.searchBySpecInput(dhgCriteria);
    console.log(`Found ${dhgResults.length} DHG results`);
    
    const dhgEightHalfTon = dhgResults.filter(unit => parseFloat(unit.tonnage) === 8.5);
    if (dhgEightHalfTon.length > 0) {
      console.log(`✅ SUCCESS: Found ${dhgEightHalfTon.length} 8.5T DHG units!`);
      dhgEightHalfTon.forEach(unit => {
        console.log(`   - ${unit.modelNumber} (${unit.heatingBTU} BTU)`);
      });
    } else {
      console.log('❌ FAILED: No 8.5T DHG units found');
    }
    
  } catch (error) {
    console.error('Error during search:', error);
  }
}

test8_5TGasElectricSearch().catch(console.error);