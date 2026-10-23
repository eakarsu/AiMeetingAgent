// Offline only: unset provider keys before importing app code.
delete process.env.OPENROUTER_API_KEY; delete process.env.OPENAI_API_KEY;
import test from 'node:test'; import assert from 'node:assert/strict';
import {createStore,toCsv,toSections,actionExtractor,meetingSummary,followupDraft} from '../src/featurePack.js';
test('feature pack tasks/search/update/export/sections preserve false/0/empty',()=>{
  const s=createStore(); const a=s.create('u1',{title:'Alpha',description:'',completed:false,estimateMinutes:0}); s.create('u1',{title:'Beta',status:'done'});
  assert.equal(s.list('u1',{search:'alpha'}).length,1); assert.equal(s.list('u1',{status:'done'}).length,1); assert.equal(s.list('u2',{}).length,0);
  assert.equal(s.update('u1',a.id,{status:'done'}).status,'done'); assert.equal(s.update('u2',a.id,{status:'x'}),null);
  const csv=toCsv(s.list('u1',{})); assert.ok(csv.startsWith('id,title')); assert.ok(csv.includes('Alpha'));
  const sec=Object.fromEntries(toSections(a).map(x=>[x.key,x])); assert.equal(sec.estimateMinutes.value,0); assert.equal(sec.description.value,'');
});
test('domain AI fallback is deterministic and labelled aiGenerated:false',()=>{
  const s=createStore(); s.create('u1',{title:'Send report',dueDate:'2026-01-01'});
  for(const r of [actionExtractor(s.list('u1',{}),{text:'Please send the report. Next topic.'}),meetingSummary(s.list('u1',{})),followupDraft(s.list('u1',{}))]){assert.equal(r.aiGenerated,false); assert.equal(r.source,'deterministic-fallback'); assert.ok(r.sections.length>=1);}
  assert.equal(actionExtractor([],{text:'Please send the report.'}).extracted.length,1);
});
