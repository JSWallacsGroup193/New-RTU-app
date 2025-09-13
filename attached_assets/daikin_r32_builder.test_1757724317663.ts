import assert from 'assert';
import * as fs from 'fs';
import { buildModel, parseModel, validateSpecAgainstFamily, prettyPrint, MasterSchema, buildModelWithFallback } from './daikin_r32_builder';

const schemaPath = __dirname + '/daikin_r32_master_schema_with_fallback_FULL.json';
const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8')) as MasterSchema;

function logPass(name: string) { console.log('✅', name); }
function logSection(title: string) { console.log('\n==== ' + title + ' ===='); }

// Fallback build from numeric
logSection('Fallback numeric -> codes');
{
  const r = buildModelWithFallback({
    family: 'DHG',
    tons: 9.0,
    voltage: '4',
    fan_drive: 'L',
    controls: 'C',
    refrig_sys: 'C',
    gas_btu_numeric: 160000,
    heat_exchanger: 'S',
    accessories: { revision: 'AB', hailGuard: true }
  }, schema);
  assert.ok(r.model.startsWith('DHG1024L150'), 'Model prefix should reflect 8.5T (102) and 150k BTU');
  logPass('buildModelWithFallback numeric OK');
}

// 8.5T Straight A/C (DHC) code-first
logSection('8.5T Straight A/C (DHC)');
{
  const model = buildModel({
    family: 'DHC',
    capacity: '102',
    voltage: '4',
    fan_drive: 'D',
    electric_heat: 'XXX',
    controls: 'C',
    refrig_sys: 'A',
    heat_exchanger: 'X',
    options_tail: 'AXADXXXXXXX'
  }, schema);

  assert.ok(model.startsWith('DHC1024D'));
  const parsed = parseModel(model, schema);
  assert.equal(parsed.capacity, '102');
  assert.equal(parsed.application, 'C');
  assert.equal(parsed.tier, 'H');
  assert.equal(parsed.electric_heat, 'XXX');
  const issues = validateSpecAgainstFamily(parsed, 'DHC', schema);
  assert.equal(issues.length, 0);
  console.log('Pretty:', prettyPrint(parsed, schema));
  logPass('DHC 8.5T OK');
}

// 8.5T Heat Pump (DSH 7.5–10) code-first
logSection('8.5T Heat Pump (DSH 7.5–10)');
{
  const model = buildModel({
    family: 'DSH_7p5to10',
    capacity: '102',
    voltage: '4',
    fan_drive: 'L',
    electric_heat: '030',
    controls: 'B',
    refrig_sys: 'C',
    heat_exchanger: 'X',
    options_tail: 'CXAXXXXXXXX'
  }, schema);

  assert.ok(model.startsWith('DSH1024L030B'));
  const parsed = parseModel(model, schema);
  assert.equal(parsed.capacity, '102');
  assert.equal(parsed.application, 'H');
  assert.equal(parsed.tier, 'S');
  assert.equal(parsed.electric_heat, '030');
  const issues = validateSpecAgainstFamily(parsed, 'DSH_7p5to10', schema);
  assert.equal(issues.length, 0);
  logPass('DSH 8.5T OK');
}

// Gas/Electric (DHG) with accessories mapping
logSection('8.5T Gas/Electric (DHG) + accessories');
{
  const model = buildModel({
    family: 'DHG',
    capacity: '102',
    voltage: '4',
    fan_drive: 'L',
    gas_btu: '150',
    controls: 'C',
    refrig_sys: 'C',
    heat_exchanger: 'S',
    options_tail: undefined,
    accessories: {
      revision: 'AB',
      singlePointPE: true,
      service: 'hinged_plus_powered',
      electrical: { nonFusedDisconnect: true, phaseMonitor: true, thruTheBase: true },
      economizer: 'df_ddc_enthalpy',
      hailGuard: true,
      sensors: 'ra_sa_smoke',
      p24: 'Z',
      mergeMode: 'replace'
    }
  }, schema);

  assert.ok(model.startsWith('DHG1024L150'));
  const parsed = parseModel(model, schema);
  assert.equal(parsed.capacity, '102');
  assert.equal(parsed.application, 'G');
  assert.equal(parsed.gas_btu, '150');
  const issues = validateSpecAgainstFamily(parsed, 'DHG', schema);
  assert.equal(issues.length, 0);
  logPass('DHG 8.5T + accessories OK');
}

// Negative: missing gas BTU on Gas/Electric should throw
logSection('Negative: missing gas BTU on gas/electric');
{
  let threw = false;
  try {
    buildModel({
      family: 'DSG',
      capacity: '102',
      voltage: '4',
      fan_drive: 'D',
      controls: 'A',
      refrig_sys: 'C',
      heat_exchanger: 'A'
    } as any, schema);
  } catch (e) {
    threw = true;
  }
  assert.ok(threw, 'Expected build to throw without gas_btu');
  logPass('Missing gas_btu correctly throws');
}

console.log('\\nAll tests passed.');