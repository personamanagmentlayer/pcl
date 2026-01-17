import { parse, Runtime, MockProvider } from '../../../dist/index.js';
import { readFileSync } from 'fs';

const src = readFileSync('./simple-reviewer.pcl', 'utf-8');
console.log('Source:\n', src);

const res = parse(src);
console.log('\nParse ok:', res.ok);
console.log('Value:', JSON.stringify(res.value, null, 2));
