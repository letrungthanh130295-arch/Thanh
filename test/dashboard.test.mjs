import {test} from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {parsePlatts,parseForecast,parseWTI,priceNumber} from '../scripts/parsers.mjs';import {updateSnapshot} from '../scripts/update.mjs';import {historyRows,score,differences,bestSources,illustrative} from '../dist/model.js';import {applyManual} from '../scripts/admin.mjs';
const html=await readFile(new URL('./fixtures/platts.html',import.meta.url),'utf8'),forecastHtml=await readFile(new URL('./fixtures/forecast.html',import.meta.url),'utf8'),seed=JSON.parse(await readFile(new URL('./fixtures/seed.json',import.meta.url),'utf8'));
const now='2026-11-04T09:00:00+07:00';
const meta={symbol:'CL=F',currency:'USD',exchangeName:'NYM',regularMarketPrice:96.33,regularMarketTime:Date.parse('2026-11-04T08:59:00+07:00')/1000};
const json={chart:{result:[{meta}],error:null}};
const failures={platts:{error:'HTTP 503'},forecast:{error:'schema changed'},wti:{error:'HTTP 429'}};
test('Platts maps column names, chooses latest dated row, reads prior session',()=>{const p=parsePlatts(html);assert.equal(p.date,'2026-11-03');assert.equal(p.items.length,12);assert.equal(p.items[2].value,116.64);assert.equal(p.items[3].value,164.08);assert.equal(p.items[4].value,160.20);assert.equal(p.items[3].previous,164.10);assert.equal(p.pageUpdatedAt,'2026-11-04T14:27:59+07:00');assert.equal(p.sessions.find(x=>x.date==='2026-10-29').values[2],null);});
test('Zero is missing, unexpected content or schema fails closed',()=>{assert.equal(priceNumber('0,00'),null);assert.equal(priceNumber('0.00'),null);assert.throws(()=>priceNumber('N/A 125'));assert.throws(()=>parsePlatts(html.replace('Xăng 95','Xăng E15')));assert.throws(()=>parsePlatts('<html>captcha</html>'));assert.throws(()=>parsePlatts(html.replace('114.28','<b>giá lỗi</b>')));});
test('Forecast parses cards and ignores embedded WTI',()=>{const f=parseForecast(forecastHtml);assert.equal(f.period,'2026-11-05');assert.equal(f.basisDate,'2026-11-02');assert.deepEqual(f.deltas,[-2940,-2790,-1380,0]);assert.throws(()=>parseForecast(forecastHtml.replace('Giảm 2.790đ','Giảm chưa biết')));assert.throws(()=>parseForecast(forecastHtml.replace('cg-title','new-title')));});
test('Yahoo strictly uses NYMEX CL=F regularMarket fields',()=>{assert.equal(parseWTI(json,new Date(now)).price,96.33);assert.throws(()=>parseWTI({chart:{result:[{meta:{...meta,symbol:'BZ=F'}}]}}));assert.throws(()=>parseWTI({chart:{result:[{meta:{...meta,regularMarketTime:null}}]}}));});
test('Failures retain old numbers and all protected data; log state only',()=>{const r=updateSnapshot(seed,failures,now);assert.deepEqual(r.snapshot.platts,seed.platts);assert.deepEqual(r.snapshot.wti,seed.wti);assert.deepEqual(r.snapshot.forecast,seed.forecast);assert.deepEqual(r.snapshot.official,seed.official);assert.deepEqual(r.snapshot.history,seed.history);assert.equal(r.errors.length,3);assert.equal(r.shouldDeploy,false);assert.equal(r.snapshot.sources.wti.status,'error');});
test('Meaningful price/date/forecast or >=1 USD triggers; small WTI still saved',()=>{const base=structuredClone(seed);base.platts.isSample=true;base.forecast.sources[0].isSample=true;base.wti={price:95,capturedAt:'2026-11-04T06:16:00+07:00',marketTime:'2026-11-04T06:15:00+07:00',isSample:false};for(const [price,deploy] of [[95.99,false],[96,true],[94,true],[95,false]]){const r=updateSnapshot(base,{...failures,wti:{value:{...parseWTI(json,new Date(now)),price}}},now);assert.equal(r.shouldDeploy,deploy);assert.equal(r.snapshot.wti.price,price);assert.equal(r.snapshot.wti.previous.price,95);assert.deepEqual(r.snapshot.official,base.official);assert.deepEqual(r.snapshot.forecast.actual,base.forecast.actual);}assert.equal(updateSnapshot(base,{...failures,platts:{value:parsePlatts(html)}},now).shouldDeploy,true);assert.equal(updateSnapshot(base,{...failures,forecast:{value:parseForecast(forecastHtml)}},now).shouldDeploy,true);});
test('Small WTI compares previous check, not previous deployment',()=>{let s=structuredClone(seed);s.wti={price:95,isSample:false};for(const price of [95.6,96.2]){const r=updateSnapshot(s,{...failures,wti:{value:{...parseWTI(json,new Date(now)),price}}},now);assert.equal(r.shouldDeploy,false);s=r.snapshot;}});
test('Old source rows do not overwrite data; next forecast does not overwrite actual',()=>{const p=parsePlatts(html);p.date='2026-10-01';const r=updateSnapshot(seed,{...failures,platts:{value:p},forecast:{value:{...parseForecast(forecastHtml),period:'2026-11-12'}}},now);assert.deepEqual(r.snapshot.platts,seed.platts);assert.equal(r.snapshot.forecast.period,seed.forecast.period);assert.equal(r.snapshot.forecast.actual,seed.forecast.actual);assert.equal(r.snapshot.pendingForecast.period,'2026-11-12');});
test('History window, signed errors, MAE, ties and missing forecasts',()=>{assert.equal(seed.history.length,10);assert.equal(historyRows([{period:'2026-11-05'},...seed.history]).length,10);assert.equal(historyRows([{period:'2026-11-05'},...seed.history])[0].period,'2026-11-05');assert.equal(score([10,20,30],[13,14,30]),3);assert.deepEqual(differences([10,20,30],[13,14,30]),[-3,6,0]);assert.equal(score([10,20,30],[13,null,30]),null);assert.deepEqual(bestSources({actual:[10,20,30],predictions:{a:[10,20,31],b:[10,20,29],c:[null,20,30]}}),['a','b']);assert.equal(illustrative(23203,-2940),20263);assert.equal(illustrative(null,-2940),null);});
test('Manual Petro input requires evidence and rejects historical edits',()=>{const input={type:'forecast',source:'Petro Connect',period:seed.forecast.period,providedAt:'2026-11-04T08:00:00+07:00',evidence:'bản tin chủ trạm',deltas:[-100,-200,0,null],baselineConfirmed:true};const s=applyManual(seed,input,now);assert.equal(s.forecast.sources[2].deltas[0],-100);assert.deepEqual(s.official,seed.official);assert.throws(()=>applyManual(seed,{...input,evidence:null},now));assert.throws(()=>applyManual(seed,input,'2026-11-06T00:00:00+07:00'));});
test('Official manual rollover retains exactly ten, never invents predictions',()=>{const r=applyManual(seed,{type:'official',prices:[23000,23100,28000,24000],effectiveAt:'2026-11-05T15:00:00+07:00',publishedAt:'2026-11-05T15:00:00+07:00',sourceUrl:'https://moit.gov.vn/',nextPeriod:'2026-11-12'},'2026-11-05T16:00:00+07:00');assert.equal(r.history.length,10);assert.equal(r.history[0].period,'2026-11-05');assert.deepEqual(r.history[0].predictions,{});assert.equal(r.forecast.actual,null);assert.equal(r.forecast.period,'2026-11-12');assert.deepEqual(r.forecast.base,[23000,23100,28000,24000]);});
test('Correction matches attached notice and official counterparts',()=>{assert.deepEqual(seed.official.prices,[23203,23231,28876,23974]);assert.equal(seed.pump.items.find(([n])=>n==='E10 RON 95-III')[1],23230);assert.equal(seed.pump.items.find(([n])=>n==='FO 180S-0,5S')[1],29590);});
test('Pre-publication forecasts freeze; late changes cannot replace scored values',()=>{const f=parseForecast(forecastHtml);f.basisDate='2026-11-04';const r=updateSnapshot(seed,{...failures,forecast:{value:f}},now);assert.deepEqual(r.snapshot.forecast.lockedPredictions['Chợ Giá'].prices,[20263,20441,27496]);const late=updateSnapshot(r.snapshot,{...failures,forecast:{value:{...f,deltas:[100,200,300,0]}}},'2026-11-05T15:01:00+07:00');assert.deepEqual(late.snapshot.forecast.lockedPredictions,r.snapshot.forecast.lockedPredictions);const done=applyManual(late.snapshot,{type:'official',prices:[23000,23100,28000,24000],effectiveAt:'2026-11-05T15:00:00+07:00',publishedAt:'2026-11-05T15:00:00+07:00',sourceUrl:'https://moit.gov.vn/'},'2026-11-05T16:00:00+07:00');assert.deepEqual(done.history[0].predictions['Chợ Giá'],[20263,20441,27496]);});

import {mkdtemp, writeFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {run, fillMissingPlatts} from '../scripts/fetch-snapshot.mjs';

test('Refresh fills only missing Platts and preserves populated prices',()=>{
 const incoming=parsePlatts(html);
 const old=structuredClone(incoming);
 old.sessions[0].values[0]=200;
 old.sessions[0].values[1]=null;
 const merged=fillMissingPlatts(old,incoming);
 assert.equal(merged.items[0].value,200);
 assert.equal(merged.items[1].value,incoming.items[1].value);
 assert.equal(new Set(merged.sessions.map(row=>row.date)).size,merged.sessions.length);
});
test('Refresh archives Chợ Giá and both crude series, with identical reruns byte-for-byte',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'thanh-test-'));
 try {
  const path=join(dir,'snapshot.json');
  const initial=structuredClone(seed);initial.platts.isSample=true;initial.wti.isSample=true;delete initial.wti.marketTime;await writeFile(path,JSON.stringify(initial));
  const urls=[];
  const fetcher=async url=>{
    urls.push(url);
    if (url.includes('chogia.vn')) return new Response(url.includes('singapore')?html:forecastHtml);
    const symbol=url.includes('CL=F')?'CL=F':'BZ=F';
    return Response.json({chart:{result:[{meta:{...meta,symbol,regularMarketPrice:symbol==='CL=F'?96.33:101},
      timestamp:[Date.parse('2026-11-02T13:00:00Z')/1000,Date.parse('2026-11-03T13:00:00Z')/1000],
      indicators:{quote:[{close:[95,null]}]}}]}});
  };
  assert.equal((await run({path,fetcher,now:new Date(now)})).changed,true);
  const before=await readFile(path,'utf8');
  assert.equal((await run({path,fetcher,now:new Date(Date.parse(now)+60000)})).changed,false);
  assert.equal(await readFile(path,'utf8'),before);
  assert.equal(urls.length,8);
  const saved=JSON.parse(before);
  assert.deepEqual(saved.history,seed.history);
  assert.deepEqual(saved.pump,seed.pump);
  assert.equal(saved.forecastSnapshots.length,1);
  assert.deepEqual(saved.forecastSnapshots[0].deltas,[-2940,-2790,-1380]);
  assert.equal(saved.wti.price,96.33);
  assert.equal(saved.brent.price,101);
  assert.deepEqual(saved.wti.sessions.map(({date,price})=>[date,price]),[['2026-11-02',95]]);
  const denied=await run({path,fetcher:async url=>url.includes('CL=F')?new Response(null,{status:403}):fetcher(url),now:new Date(now)});
  assert.equal(denied.changed,false);
  assert.equal(denied.snapshot.sources.wti.status,'error');
  assert.deepEqual(denied.snapshot.wti,saved.wti);
 } finally { await rm(dir,{recursive:true,force:true}); }
});
test('Pages workflow has one six-slot cron and retains manual dispatch and three source columns',async()=>{
 const workflow=await readFile(new URL('../.github/workflows/snapshot.yml',import.meta.url),'utf8');
 const schedules=[...workflow.matchAll(/cron: '0 ([\d,]+) \* \* \*'/g)];
 assert.equal(schedules.length,1);
 assert.deepEqual(schedules[0][1].split(',').map(hour=>(+hour+7)%24).sort((a,b)=>a-b),[6,9,12,15,18,21]);
 assert.match(workflow,/if: github.event_name == 'workflow_dispatch' \|\| github.event_name == 'schedule'/);
 const page=await readFile(new URL('../dist/index.html',import.meta.url),'utf8');
 assert.match(page,/<th>Sản phẩm<\/th><th>Chợ Giá .*<\/th><th>T-Roo .*<\/th><th>Người dùng /);
 assert.match(page,/id="price-charts"/);
});


import {manualForecastDeltas,saveEntry} from '../dist/manual-prices.js';
import {tradingDays} from '../dist/market-charts.js';

test('Signed forecasts retain legacy absolute revisions and never infer a missing base',()=>{
 const legacy={values:[20550,21320,28000],updatedAt:now,source:'Người dùng'};
 const key='forecast:2026-11-05';
 const entries={[key]:{...legacy,revisions:[legacy]}};
 assert.deepEqual(manualForecastDeltas(legacy,[21000,21000,28000]),[-450,320,0]);
 assert.deepEqual(manualForecastDeltas(legacy,null),[null,null,null]);
 const next=saveEntry(entries,'forecast','2026-11-05',['-450','+320','0'],now);
 assert.deepEqual(manualForecastDeltas(next[key],null),[-450,320,0]);
 assert.deepEqual(next[key].revisions[0],legacy);
 assert.equal(saveEntry(next,'forecast','2026-11-05',['−450','320','0'],now),next);
});

test('Chart dates retain missing weekdays and skip weekends without a quote',()=>{
 const actual=new Map([['2026-11-06',100],['2026-11-10',101]]);
 assert.deepEqual(tradingDays([actual],30),['2026-11-06','2026-11-09','2026-11-10']);
});
