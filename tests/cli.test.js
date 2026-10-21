import test from 'node:test';
import assert from 'node:assert/strict';
import { Writable, Readable } from 'node:stream';
import { main } from '../src/cli.js';
function capture(){let buffer='';return { stream:new Writable({write(chunk,_,callback){buffer+=chunk.toString();callback();}}), text:()=>buffer};}
test('CLI sanitizes piped input',async()=>{const stdout=capture(),stderr=capture();await main(['--report'],{stdin:Readable.from(['hi abc@example.com']),stdout:stdout.stream,stderr:stderr.stream});assert.equal(stdout.text(),'hi [EMAIL_1]');assert.match(stderr.text(),/1 matches/);assert.doesNotMatch(stderr.text(),/abc@example.com/)});
test('CLI allows opt-out email masking',async()=>{const stdout=capture();await main(['--no-emails'],{stdin:Readable.from(['abc@example.com']),stdout:stdout.stream});assert.equal(stdout.text(),'abc@example.com')});
test('CLI rejects malformed arguments',async()=>{await assert.rejects(main(['--out'],{stdin:Readable.from(['a'])}),/requires a file path/)});
test('CLI rejects overwriting the same input path',async()=>{await assert.rejects(main(['in.txt','--out','in.txt'],{stdin:Readable.from(['a'])}),/Refusing to overwrite/)});
test('CLI help does not read stdin',async()=>{const stdout=capture();assert.equal(await main(['--help'],{stdout:stdout.stream}),0);assert.match(stdout.text(),/Usage:/)});
