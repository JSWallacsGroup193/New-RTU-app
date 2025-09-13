import * as fs from 'fs';
import { buildModelWithFallback, MasterSchema } from './daikin_r32_builder';

const schema = JSON.parse(fs.readFileSync(__dirname + '/daikin_r32_master_schema_with_fallback_FULL.json','utf8')) as MasterSchema;

const res = buildModelWithFallback({
  family: 'DHG',
  tons: 9.0,               // will choose 8.5T (102); ladder: 7.5 / 10
  voltage: '4',
  fan_drive: 'L',
  controls: 'C',
  refrig_sys: 'C',
  gas_btu_numeric: 160000, // will choose 150k; ladder: 140k / 180k
  heat_exchanger: 'S',
  accessories: { revision: 'AB', hailGuard: true }
}, schema);

console.log('Model:', res.model);
console.log('Capacity match:', res.capacity_match);
console.log('Gas BTU match:', res.gas_btu_match);
