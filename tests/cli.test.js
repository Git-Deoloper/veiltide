import test from 'node:test';
import assert from 'node:assert/strict';
import { Writable, Readable } from 'node:stream';
import { main } from '../src/cli.js';
import {mkdtemp,writeFile,readFile,link,symlink,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
function capture(){let buffer='';return { stream:new Writable({write(chunk,_,callback){buffer+=chunk.toString();callback();}}), text:()=>buffer};}
test('CLI sanitizes piped input',async()=>{const stdout=capture(),stderr=capture();await main(['--report'],{stdin:Readable.from(['hi abc@example.com']),stdout:stdout.stream,stderr:stderr.stream});assert.equal(stdout.text(),'hi [EMAIL_1]');assert.match(stderr.text(),/1 matches/);assert.doesNotMatch(stderr.text(),/abc@example.com/)});
test('CLI allows opt-out email masking',async()=>{const stdout=capture();await main(['--no-emails'],{stdin:Readable.from(['abc@example.com']),stdout:stdout.stream});assert.equal(stdout.text(),'abc@example.com')});
test('CLI rejects malformed arguments',async()=>{await assert.rejects(main(['--out'],{stdin:Readable.from(['a'])}),/requires a file path/)});
test('CLI rejects overwriting the same input path',async()=>{await assert.rejects(main(['in.txt','--out','in.txt'],{stdin:Readable.from(['a'])}),/Refusing to overwrite/)});
test('CLI help does not read stdin',async()=>{const stdout=capture();assert.equal(await main(['--help'],{stdout:stdout.stream}),0);assert.match(stdout.text(),/Usage:/)});
test('CLI preserves UTF-8 characters split between stdin chunks',async()=>{
  const source=Buffer.from('مرحبا café 🌱 person@example.com'),stdout=capture();
  const parts=Array.from(source,byte=>Buffer.from([byte]));
  await main([],{stdin:Readable.from(parts),stdout:stdout.stream});
  assert.equal(stdout.text(),'مرحبا café 🌱 [EMAIL_1]');
});
test('CLI refuses aliased input paths even with --force',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'veiltide-'));
  const input=join(dir,'input.txt'),hard=join(dir,'hard.txt'),soft=join(dir,'soft.txt');
  try{
    await writeFile(input,'private@example.com');await link(input,hard);await symlink(input,soft);
    for(const output of [join(dir,'sub','..','input.txt'),hard,soft]){
      await assert.rejects(main([input,'--out',output,'--force']),/Refusing to overwrite/);
    }
    assert.equal(await readFile(input,'utf8'),'private@example.com');
  }finally{await rm(dir,{recursive:true,force:true})}
});
