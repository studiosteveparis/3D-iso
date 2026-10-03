const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const app = fs.readFileSync('dist/app.js', 'utf8');
const game = fs.readFileSync('dist/game.js', 'utf8');
function extract(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert(start >= 0, name);
  let end = source.indexOf('{', start), depth = 1;
  while (depth) { end++; if (source[end] === '{') depth++; if (source[end] === '}') depth--; }
  return source.slice(start, end + 1);
}
const context = vm.createContext({assert, console});
vm.runInContext(`
const ctx=new Proxy({}, {get:()=>()=>{}}), document={querySelector:()=>({})};
let w=800,h=600,unit=30,zoom=1,offset={x:0,y:0},faces=[],hover=null,tool='add',color='#6478ef',history=[],future=[],blocks=new Map();
const key=(x,y,z)=>[x,y,z].join(',');
${['visualSort','project','poly','shade','cube','draw','inside','hit','valid'].map(n=>extract(app,n)).join('\n')}
${['signatureGeometry','visualCompare','signature'].map(n=>extract(game,n)).join('\n')}
function checkScene(bs) {
 blocks=new Map(bs.map(b=>[key(b.x,b.y,b.z),b]));draw(false,false);
 // Independent ray/plane intersection: the closest surface along (1,1,1)
 // must be the face selected by the painter and by a click.
 let checked=0;
 for(let u=-8.831337;u<8;u+=.431117)for(let v=-12.712719;v<12;v+=.472139){
  let nearest=null,depth=-Infinity;
  for(const b of bs)for(let axis=0;axis<3;axis++){
   const t=axis===0?b.x+1-u:axis===1?b.y+1:b.z+1-(u-v)/2;
   const p=[u+t,t,t+(u-v)/2],lo=[b.x,b.y,b.z];
   if(p.every((q,i)=>i===axis||(q>lo[i]+1e-7&&q<lo[i]+1-1e-7))&&t>depth){depth=t;nearest={b,axis}}
  }
  const got=hit({x:w/2+u*unit,y:h*.55+1.11803398875*v*unit/2});
  if(nearest){assert(got);assert.equal(key(got.block.x,got.block.y,got.block.z),key(nearest.b.x,nearest.b.y,nearest.b.z));const expected=[nearest.b.x,nearest.b.y,nearest.b.z];expected[nearest.axis]++;assert.deepEqual(got.target,expected);checked++}
  else assert.equal(got,null);
 }
 assert(checked>0);
}
const B=(x,y,z,c='#6478ef')=>({x,y,z,c});
const scenes=[Array.from({length:6},(_,i)=>B(0,0,i)),Array.from({length:6},(_,i)=>B(i,0,0)),Array.from({length:6},(_,i)=>B(0,i,0)),Array.from({length:6},(_,i)=>B(i,i,0)),Array.from({length:27},(_,i)=>B(i%3,Math.floor(i/3)%3,Math.floor(i/9)))];
for(const scene of scenes){checkScene(scene);checkScene([...scene].reverse())}
let seed=42;const rand=()=>{seed=(1664525*seed+1013904223)>>>0;return seed};
for(let n=0;n<20;n++){const bs=new Map();for(let i=0;i<30;i++){const b=B(rand()%7-3,rand()%7-3,rand()%6);bs.set(key(b.x,b.y,b.z),b)}checkScene([...bs.values()])}
const target=[B(0,0,0),B(0,0,1),B(0,0,2),B(2,2,0,'#69bfb2'),B(2,2,1,'#69bfb2'),B(2,2,2,'#f18db3')];
const alternative=[...Array.from({length:4},(_,z)=>B(-2,-1,z)),B(-1,0,0,'#69bfb2'),B(-1,0,1,'#69bfb2'),B(-1,0,2,'#f18db3')];
const sig=bs=>JSON.stringify([...signature(bs)].sort());
assert.equal(sig(target),sig(alternative),'Level 7 hidden support equivalence');
assert.notEqual(sig(target),sig(target.map(b=>({...b,c:'#ffffff'}))));
// Ghost participates in depth sorting and never becomes a clickable face.
blocks=new Map([[key(1,1,1),B(1,1,1)]]);hover={target:[0,0,0]};
const calls=[],originalCube=cube;cube=(b,g)=>{calls.push({b,g});originalCube(b,g)};
draw(false,true);assert.equal(calls[0].g,true);assert.equal(calls[1].g,false);assert.equal(faces.length,3);
console.log('PASS: 30 scenes, ray-based picking/occlusion, reversed insertion, level 7 equivalence, color mismatch, ghost depth.');
`, context);
