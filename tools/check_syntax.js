import fs from 'fs';
const s = fs.readFileSync('api/_app.mjs','utf8');
function count(ch){return (s.match(new RegExp(escapeRegExp(ch),'g'))||[]).length}
function escapeRegExp(s){return s.replace(/[.*+?^${}()|[\\]\\]/g,'\\$&')}
console.log('length', s.length);
console.log('backticks', count('`'));
console.log('singleQuotes', count("'"));
console.log('doubleQuotes', count('"'));
console.log('openParen', count('('));
console.log('closeParen', count(')'));
console.log('openBrace', count('{'));
console.log('closeBrace', count('}'));
console.log('openBracket', count('['));
console.log('closeBracket', count(']'));
// Show last 400 chars to inspect trailing snippet
console.log('tail:', s.slice(-400));
