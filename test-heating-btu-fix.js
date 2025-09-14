// Test script to verify the heating BTU fix for 8.5 ton Gas/Electric searches
import { DaikinMatcher } from './server/services/daikinMatcher.js';

async function testHeatingBTUFix() {
  console.log('Testing heating BTU fix for 8.5 ton Gas/Electric searches...\n');
  
  const matcher = new DaikinMatcher();
  
  // Test case 1: 8.5 ton Gas/Electric with typical heating BTU
  const testCriteria = {
    systemType: "Gas/Electric",
    tonnage: "8.5",
    voltage: "208-230",
    phases: "3",
    efficiency: "standard",
    heatingBTU: 200000, // Typical heating BTU for 8.5 ton
    gasCategory: "Natural Gas"
  };
  
  console.log('Test Criteria:');
  console.log('- System Type: Gas/Electric');
  console.log('- Tonnage: 8.5 tons');  
  console.log('- Voltage: 208-230V');
  console.log('- Phases: 3');
  console.log('- Heating BTU: 200,000');
  console.log('- Efficiency: Standard\n');
  
  try {
    // Test strict exact match (this should now work with nearest matching)
    const units = matcher.findSpecificationMatches(testCriteria);
    
    console.log(`Found ${units.length} matching units:`);
    
    if (units.length > 0) {
      console.log('✅ SUCCESS: 8.5 ton Gas/Electric searches now return results!');
      units.slice(0, 3).forEach((unit, index) => {
        console.log(`\n${index + 1}. ${unit.modelNumber}`);
        console.log(`   - Tonnage: ${unit.tonnage} tons`);
        console.log(`   - System Type: ${unit.systemType}`);
        console.log(`   - Heating BTU: ${unit.heatingBTU || 'N/A'}`);
        console.log(`   - Voltage: ${unit.voltage}`);
      });
    } else {
      console.log('❌ FAILURE: Still no results for 8.5 ton Gas/Electric searches');
    }
    
    // Test additional edge case: Exact heating BTU that exists
    console.log('\n--- Testing exact heating BTU that should exist ---');
    const exactTestCriteria = {
      ...testCriteria,
      heatingBTU: 180000 // Try a different common heating BTU
    };
    
    const exactUnits = matcher.findSpecificationMatches(exactTestCriteria);
    console.log(`Found ${exactUnits.length} units with 180,000 heating BTU`);
    
    if (exactUnits.length > 0) {
      console.log('✅ Exact heating BTU matching also works');
    }
    
    console.log('\n--- Test completed ---');
    
  } catch (error) {
    console.error('❌ Error during testing:', error.message);
    console.error(error.stack);
  }
}

// Run the test
testHeatingBTUFix().catch(console.error);