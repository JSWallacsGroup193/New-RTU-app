import * as fs from 'fs';
import * as path from 'path';

function loadJson(p: string) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

// Cheap deep-diff: walks both objects and reports added/removed/changed leaf nodes
type DiffItem = { path: string; ours?: any; theirs?: any; type: 'added'|'removed'|'changed' };

function isObject(x: any) { return x && typeof x === 'object' && !Array.isArray(x); }

function walk(obj: any, prefix: string, out: Record<string, any>) {
  if (!isObject(obj)) { out[prefix] = obj; return; }
  const keys = Object.keys(obj);
  if (keys.length === 0) { out[prefix] = {}; return; }
  for (const k of keys) {
    const next = prefix ? `${prefix}.${k}` : k;
    walk(obj[k], next, out);
  }
}

function diffJson(ours: any, theirs: any): DiffItem[] {
  const flatOurs: Record<string, any> = {};
  const flatTheirs: Record<string, any> = {};
  walk(ours, '', flatOurs);
  walk(theirs, '', flatTheirs);

  const keys = new Set([...Object.keys(flatOurs), ...Object.keys(flatTheirs)]);
  const diffs: DiffItem[] = [];
  for (const k of keys) {
    const a = flatOurs[k];
    const b = flatTheirs[k];
    if (a === undefined && b !== undefined) diffs.push({ path: k, theirs: b, type: 'added' });
    else if (a !== undefined && b === undefined) diffs.push({ path: k, ours: a, type: 'removed' });
    else if (JSON.stringify(a) !== JSON.stringify(b)) diffs.push({ path: k, ours: a, theirs: b, type: 'changed' });
  }
  return diffs.sort((x,y)=> x.path.localeCompare(y.path));
}

const oursPath = path.resolve(__dirname, 'daikin_r32_master_schema_with_fallback_FULL.json');
const theirsPath = process.argv[2];
if (!theirsPath) {
  console.error('Usage: ts-node schema_diff.ts <path_to_your_schema.json>');
  process.exit(1);
}

const ours = loadJson(oursPath);
const theirs = loadJson(theirsPath);

const diffs = diffJson(ours, theirs);
if (diffs.length === 0) {
  console.log('✅ Schemas are effectively identical.');
} else {
  console.log(`Found ${diffs.length} diffs:`);
  for (const d of diffs) {
    console.log(`[${d.type}] ${d.path}`);
    if (d.type !== 'added') console.log('  ours  :', JSON.stringify(d.ours));
    if (d.type !== 'removed') console.log('  theirs:', JSON.stringify(d.theirs));
  }
}
