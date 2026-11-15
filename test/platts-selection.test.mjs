import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {ingestPlatts} from '../dist/platts-selection.js';
import {applyObservations} from '../scripts/ingest-platts.mjs';

const now='2026-11-16T18:00:00+07:00';
const openFrom='2026-11-12';
const options={now,openFrom,commodityscopeVerified:true};
const initial=()=>({items:['A92','A95','DO 10ppm','DO 50ppm','DO 0,05%S'].map(name=>({name})),sessions:[]});
const quote=(source,price,fields={})=>({product:'a95',session_date:'2026-11-16',price,source,unit:'USD/thùng',
  first_seen_at:'2026-11-16T16:00:00+07:00',...fields});
const selected=result=>result.selection['2026-11-16'].a95;

for(const source of ['zalo','chogia','commodityscope']){
  test(source+' wins when it arrives first',()=>{
    const remaining=['zalo','chogia','commodityscope'].filter(other=>other!==source);
    const later=remaining.map((other,i)=>quote(other,100+i,{first_seen_at:'2026-11-16T16:01:00+07:00'}));
    const result=ingestPlatts(initial(),[...later,quote(source,100)],options);
    const slot=selected(result);
    assert.equal(slot.selected.source,source);
    assert.equal(slot.selected.status,'confirmed');
    assert.deepEqual(slot.comparisons.map(row=>row.difference),[0,1]);
    assert.equal(slot.needsReview,true);
    assert.equal(slot.selected.source_published_at,null);
    assert.equal(ingestPlatts(result,later,options),result);
  });
}

test('Tie-break is deterministic; a separate later transaction cannot replace a published winner',()=>{
  const first=quote('zalo',102), second=quote('chogia',100);
  assert.deepEqual(ingestPlatts(initial(),[first,second],options),ingestPlatts(initial(),[second,first],options));
  const saved=ingestPlatts(initial(),[first],options);
  const retried=ingestPlatts(saved,[second],options);
  assert.equal(selected(retried).selected.price,102);
  assert.equal(selected(retried).observations.length,2);
});

test('Selection validates source, future dates and product grades, and isolates unverified CommodityScope',()=>{
  const input=initial();
  assert.equal(ingestPlatts(input,[quote('commodityscope',100)],{now,openFrom}),input);
  assert.throws(()=>ingestPlatts(input,[quote('zalo',100,{product:'do50'})],options));
  assert.throws(()=>ingestPlatts(input,[quote('zalo',100,{session_date:'2026-11-17'})],options));
  assert.throws(()=>ingestPlatts(input,[quote('zalo',0)],options));
  const result=ingestPlatts(input,[quote('zalo',100),quote('chogia',150,{product:'do10'})],options);
  assert.deepEqual(result.sessions[0].values,[null,100,150,null,null]);
});

test('A correction needs evidence and cannot rewrite a closed session',()=>{
  const saved=ingestPlatts(initial(),[quote('zalo',100)],options);
  assert.throws(()=>ingestPlatts(saved,[quote('zalo',101,{correction:true})],options));
  const corrected=ingestPlatts(saved,[quote('zalo',101,{correction:true,evidence:'Thông báo đính chính giá'})],options);
  assert.equal(selected(corrected).selected.status,'corrected');
  assert.deepEqual(selected(corrected).observations.map(row=>row.price),[100,101]);
  const old=ingestPlatts(corrected,[quote('chogia',199,{session_date:'2026-11-10'})],options);
  assert.deepEqual(old.sessions,corrected.sessions);
  assert.equal(old.selection['2026-11-10'].a95.selected,null);
  assert.throws(()=>ingestPlatts(old,[quote('zalo',199,{session_date:'2026-11-10',correction:true,evidence:'Đính chính'})],options));
});

test('Shared Zalo input uses server receipt time without changing forecasts or closed history',()=>{
  const snapshot=JSON.parse(readFileSync(new URL('../dist/snapshot.json',import.meta.url)));
  const payload={source:'zalo',session_date:'2026-11-16',prices:{a95:103},first_seen_at:'2026-11-12T00:00:00Z'};
  const result=applyObservations(snapshot,payload,now,{zaloReceivedAt:'2026-11-16T16:05:00+07:00'});
  assert.equal(selected(result.platts).selected.first_seen_at,'2026-11-16T16:05:00+07:00');
  assert.equal(result.history,snapshot.history);
  assert.equal(result.forecast,snapshot.forecast);
});
