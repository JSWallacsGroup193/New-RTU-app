// Quick test of the updated Daikin R-32 parser
import { HVACModelParser } from './server/services/hvacParser.js';

const parser = new HVACModelParser();

// Test cases based on the official spec sheets we analyzed
const testCases = [
  // DHG Series (Gas/Electric High-Efficiency)
  'DHG0361DXXXCAXAXADXXXXXXXA', // DHG036 = 3-ton Gas/Electric High-Eff, voltage 1, drive D
  'DHG0483DXXXCAXAXADXXXXXXXA', // DHG048 = 4-ton Gas/Electric High-Eff, voltage 3, drive D
  'DHG0724WXXXCAXAXADXXXXXXXA', // DHG072 = 6-ton Gas/Electric High-Eff, voltage 4, drive W (high static)
  
  // DSC Series (Air Conditioner Standard Efficiency)  
  'DSC0361DXXXCAXAXADXXXXXXXA', // DSC036 = 3-ton A/C Standard, voltage 1, drive D
  'DSC0724DXXXCAXAXADXXXXXXXA', // DSC072 = 6-ton A/C Standard, voltage 4, drive D
  
  // DHC Series (Air Conditioner High-Efficiency)
  'DHC0483DXXXCAXAXADXXXXXXXA', // DHC048 = 4-ton A/C High-Eff, voltage 3, drive D
  
  // Legacy patterns (should still work)
  'DX036',
  'DZ048',
  
  // Invalid patterns (should return null)
  'INVALID123',
  'DSC999DXXXCAXAXADXXXXXXXA' // Invalid capacity code
];

console.log('Testing Updated Daikin R-32 Parser');
console.log('===================================\n');

testCases.forEach((modelNumber, index) => {
  console.log(`Test ${index + 1}: ${modelNumber}`);
  try {
    const result = parser.parseModelNumber(modelNumber);
    if (result) {
      console.log(`  ✅ Manufacturer: ${result.manufacturer}`);
      console.log(`  ✅ System Type: ${result.systemType}`);
      console.log(`  ✅ BTU Capacity: ${result.btuCapacity.toLocaleString()}`);
      console.log(`  ✅ Voltage: ${result.voltage}V`);
      console.log(`  ✅ Phases: ${result.phases}`);
      console.log(`  ✅ Confidence: ${result.confidence}%`);
      console.log(`  ✅ Series: ${result.specifications.find(s => s.label === 'Series')?.value || 'N/A'}`);
      console.log(`  ✅ Efficiency: ${result.specifications.find(s => s.label === 'Efficiency Tier')?.value || 'N/A'}`);
      console.log(`  ✅ Drive Type: ${result.specifications.find(s => s.label === 'Drive Type')?.value || 'N/A'}`);
    } else {
      console.log(`  ❌ No match found (expected for invalid patterns)`);
    }
  } catch (error) {
    console.log(`  ❌ Error: ${error.message}`);
  }
  console.log('');
});