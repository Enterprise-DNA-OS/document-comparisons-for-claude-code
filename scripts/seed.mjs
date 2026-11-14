import fs from 'node:fs';import path from 'node:path';import {pathToFileURL} from 'node:url';
import {getDb,REPO_ROOT} from './lib/db.mjs';import {run} from './comparisons.mjs';
export async function seed(db){
 await db.exec(fs.readFileSync(path.join(REPO_ROOT,'supabase/seed.sql'),'utf8'));
 const o={actor:'Demo operator'};const day=n=>new Date(Date.now()+n*86400000).toISOString().slice(0,10);
 for(const ref of ['DOC-101','DOC-103'])for(const label of ['original','revised'])await run(db,'add-version',{...o,ref,label,file:path.join(REPO_ROOT,`fixtures/${label}.txt`)});
 if(!(await db.query("select id from comparisons where code='CMP-101'")).length){
  await run(db,'compare',{...o,ref:'DOC-101',code:'CMP-101',original:'original',revised:'revised',owner:'Mara Chen','due-on':day(-2)});
  await run(db,'tag',{...o,ref:'CMP-101',change:'2',priority:'high'});
  await run(db,'decide',{...o,ref:'CMP-101',change:'1',decision:'hold',note:'Confirm cash-flow impact with owner'});
  await run(db,'review-scope',{...o,ref:'CMP-101',evidence:'Demo text sources reviewed line by line; no graphics or hidden content'});
 }
 if(!(await db.query("select id from comparisons where code='CMP-102'")).length){
  await run(db,'import',{...o,ref:'DOC-102',code:'CMP-102',file:path.join(REPO_ROOT,'fixtures/draftable.csv'),source:'fictional-demo-report',owner:'Ari Morgan','due-on':day(-5)},['draftable']);
  await db.exec("update comparisons set created_at=now()-interval '20 days' where code='CMP-102'; alter table comparisons disable trigger touch; update comparisons set updated_at=now()-interval '20 days' where code='CMP-102'; alter table comparisons enable trigger touch;");
 }
 if(!(await db.query("select id from comparisons where code='CMP-103'")).length){
  await run(db,'compare',{...o,ref:'DOC-103',code:'CMP-103',original:'original',revised:'revised',owner:'Mara Chen','due-on':day(4)});
 }
 return {seeded:true};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){const db=await getDb();try{await seed(db);console.log('Fictional comparison demo seeded.');}finally{await db.close();}}
