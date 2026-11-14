#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {diffLines} from 'diff';
import mammoth from 'mammoth';
import {getDb,REPO_ROOT} from './lib/db.mjs';
import {parseCsv,pick} from './lib/csv.mjs';
import {table,truncate} from './lib/format.mjs';
import {page,table as htmlTable,esc,writeOut} from './lib/render.mjs';
export const hash=x=>createHash('sha256').update(x).digest('hex');
const collections=['documents','versions','comparisons','changes','decisions','signoffs','activity','import_batches'];
export const reports={
 'review-queue':'select code,title,owner,due_on,changes,unresolved,status from review_queue order by due_on,code',
 attention:'select distinct * from attention_queue order by detail,code,finding',
 'open-changes':"select comparison,ordinal,location,kind,priority,decision,owner from change_register where decision in ('open','hold') order by due_on,comparison,ordinal",
 'high-priority':"select comparison,ordinal,location,decision,review_note from change_register where priority='high' order by comparison,ordinal",
 'reviewer-load':"select owner,count(*)::int comparisons,sum(unresolved)::int unresolved,count(*) filter(where due_on<current_date)::int overdue from review_queue where status='review' group by owner order by owner",
 'stale-reviews':"select code,title,owner,updated_at from review_queue where status='review' and updated_at<now()-interval '14 days' order by updated_at",
 'source-register':'select d.code,v.label,v.filename,v.extraction,v.file_sha256 from versions v join documents d on d.id=v.document_id order by d.code,v.created_at',
 'signoff-history':'select p.code,s.revision,p.revision current_revision,s.actor,s.evidence,(s.revision=p.revision) current,s.created_at from signoffs s join comparisons p on p.id=s.comparison_id order by s.created_at',
 compliance:'select * from compliance_findings order by code,rule',
 activity:'select action,note,actor,created_at from activity order by created_at,id'
};
const options={
 help:[],list:['kind'],show:['ref','kind'],changes:['ref'],
 add:['code','title','matter','owner','classification','retention-on'],
 'add-version':['ref','label','file'],compare:['ref','code','title','original','revised','owner','due-on'],
 assign:['ref','owner','due-on'],tag:['ref','change','priority'],decide:['ref','change','decision','note'],
 'review-scope':['ref','evidence'], 'review-access':['ref','evidence','retention-on'],signoff:['ref','evidence'],
 log:['ref','note'],import:['file','ref','code','title','source','owner','due-on','dry-run','map'],
 export:['file','kind'],'verify-sources':[], 'weekly-review':[], 'draft-departures':['ref'], 'draft-review':[],redline:['ref']
};
export const commands=[...Object.keys(reports),...Object.keys(options)];
const writes=new Set(['add','add-version','compare','assign','tag','decide','review-scope','review-access','signoff','log','import']);
const required=(o,k)=>{if(typeof o[k]!=='string'||!o[k].trim())throw Error(`--${k} is required`);return o[k].trim();};
const date=v=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(v)||new Date(v+'T00:00:00Z').toISOString().slice(0,10)!==v)throw Error('Date must be a real YYYY-MM-DD date');return v;};
const enumValue=(v,vs)=>{if(!vs.includes(v))throw Error(`Expected one of ${vs.join(', ')}`);return v;};
const now=()=>new Date().toISOString().slice(0,10);
export async function resolve(db,kind,ref,documentId=null){
 if(!['documents','versions','comparisons'].includes(kind))throw Error('Unsupported record kind');
 const name=kind==='versions'?'label':'title';
 const rows=await db.query(`select * from ${kind}${documentId?' where document_id=$1':''}`,documentId?[documentId]:[]);
 const q=String(ref||'').toLowerCase();if(!q)throw Error('--ref is required');
 const exact=rows.filter(r=>[r.id,r.code,r[name]].filter(Boolean).some(v=>v.toLowerCase()===q));
 const found=exact.length?exact:rows.filter(r=>r.id.toLowerCase().startsWith(q)||r[name].toLowerCase().includes(q)||(r.code||'').toLowerCase().includes(q));
 if(found.length!==1)throw Error(`${found.length?'Ambiguous':'No'} ${kind}: ${ref}${found.length?'\n'+found.map(r=>`${r.id} ${r.code||''} ${r[name]}`).join('\n'):''}`);
 return found[0];
}
const lock=async(db,p)=>{await db.query('select id from comparisons where id=$1 for update',[p.id]);};
const bump=async(db,p)=>db.query('update comparisons set revision=revision+1 where id=$1',[p.id]);
const event=async(db,o,action,note,p=null,d=null)=>db.query('insert into activity(comparison_id,document_id,action,note,actor) values($1,$2,$3,$4,$5)',[p?.id||null,d?.id||p?.document_id||null,action,note,o.actor]);
const getChange=async(db,p,o)=>{const n=Number(required(o,'change'));if(!Number.isSafeInteger(n)||n<1)throw Error('change must be a positive ordinal');const rows=await db.query('select * from changes where comparison_id=$1 and ordinal=$2',[p.id,n]);if(!rows.length)throw Error('No change at that ordinal');return rows[0];};
function loadFile(file){const b=fs.readFileSync(file);if(b.length>8*1024*1024)throw Error('File exceeds 8 MB limit');return b;}
async function readVersion(file){
 const buffer=loadFile(file),ext=path.extname(file).toLowerCase();let text,extraction;
 if(ext==='.txt'){
  text=new TextDecoder('utf-8',{fatal:true}).decode(buffer);if(text.includes('\0'))throw Error('Text contains binary NUL');
  extraction='UTF-8 text; line endings normalised; no layout comparison';
 }else if(ext==='.docx'){
  const result=await mammoth.extractRawText({buffer});text=result.value;
  extraction='DOCX text extraction only. Layout, graphics, revision markup and fields require source review.';
  if(result.messages.length)extraction+=' '+result.messages.map(m=>m.message).join(' ');
 }else throw Error('Supported input files: UTF-8 .txt or .docx. Convert and verify other formats first.');
 text=text.replace(/\r\n?/g,'\n');if(!text.trim())throw Error('No text extracted');if(text.length>500000)throw Error('Extracted text exceeds 500,000 characters');
 return {text,extraction,file_hash:hash(buffer),text_hash:hash(text)};
}
export function textChanges(before,after){
 const parts=diffLines(before,after,{timeout:3000,maxEditLength:20000});if(!parts)throw Error('Comparison exceeds processing limit');
 let oldLine=1,newLine=1;const changes=[];
 for(let i=0;i<parts.length;i++){
  const p=parts[i];if(!p.added&&!p.removed){oldLine+=p.count;newLine+=p.count;continue;}
  let a='',b='';const location=`Original line ${oldLine}; revised line ${newLine}`;
  if(p.removed){a=p.value;oldLine+=p.count;if(parts[i+1]?.added){b=parts[++i].value;newLine+=parts[i].count;}}
  else{b=p.value;newLine+=p.count;}
  changes.push({location,kind:a&&b?'replaced':a?'deleted':'inserted',before:a,after:b});
 }
 return changes;
}
async function insertComparison(db,d,o,mode,original=null,revised=null){
 return (await db.query('insert into comparisons(document_id,code,title,owner,due_on,mode,original_id,revised_id) values($1,$2,$3,$4,$5,$6,$7,$8) returning *',[d.id,required(o,'code'),o.title||d.title,required(o,'owner'),date(required(o,'due-on')),mode,original,revised]))[0];
}
async function perform(db,c,o,pos){
 if(reports[c])return db.query(reports[c]);
 if(c==='help')return commands.map(command=>({command,options:(options[command]||[]).map(k=>'--'+k).join(' '),actor:writes.has(command)}));
 if(c==='list'){const k=o.kind||'documents';if(!collections.includes(k))throw Error('Unknown collection');return db.query(`select * from ${k} order by created_at,id`);}
 if(c==='show')return [await resolve(db,o.kind||'comparisons',required(o,'ref'))];
 if(c==='changes'){const p=await resolve(db,'comparisons',required(o,'ref'));return db.query('select ordinal,location,kind,before_text,after_text,report_text,source_tag,source_note,priority,decision,review_note,reviewer from change_register where comparison_id=$1 order by ordinal',[p.id]);}
 if(c==='add'){
  const r=(await db.query('insert into documents(code,title,matter,owner,classification,retention_review_on) values($1,$2,$3,$4,$5,$6) returning *',[required(o,'code'),required(o,'title'),required(o,'matter'),required(o,'owner'),enumValue(o.classification||'confidential',['confidential','internal','public']),o['retention-on']?date(o['retention-on']):null]))[0];
  await event(db,o,c,r.code,null,r);return [r];
 }
 if(c==='add-version'){
  const d=await resolve(db,'documents',required(o,'ref')),label=required(o,'label'),file=required(o,'file'),v=await readVersion(file);
  const exists=await db.query('select * from versions where document_id=$1 and label=$2',[d.id,label]);
  if(exists.length){if(exists[0].file_sha256!==v.file_hash)throw Error('Version label already has different content; use a new label');return [{id:exists[0].id,label,unchanged:true}];}
  const r=(await db.query('insert into versions(document_id,label,filename,file_sha256,text_sha256,body,extraction,actor) values($1,$2,$3,$4,$5,$6,$7,$8) returning id,label,extraction',[d.id,label,path.basename(file),v.file_hash,v.text_hash,v.text,v.extraction,o.actor]))[0];
  await event(db,o,c,label,null,d);return [r];
 }
 if(c==='compare'){
  const d=await resolve(db,'documents',required(o,'ref')),a=await resolve(db,'versions',required(o,'original'),d.id),b=await resolve(db,'versions',required(o,'revised'),d.id);
  if(a.id===b.id)throw Error('Choose two different versions');
  if(hash(a.body)!==a.text_sha256||hash(b.body)!==b.text_sha256)throw Error('Stored source text failed integrity check');
  const changes=textChanges(a.body,b.body),p=await insertComparison(db,d,o,'text',a.id,b.id);
  for(const [i,x] of changes.entries())await db.query('insert into changes(comparison_id,ordinal,location,kind,before_text,after_text) values($1,$2,$3,$4,$5,$6)',[p.id,i+1,x.location,x.kind,x.before,x.after]);
  await event(db,o,c,`${changes.length} text changes; source scope requires review`,p);return [{id:p.id,code:p.code,changes:changes.length,scope_reviewed:false}];
 }
 if(c==='import'){
  if(pos[0]!=='draftable'||pos.length!==1)throw Error('Use import draftable');
  const file=required(o,'file'),source=required(o,'source'),bytes=loadFile(file),sha=hash(bytes),d=await resolve(db,'documents',required(o,'ref'));
  const old=await db.query('select b.*,p.document_id,p.code from import_batches b join comparisons p on p.id=b.comparison_id where b.source=$1 and b.file_sha256=$2',[source,sha]);
  if(old.length){if(old[0].document_id!==d.id||old[0].code!==required(o,'code'))throw Error('This source and file already belong to another comparison');return [{code:old[0].code,unchanged:old[0].row_count}];}
  const rows=parseCsv(new TextDecoder('utf-8',{fatal:true}).decode(bytes));if(!rows.length||rows.length>10000)throw Error('Import needs 1 to 10,000 change rows');
  const map=o.map?JSON.parse(fs.readFileSync(o.map,'utf8')):{};
  const keys={number:'No.',page:'Page',kind:'Change Type',content:'Content Type',tag:'Tag',note:'Notes',text:'Text',...map};
  for(const key of Object.keys(map))if(!['number','page','kind','content','tag','note','text'].includes(key)||typeof map[key]!=='string')throw Error('Invalid field mapping');
  for(const k of ['number','kind','text'])if(!Object.keys(rows[0]).some(h=>h.toLowerCase()===keys[k].toLowerCase()))throw Error(`Missing CSV header ${keys[k]}; provide --map for another export version`);
  const ordinals=new Set();const parsed=rows.map(row=>{const ordinal=Number(pick(row,keys.number));if(!Number.isSafeInteger(ordinal)||ordinal<1||ordinals.has(ordinal))throw Error('CSV change numbers must be positive and unique');ordinals.add(ordinal);const kind=pick(row,keys.kind);if(!kind.trim())throw Error('Empty change type');return {row,ordinal,kind};});
  const p=await insertComparison(db,d,o,'imported-report');
  for(const x of parsed)await db.query('insert into changes(comparison_id,ordinal,location,kind,report_text,source_tag,source_note,source_data,priority) values($1,$2,$3,$4,$5,$6,$7,$8,$9)',[p.id,x.ordinal,pick(x.row,keys.page),x.kind,pick(x.row,keys.text),pick(x.row,keys.tag),pick(x.row,keys.note),JSON.stringify(x.row),/high priority/i.test(pick(x.row,keys.tag))?'high':'normal']);
  await db.query('insert into import_batches(comparison_id,source,file_sha256,row_count,actor) values($1,$2,$3,$4,$5)',[p.id,source,sha,rows.length,o.actor]);
  await event(db,o,c,`${rows.length} Draftable changes imported; tags are source annotations, not approval`,p);
  return [{code:p.code,inserted:rows.length,dry_run:!!o['dry-run'],scope_reviewed:false}];
 }
 if(c==='review-access'){
  const d=await resolve(db,'documents',required(o,'ref'));await db.query('select id from documents where id=$1 for update',[d.id]);
  const r=await db.query('update documents set access_review_on=current_date,access_evidence=$1,retention_review_on=$2 where id=$3 returning code,access_review_on,retention_review_on',[required(o,'evidence'),date(required(o,'retention-on')),d.id]);
  await db.query('update comparisons set revision=revision+1 where document_id=$1',[d.id]);await event(db,o,c,o.evidence,null,d);return r;
 }
 if(['assign','tag','decide','review-scope','signoff','log'].includes(c)){
  const p=await resolve(db,'comparisons',required(o,'ref'));await lock(db,p);
  if(c==='assign'){if(!o.owner&&!o['due-on'])throw Error('Provide owner or due-on');await db.query('update comparisons set owner=$1,due_on=$2 where id=$3',[o.owner?required(o,'owner'):p.owner,o['due-on']?date(o['due-on']):p.due_on,p.id]);await bump(db,p);}
  if(c==='tag'){const x=await getChange(db,p,o);await db.query('update changes set priority=$1 where id=$2',[enumValue(required(o,'priority'),['normal','high']),x.id]);await bump(db,p);}
  if(c==='decide'){const x=await getChange(db,p,o);await db.query('insert into decisions(change_id,decision,note,actor) values($1,$2,$3,$4)',[x.id,enumValue(required(o,'decision'),['accepted','rejected','hold','open']),required(o,'note'),o.actor]);await bump(db,p);}
  if(c==='review-scope'){await db.query('update comparisons set scope_evidence=$1,scope_actor=$2,revision=revision+1 where id=$3',[required(o,'evidence'),o.actor,p.id]);}
  if(c==='signoff'){
   const fresh=(await db.query('select * from comparisons where id=$1',[p.id]))[0];
   if(!fresh.scope_evidence)throw Error('Source scope must be reviewed first');
   const d=await resolve(db,'documents',fresh.document_id);
   if((await db.query('select * from compliance_findings where code=$1',[d.code])).length)throw Error('Document access or retention review is due');
   if((await db.query("select id from change_register where comparison_id=$1 and decision in ('open','hold')",[p.id])).length)throw Error('Unresolved changes prevent signoff');
   if(fresh.owner.toLowerCase()===o.actor.toLowerCase())throw Error('Signoff requires an independent reviewer, different from the assigned owner');
   if(fresh.mode==='text')for(const v of await db.query('select body,text_sha256 from versions where id=$1 or id=$2',[fresh.original_id,fresh.revised_id]))if(hash(v.body)!==v.text_sha256)throw Error('Source integrity failure');
   await db.query('insert into signoffs(comparison_id,revision,actor,evidence) values($1,$2,$3,$4)',[p.id,fresh.revision,o.actor,required(o,'evidence')]);
  }
  if(c==='log')required(o,'note');
  await event(db,o,c,o.note||o.evidence||JSON.stringify(Object.fromEntries(Object.entries(o).filter(([k])=>!['json','actor'].includes(k)))),p);
  return db.query('select code,revision,status,unresolved,scope_reviewed from review_queue where id=$1',[p.id]);
 }
 if(c==='verify-sources'){
  const rows=await db.query('select d.code,v.label,v.body,v.text_sha256 from versions v join documents d on d.id=v.document_id order by d.code,v.label');
  return rows.map(r=>({document:r.code,label:r.label,stored_text_integrity:hash(r.body)===r.text_sha256?'pass':'FAIL'}));
 }
 if(c==='weekly-review')return {queue:await db.query(reports['review-queue']),attention:await db.query(reports.attention),load:await db.query(reports['reviewer-load'])};
 if(c==='export'){
  const file=path.resolve(required(o,'file'));fs.mkdirSync(path.dirname(file),{recursive:true,mode:0o700});
  let text;
  if(o.kind){if(!collections.includes(o.kind))throw Error('Unknown collection');const rows=await db.query(`select * from ${o.kind} order by created_at,id`),cols=rows.length?Object.keys(rows[0]):[];
   const csv=v=>'"'+String(typeof v==='object'&&v!==null?JSON.stringify(v):v??'').replace(/^[=+@\-\t\r]/,"'$&").replace(/"/g,'""')+'"';
   text=[cols.map(csv).join(','),...rows.map(r=>cols.map(k=>csv(r[k])).join(','))].join('\r\n');
  }else{const out={format:'document-comparisons-v1',exported_at:new Date().toISOString()};for(const k of collections)out[k]=await db.query(`select * from ${k} order by created_at,id`);text=JSON.stringify(out,null,2);}
  fs.writeFileSync(file,text,{mode:0o600,flag:'wx'});return [{file}];
 }
 if(c==='draft-review'){const data=await perform(db,'weekly-review',{},[]);const file=writeOut('drafts',`weekly-review-${Date.now()}`,page({title:'Draft for human review',sections:Object.entries(data).map(([title,rows])=>({title,html:htmlTable(rows)}))}));return [{file}];}
 if(c==='draft-departures'||c==='redline'){
  const p=await resolve(db,'comparisons',required(o,'ref')),rows=await perform(db,'changes',{ref:p.id},[]);let html;
  if(c==='redline'){
   if(p.mode!=='text')throw Error('An imported report is not a source redline; use draft-departures');
   const a=(await db.query('select body from versions where id=$1',[p.original_id]))[0],b=(await db.query('select body from versions where id=$1',[p.revised_id]))[0];
   const parts=diffLines(a.body,b.body,{timeout:3000,maxEditLength:20000});if(!parts)throw Error('Comparison exceeds processing limit');
   html='<pre style="white-space:pre-wrap">'+parts.map(x=>x.added?`<ins style="background:#dcfce7">${esc(x.value)}</ins>`:x.removed?`<del style="background:#fee2e2">${esc(x.value)}</del>`:esc(x.value)).join('')+'</pre>';
  }else {
   html=htmlTable(rows,p.mode==='text'?['ordinal','location','before_text','after_text']:['ordinal','location','report_text','source_tag','source_note']);
   html+='<h2>Review decisions</h2>'+htmlTable(rows,['ordinal','priority','decision','review_note','reviewer']);
  }
  const file=writeOut('drafts',`${c}-${p.id}-${Date.now()}`,page({title:c==='redline'?'Text redline for human review':'Draft departures report',subtitle:p.title,sections:[{title:'Review boundary',note:'Review notes do not change or accept edits in the source file. Text comparison does not check document layout, hidden content or images.',html:'<p>Draft for human review. Do not send without approval.</p>'},{title:'Changes',html}]}));return [{file}];
 }
 throw Error('Unknown command: '+c);
}
export async function run(db,c,o={},pos=[]){
 if(!commands.includes(c))throw Error('Unknown command: '+c);
 const allowed=new Set([...(options[c]||[]),'json',...(writes.has(c)?['actor']:[])]);
 for(const k of Object.keys(o))if(!allowed.has(k))throw Error('Unknown option --'+k);
 if(c!=='import'&&pos.length)throw Error('Unexpected positional argument');
 for(const k of ['json','dry-run'])if(k in o&&typeof o[k]!=='boolean')throw Error(`--${k} is a boolean flag, not a value`);
 if(writes.has(c))o={...o,actor:required(o,'actor')};
 await db.exec('BEGIN');
 try{const result=await perform(db,c,o,pos);await db.exec(o['dry-run']?'ROLLBACK':'COMMIT');return result;}
 catch(e){await db.exec('ROLLBACK');throw e;}
}
export function display(value){
 if(!Array.isArray(value))return Object.entries(value).map(([k,v])=>k+'\n'+display(v)).join('\n\n');
 if(!value.length)return '  (none)';
 const keys=Object.keys(value[0]);return table(value,keys.map(key=>({key,label:key,width:70,format:v=>truncate(typeof v==='object'?JSON.stringify(v):v,70)})));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 let db;try{
  const args=process.argv.slice(2),cmd=args.shift()||'help',o={},pos=[];
  for(const a of args){if(a.startsWith('--')){const i=a.indexOf('='),k=a.slice(2,i<0?undefined:i);if(k in o)throw Error('Repeated option --'+k);o[k]=i<0?true:a.slice(i+1);}else pos.push(a);}
  db=await getDb();const result=await run(db,cmd,o,pos);console.log(o.json?JSON.stringify(result,null,2):display(result));
 }catch(e){console.error(e.message);process.exitCode=1;}finally{await db?.close();}
}
