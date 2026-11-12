import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {marketRisk,monitorDue} from '../dist/petrolimex-monitor.js';
import {applyNotice,candidates,parseNotice,verifyPrices} from '../scripts/monitor-petrolimex.mjs';

const snapshot = () => JSON.parse(readFileSync(new URL('../dist/snapshot.json',import.meta.url)));
const release = '2026-11-12T15:00:00+07:00';
const candidate = {at:Date.parse(release),url:'https://www.petrolimex.com.vn/ndi/thong-cao-bao-chi/petrolimex-dieu-chinh-gia-xang-dau-tu-15-gio-00-phut-ngay-12-11-2026.html'};
const detail = `<h2 class="blogDetail__title">Petrolimex điều chỉnh giá xăng dầu từ 15 giờ 00 phút ngày 12.11.2026</h2>
<div class="blogDetail__meta"><p class="f-author">Petrolimex</p><span class="f-date">03:00 CH @ Thứ Năm - 12 tháng 11, 2026</span></div>
<div class="entry-detail"><img src="//files.petrolimex.com.vn/jpgs/prices.jpg"><p>Mức giá mới có hiệu lực từ thời điểm 15 giờ 00 phút ngày 12 tháng 11 năm 2026.</p></div>`;
const table = {headers:['Vùng 1','Vùng 2'],rows:[
  ['Xăng E10 RON 95 Mức 3','Đồng/lít',19840,20230],
  ['Xăng E5 RON 92 Mức 2','Đồng/lít',19390,19770],
  ['Điêzen 0,001S Mức 5','Đồng/lít',28620,29190],
  ['Điêzen 0,05S Mức 2','Đồng/lít',26820,27350],
  ['Dầu Mazut 3,5S','Đồng/kg',19740,20130]
]};

test('Petrolimex cadence is 3h, 10 minutes on Thursdays, and 15 minutes during weekend alerts', () => {
  const check = (day,time,alert) => monitorDue(Date.parse(day+'T'+time+':00+07:00'),alert);
  assert(check('2026-11-13','03:00',false));
  assert(!check('2026-11-13','04:00',false));
  assert(check('2026-11-14','14:45',true));
  assert(!check('2026-11-14','14:45',false));
  for(const time of ['14:30','14:40','14:50','15:00','15:10','15:20','15:30','15:40','15:50','16:00','16:10','16:20','16:30'])
    assert(check('2026-11-12',time,false),time);
  assert(!check('2026-11-12','15:45',true));
  assert(check('2026-11-12','16:45',true));
});

test('Brent has priority and compares with a trading close before the official cycle', () => {
  const s=snapshot();
  s.pump.effectiveAt='2026-11-05T15:00:00+07:00';
  s.official.effectiveAt='2026-11-03T22:00:00+07:00';
  s.platts.date='2026-10-01';
  const quote = price => ({price,marketTime:'2026-11-10T14:00:00Z',sessions:[
    {date:'2026-11-04',price:100},{date:'2026-11-05',price:115}
  ]});
  s.brent=quote(115); s.wti=quote(90);
  const now=Date.parse('2026-11-10T14:30:00Z');
  assert.equal(marketRisk(s,now).trigger.name,'Brent');
  assert.equal(marketRisk(s,now).trigger.reference,'2026-11-04');
  s.brent=quote(108); s.wti=quote(108);
  assert.equal(marketRisk(s,now).trigger,null);
  s.wti=quote(90);
  assert.equal(marketRisk(s,now).trigger.name,'WTI');
});

test('only verified official notices and both correctly ordered regions can advance the cycle', () => {
  const link = `<a href="${candidate.url}">Petrolimex điều chỉnh giá xăng dầu</a>`;
  assert.deepEqual(candidates(link+link,0,candidate.at),[candidate]);
  assert.deepEqual(candidates(link.replace('www.petrolimex.com.vn','untrusted.example'),0,candidate.at),[]);
  assert.deepEqual(candidates(link,candidate.at,candidate.at),[]);
  assert.throws(()=>parseNotice(detail.replace('thời điểm 15','thời điểm 16'),candidate,candidate.at));
  assert.throws(()=>verifyPrices({...table,headers:['Vùng 2','Vùng 1']}));
  assert.throws(()=>verifyPrices({...table,rows:table.rows.slice(1)}));
  const s=snapshot();
  // Retain the live schema but make the adjustment test independent of the deployed period.
  s.official.effectiveAt='2026-11-03T22:00:00+07:00';
  s.pump.effectiveAt='2026-11-05T15:00:00+07:00';
  s.forecast.period='2026-11-12';
  s.forecast.marketCycleStart='2026-11-05';
  s.forecast.base=[20890,21150,28690,30090];
  s.forecast.lockedPredictions={'User cung cấp':{prices:[19400,19850,26830],capturedAt:'2026-11-12T12:00:00+07:00'}};
  const notice=parseNotice(detail,candidate,candidate.at);
  const prices=verifyPrices(table);
  const updated=applyNotice(s,notice,prices,release);
  assert.equal(updated.forecast.period,'2026-11-19');
  assert.deepEqual(updated.forecast.base,[19390,19840,26820,28620]);
  assert.equal(updated.history[0].accuracy['User cung cấp'].mae,10);
  assert.deepEqual(updated.platts,s.platts);
  assert.deepEqual(updated.choGiaObservations,s.choGiaObservations);
  assert.equal(applyNotice(updated,notice,prices,release),updated);
});
