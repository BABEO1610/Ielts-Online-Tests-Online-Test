import fs from 'fs';
import { parseSmartText } from './frontend/src/utils/questionParser.js';
const rawText = fs.readFileSync('sample_bug_fix.txt', 'utf-8');
const result = parseSmartText(rawText);
console.log(JSON.stringify(result, null, 2));
