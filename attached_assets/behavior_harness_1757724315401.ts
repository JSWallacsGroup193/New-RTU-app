import * as fs from 'fs';
import { buildModelWithFallback as buildOurs, MasterSchema } from './daikin_r32_builder';

// Dynamically load user's builder module (CommonJS) provided via path arg
const userModulePath = process.argv[2];
if (!userModulePath) {
  console.error('Usage: ts-node behavior_harness.ts <path_to_your_builder_js_or_ts>');
  process.exit(1);
}
// eslint-disable-next-line @typescript-eslint/no-var-requires
const userMod = require(userModulePath);

const schema = JSON.parse(fs.readFileSync(__dirname + '/daikin_r32_master_schema_with_fallback_FULL.json','utf8')) as MasterSchema;

// Define a small matrix of representative cases
const cases = [
  { name: 'HP 9.0 tons numeric → 8.5 (ladder)', in: {
      family: 'DSH_7p5to10', tons: 9.0, voltage: '4', fan_drive: 'L', controls: 'B', refrig_sys: 'C', electric_kw: 30, heat_exchanger: 'X'
    }},
  { name: 'Gas/Electric 160k BTU numeric → 150k', in: {
      family: 'DHG', tons: 8.5, voltage: '4', fan_drive: 'L', controls: 'C', refrig_sys: 'C', gas_btu_numeric: 160000, heat_exchanger: 'S'
    }},
  { name: 'Straight A/C with no electric heat', in: {
      family: 'DHC', tons: 8.5, voltage: '4', fan_drive: 'D', controls: 'C', refrig_sys: 'A', electric_kw: undefined, heat_exchanger: 'X'
    }},
  { name: 'Boundary clip low (2.5 tons → 3.0)', in: {
      family: 'DSC', tons: 2.5, voltage: '3', fan_drive: 'D', controls: 'A', refrig_sys: 'A', electric_kw: 15, heat_exchanger: 'X'
    }},
  { name: 'Boundary clip high (27 tons → 25.0)', in: {
      family: 'DSC', tons: 27.0, voltage: '4', fan_drive: 'W', controls: 'B', refrig_sys: 'H', electric_kw: 60, heat_exchanger: 'X'
    }},
];

function safeRun(mod: any, input: any, schema: MasterSchema) {
  // Let user builder support either code-first or numeric fallback. Try flexible first.
  if (mod.buildModelWithFallback) {
    return mod.buildModelWithFallback(input, schema);
  } else if (mod.buildModel) {
    // Try to map numeric inputs to codes roughly (tonnage assumed pre-mapped by user code)
    const cap = (schema.positions as any).p4_p6.codes;
    const reverseCap = Object.entries(cap).reduce((acc: any, [k,v]: any)=>{acc[v]=k; return acc;}, {});
    const tons = input.tons ?? 8.5;
    const capacity = reverseCap[tons] || '102';
    const spec = { ...input, capacity, electric_heat: 'XXX' };
    delete spec.tons; delete spec.electric_kw; delete spec.gas_btu_numeric;
    const model = mod.buildModel(spec, schema);
    return { model };
  }
  throw new Error('User module does not export buildModel or buildModelWithFallback');
}

for (const c of cases) {
  const ours = buildOurs(c.in as any, schema);
  const theirs = safeRun(userMod, c.in as any, schema);
  console.log('\n===', c.name, '===');
  console.log('Ours  :', ours.model);
  console.log('Theirs:', (theirs as any).model);
  if ((ours as any).capacity_match) console.log('  Ours capacity match:', (ours as any).capacity_match);
  if ((theirs as any).capacity_match) console.log('  Theirs capacity match:', (theirs as any).capacity_match);
}
