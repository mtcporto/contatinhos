const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const source=fs.readFileSync(require('node:path').join(__dirname,'../src/lib/auth.js'),'utf8');
const load=()=>import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
test('sessions require an explicit strong secret',async()=>{
 const auth=await load();const old=process.env.SESSION_SECRET;
 try{delete process.env.SESSION_SECRET;await assert.rejects(auth.createToken({id:1}),/SESSION_SECRET/);
 process.env.SESSION_SECRET='short';await assert.rejects(auth.createToken({id:1}),/SESSION_SECRET/);
 }finally{if(old===undefined)delete process.env.SESSION_SECRET;else process.env.SESSION_SECRET=old;}
});
test('valid sessions work and tampered or rotated sessions fail',async()=>{
 const auth=await load();const old=process.env.SESSION_SECRET;
 try{process.env.SESSION_SECRET='a'.repeat(64);const token=await auth.createToken({id:1});
 assert.equal((await auth.verifyToken(token)).id,1);
 assert.equal(await auth.verifyToken(token+'.extra'),null);
 assert.equal(await auth.verifyToken('bad.'+token.split('.')[1]),null);
 process.env.SESSION_SECRET='b'.repeat(64);assert.equal(await auth.verifyToken(token),null);
 }finally{if(old===undefined)delete process.env.SESSION_SECRET;else process.env.SESSION_SECRET=old;}
});
