import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {advanceCycle,cycleContext,defaultTroo,plattsChanges} from '../dist/model.js';
import {updateSnapshot} from '../scripts/update.mjs';
const original={
  "mode": "mixed",
  "capturedAt": "2026-11-06T07:01:47.662+07:00",
  "official": {
    "effectiveAt": "2026-11-03T22:00:00+07:00",
    "publishedAt": "2026-11-03T21:56:00+07:00",
    "prices": [
      23203,
      23231,
      28876,
      23974
    ],
    "changes": [
      -1020,
      -928,
      -1370,
      378
    ],
    "sourceUrl": "https://moit.gov.vn/tin-tuc/thong-tin-ve-dieu-hanh-gia-xang-dau-ngay-3-11-2026.html",
    "source": "Bộ Công Thương · thông báo 03/11/2026",
    "isSample": false,
    "fund": {
      "gasolineProvision": 700,
      "dieselProvision": 0,
      "fuelOilProvision": 0,
      "use": 0
    }
  },
  "pump": {
    "effectiveAt": "2026-11-05T15:00:00+07:00",
    "items": [
      [
        "E5 RON 92-II",
        20890
      ],
      [
        "E10 RON 95-III",
        21150
      ],
      [
        "E10 RON 95-V",
        22650
      ],
      [
        "DO 0,05S-II",
        28690
      ],
      [
        "DO 0,001S-V",
        30090
      ],
      [
        "Dầu hỏa 2-K",
        28600
      ],
      [
        "FO 3,5S",
        22000
      ],
      [
        "FO 180S-0,5S",
        27000
      ]
    ],
    "source": "Ảnh thông báo Chi nhánh Petrolimex Vũng Tàu ngày 05/11/2026 do chủ trạm cung cấp",
    "isSample": false,
    "previous": {
      "effectiveAt": "2026-11-03T22:00:00+07:00",
      "items": [
        [
          "E5 RON 92-II",
          23200
        ],
        [
          "E10 RON 95-III",
          23230
        ],
        [
          "E10 RON 95-V",
          24230
        ],
        [
          "DO 0,05S-II",
          28870
        ],
        [
          "DO 0,001S-V",
          30270
        ],
        [
          "Dầu hỏa 2-K",
          29010
        ],
        [
          "FO 3,5S",
          23970
        ],
        [
          "FO 180S-0,5S",
          29590
        ]
      ]
    },
    "capturedAt": "2026-11-05T07:41:11.283Z"
  },
  "platts": {
    "date": "2026-11-05",
    "previousDate": "2026-11-04",
    "items": [
      {
        "name": "A92",
        "unit": "USD/thùng",
        "value": 102.89,
        "previous": 110.95
      },
      {
        "name": "A95",
        "unit": "USD/thùng",
        "value": 104.68,
        "previous": 112.2
      },
      {
        "name": "97",
        "unit": "USD/thùng",
        "value": null,
        "previous": 113.31
      },
      {
        "name": "DO 0,05%S",
        "unit": "USD/thùng",
        "value": 152.52,
        "previous": 163.11
      },
      {
        "name": "DO 0,25%S",
        "unit": "USD/thùng",
        "value": null,
        "previous": 161.03
      },
      {
        "name": "DO 10ppm",
        "unit": "USD/thùng",
        "value": 155.24,
        "previous": 165.83
      },
      {
        "name": "DO 50ppm",
        "unit": "USD/thùng",
        "value": null,
        "previous": 166.47
      },
      {
        "name": "Dầu hỏa",
        "unit": "USD/thùng",
        "value": null,
        "previous": 164.52
      },
      {
        "name": "Marine",
        "unit": "USD/tấn",
        "value": 730.3,
        "previous": 831.36
      },
      {
        "name": "FO180",
        "unit": "USD/tấn",
        "value": 639.49,
        "previous": 759.12
      },
      {
        "name": "FO380",
        "unit": "USD/tấn",
        "value": null,
        "previous": 744.03
      },
      {
        "name": "Naphtha",
        "unit": "USD/thùng",
        "value": null,
        "previous": 109.34
      }
    ],
    "sessions": [
      {
        "date": "2026-11-05",
        "values": [
          102.89,
          104.68,
          null,
          152.52,
          null,
          155.24,
          null,
          null,
          730.3,
          639.49,
          null,
          null
        ]
      },
      {
        "date": "2026-11-04",
        "values": [
          110.95,
          112.2,
          113.31,
          163.11,
          161.03,
          165.83,
          166.47,
          164.52,
          831.36,
          759.12,
          744.03,
          109.34
        ]
      },
      {
        "date": "2026-11-03",
        "values": [
          114.28,
          115.53,
          116.64,
          164.08,
          160.2,
          166.8,
          167.78,
          166.4,
          926.46,
          826,
          833.94,
          114.56
        ]
      },
      {
        "date": "2026-11-02",
        "values": [
          119.5,
          120,
          132.83,
          164.1,
          159.89,
          167.04,
          168.31,
          166.83,
          923.53,
          812.36,
          830.01,
          114.62
        ]
      },
      {
        "date": "2026-10-30",
        "values": [
          127.64,
          128.14,
          136.56,
          166.11,
          157.84,
          170.02,
          166.93,
          165.24,
          914.72,
          820.8,
          818.22,
          112.68
        ]
      },
      {
        "date": "2026-10-29",
        "values": [
          135.1,
          135.6,
          null,
          162.74,
          null,
          167.26,
          null,
          null,
          null,
          821.72,
          null,
          null
        ]
      },
      {
        "date": "2026-10-28",
        "values": [
          138.8,
          139.3,
          140.26,
          166.49,
          168.94,
          171.01,
          178.48,
          177.52,
          890.23,
          807.61,
          804.11,
          110.27
        ]
      },
      {
        "date": "2026-10-27",
        "values": [
          142.57,
          143.15,
          138.69,
          175.27,
          168.46,
          179.79,
          178.16,
          177.82,
          886.11,
          805.98,
          802.34,
          109.45
        ]
      },
      {
        "date": "2026-10-26",
        "values": [
          140.37,
          140.95,
          141.93,
          172.95,
          168.83,
          177.63,
          178.42,
          178.57,
          882.48,
          804.93,
          801.01,
          108.41
        ]
      },
      {
        "date": "2026-10-23",
        "values": [
          137.14,
          137.72,
          138.7,
          176.07,
          166.83,
          180.75,
          176.42,
          177.2,
          873.98,
          793.56,
          789.03,
          107.12
        ]
      }
    ],
    "pageUpdatedAt": "2026-11-06T06:15:06+07:00",
    "pageUpdatedKind": "table",
    "sourceUrl": "https://chogia.vn/gia-xang-dau-singapore-hom-nay-38348/",
    "capturedAt": "2026-11-06T07:01:47.604+07:00",
    "isSample": false,
    "captureMethod": "browser-snapshot"
  },
  "wti": {
    "price": 91.2,
    "marketTime": "2026-11-05T21:59:59.000Z",
    "symbol": "CL=F",
    "exchange": "NYMEX",
    "currency": "USD",
    "sourceUrl": "https://query2.finance.yahoo.com/v8/finance/chart/CL=F",
    "capturedAt": "2026-11-05T22:37:03.546Z",
    "previous": {
      "price": 90.49,
      "capturedAt": "2026-11-05T16:19:46.516Z",
      "marketTime": "2026-11-05T16:09:42.000Z"
    },
    "isSample": false
  },
  "forecast": {
    "period": "2026-11-05",
    "capturedAt": "2026-11-05T19:57:15.457+07:00",
    "pageUpdatedAt": null,
    "basisDate": "2026-11-04",
    "base": [
      23203,
      23231,
      28876,
      23974
    ],
    "sources": [
      {
        "name": "Chợ Giá",
        "deltas": [
          -1630,
          -1410,
          -190,
          0
        ],
        "providedAt": null,
        "isSample": false,
        "capturedAt": "2026-11-05T19:57:15.457+07:00",
        "basisDate": "2026-11-04",
        "baselineConfirmed": false,
        "period": "2026-11-05",
        "pageUpdatedAt": null,
        "pageUpdatedKind": "not-provided",
        "sourceUrl": "https://chogia.vn/du-bao-gia-xang-dau-37804/",
        "captureMethod": "browser-snapshot",
        "prices": [
          21570,
          21820,
          28680
        ]
      },
      {
        "name": "User cung cấp",
        "deltas": [
          null,
          null,
          null,
          null
        ],
        "providedAt": null,
        "isSample": false,
        "capturedAt": null,
        "basisDate": null,
        "baselineConfirmed": false
      },
      {
        "name": "Petro Connect",
        "deltas": [
          null,
          null,
          null,
          null
        ],
        "providedAt": null,
        "isSample": false,
        "capturedAt": null,
        "basisDate": null,
        "baselineConfirmed": false
      },
      {
        "name": "T-Roo",
        "deltas": [
          -2302,
          -2071,
          -118,
          null
        ],
        "providedAt": null,
        "isSample": false,
        "capturedAt": null,
        "basisDate": "2026-11-04",
        "baselineConfirmed": false,
        "prices": [
          20898,
          21159,
          28752
        ],
        "period": "2026-11-05",
        "predictionOrigin": "Dự báo đã hiển thị trên dashboard trước khi chủ trạm gửi giá chính thức"
      },
      {
        "name": "Doanh nghiệp qua báo chí",
        "deltas": [
          null,
          null,
          null,
          null
        ],
        "providedAt": null,
        "isSample": false,
        "capturedAt": null,
        "basisDate": null,
        "baselineConfirmed": false
      }
    ],
    "actual": [
      20890,
      21150,
      28690,
      22000
    ],
    "baseEffectiveAt": "2026-11-03T22:00:00+07:00",
    "marketCycleStart": "2026-11-03",
    "marketWindowVerified": false,
    "pageUpdatedKind": "not-provided",
    "actualSource": "Ảnh thông báo Chi nhánh Petrolimex Vũng Tàu ngày 05/11/2026 do chủ trạm cung cấp",
    "actualEffectiveAt": "2026-11-05T15:00:00+07:00"
  },
  "history": [
    {
      "period": "2026-11-05",
      "effectiveAt": "2026-11-05T15:00:00+07:00",
      "actual": [
        20890,
        21150,
        28690
      ],
      "predictions": {
        "Chợ Giá": [
          21570,
          21820,
          28680
        ],
        "T-Roo": [
          20898,
          21159,
          28752
        ]
      },
      "errors": {
        "Chợ Giá": [
          -680,
          -670,
          10
        ],
        "T-Roo": [
          -8,
          -9,
          -62
        ]
      },
      "source": "Ảnh thông báo Chi nhánh Petrolimex Vũng Tàu ngày 05/11/2026 do chủ trạm cung cấp",
      "isSample": false,
      "predictionBasis": "Giá trụ bơm kỳ 03/11; dự báo đã quan sát trên dashboard trước khi nhận ảnh giá kỳ 05/11"
    },
    {
      "period": "2026-11-03",
      "effectiveAt": "2026-11-03T22:00:00+07:00",
      "actual": [
        23203,
        23231,
        28876
      ],
      "predictions": {},
      "source": "https://moit.gov.vn/tin-tuc/thong-tin-ve-dieu-hanh-gia-xang-dau-ngay-3-11-2026.html",
      "isSample": false
    },
    {
      "period": "2026-10-29",
      "actual": [
        26027,
        25734,
        30246
      ],
      "predictions": {},
      "isSample": true
    },
    {
      "period": "2026-10-22",
      "actual": null,
      "predictions": {}
    },
    {
      "period": "2026-10-15",
      "actual": null,
      "predictions": {}
    },
    {
      "period": "2026-10-08",
      "actual": null,
      "predictions": {}
    },
    {
      "period": "2026-10-01",
      "actual": null,
      "predictions": {}
    },
    {
      "period": "2026-09-24",
      "actual": null,
      "predictions": {}
    },
    {
      "period": "2026-09-17",
      "actual": null,
      "predictions": {}
    },
    {
      "period": "2026-09-10",
      "actual": null,
      "predictions": {}
    }
  ],
  "schemaVersion": 2,
  "sources": {
    "platts": {
      "status": "ok",
      "lastAttemptAt": "2026-11-06T07:01:47.604+07:00",
      "lastSuccessAt": "2026-11-06T07:01:47.604+07:00",
      "error": null,
      "captureMethod": "browser-snapshot",
      "sourceUrl": "https://chogia.vn/gia-xang-dau-singapore-hom-nay-38348/"
    },
    "forecast": {
      "status": "ok",
      "lastAttemptAt": "2026-11-06T07:01:47.662+07:00",
      "lastSuccessAt": "2026-11-06T07:01:47.662+07:00",
      "error": null,
      "captureMethod": "browser-snapshot",
      "sourceUrl": "https://chogia.vn/du-bao-gia-xang-dau-37804/"
    },
    "wti": {
      "status": "ok",
      "lastAttemptAt": "2026-11-05T22:37:03.546Z",
      "lastSuccessAt": "2026-11-05T22:37:03.546Z",
      "error": null
    }
  },
  "operations": {
    "schedulerActive": true,
    "hosting": "GitHub Pages",
    "note": "Chợ Giá: mỗi giờ phút 00 qua web; WTI: mỗi giờ phút 05 (UTC+7)"
  },
  "lastCheckedAt": "2026-11-06T07:01:47.662+07:00",
  "pendingForecast": {
    "period": "2026-11-12",
    "basisDate": "2026-11-05",
    "deltas": [
      -1560,
      -1400,
      -1900,
      -2500
    ],
    "pageUpdatedAt": null,
    "pageUpdatedKind": "not-provided",
    "sourceUrl": "https://chogia.vn/du-bao-gia-xang-dau-37804/",
    "captureMethod": "browser-snapshot",
    "capturedAt": "2026-11-06T07:01:47.662+07:00"
  }
}
;
const now=Date.parse('2026-11-06T16:00:00+07:00');
function withTwoSessions(){
 const s=advanceCycle(original,now);
 s.platts.sessions.push({date:'2026-11-06',values:[109.88,111.49,null,159.84,null,161.83,null,null,null,660.59,null,null]});
 return s;
}
function close(actual,expected){actual.forEach((v,i)=>assert.ok(Math.abs(v-expected[i])<1e-8,`${v} != ${expected[i]}`));}
test('confirmed repricing opens its own date and preserves all official and historical data',()=>{
 const s=advanceCycle(original,now),c=cycleContext(s,now);
 assert.equal(s.forecast.period,'2026-11-12');
 assert.deepEqual([c.previous.from,c.previous.to,c.current.from,c.current.to],['2026-11-03','2026-11-04','2026-11-05','2026-11-11']);
 assert.deepEqual(c.previous.dates,['2026-11-03','2026-11-04']);
 assert.deepEqual(c.current.dates,['2026-11-05']);
 assert.equal(c.current.expected,5);assert.equal(c.previous.complete,true);
 assert.deepEqual(s.history,original.history);assert.deepEqual(s.official,original.official);assert.deepEqual(s.pump,original.pump);
 assert.deepEqual(advanceCycle(s,now),s);
});
test('05 November close belongs only to 12 November; two-session averages and T-Roo match regression',()=>{
 const s=withTwoSessions(),before=structuredClone(s),c=cycleContext(s,now);
 assert.deepEqual(c.current.dates,['2026-11-05','2026-11-06']);
 assert.ok(!c.current.dates.some(d=>c.previous.dates.includes(d)));
 close(c.previous.values.slice(0,3),[112.615,113.865,163.595]);
 close(c.current.values.slice(0,3),[106.385,108.085,156.18]);
 const t=defaultTroo(s,now);assert.equal(t.period,'2026-11-12');assert.deepEqual(t.deltas,[-969,-852,-1214]);
 assert.deepEqual(t.previousDates,c.previous.dates);assert.deepEqual(t.currentDates,c.current.dates);
 const changes=plattsChanges(s,now);assert.ok(changes.slice(0,4).every(x=>x.percent<0));assert.equal(changes.length,4);
 assert.equal(changes[0].percent,(c.current.values[0]/c.previous.values[0]-1)*100);
 assert.deepEqual(s,before);
});
test('window changes at confirmed publication, without waiting for midnight or changing again next day',()=>{
 const s=advanceCycle(original,now);
 const before=cycleContext(s,Date.parse('2026-11-05T14:59:59+07:00'));
 assert.deepEqual([before.from,before.until],['2026-11-03','2026-11-05']);
 assert.deepEqual(before.current.dates,['2026-11-03','2026-11-04']);
 const after=cycleContext(s,Date.parse('2026-11-05T15:00:00+07:00'));
 assert.deepEqual([after.from,after.until],['2026-11-05','2026-11-12']);
 assert.equal(cycleContext(s,Date.parse('2026-11-06T00:00:00+07:00')).from,after.from);
});
test('normal Thursday windows exclude the next announcement date',()=>{
 const s=advanceCycle(original,now);s.official=null;s.pump.previous=null;s.history=s.history.filter(x=>x.period!=='2026-11-03');
 const c=cycleContext(s,now);assert.deepEqual([c.previous.from,c.previous.to,c.current.from,c.current.to],['2026-10-29','2026-11-04','2026-11-05','2026-11-11']);
});
test('averages available positive sessions even when other sessions are missing',()=>{
 const s=withTwoSessions();s.platts.sessions.find(x=>x.date==='2026-11-06').values[0]=0;
 assert.deepEqual(defaultTroo(s,now).deltas,[-1513,-852,-1214]);assert.equal(plattsChanges(s,now)[0].current,102.89);
 s.platts.sessions=s.platts.sessions.filter(x=>x.date!=='2026-11-04');
 assert.equal(cycleContext(s,now).previous.complete,false);assert.equal(defaultTroo(s,now).previousDates.length,1);
});
test('future events do not move early; extraordinary and regular events each open their own date',()=>{
 const s=advanceCycle(original,now);s.pump.previous=structuredClone(s.pump);delete s.pump.previous.previous;
 s.pump.effectiveAt='2026-11-10T15:00:00+07:00';
 assert.equal(cycleContext(s,Date.parse('2026-11-10T14:59:00+07:00')).from,'2026-11-05');
 let c=cycleContext(s,Date.parse('2026-11-10T15:00:00+07:00'));
 assert.deepEqual([c.previous.from,c.previous.to,c.current.from,c.current.to],['2026-11-05','2026-11-09','2026-11-10','2026-11-11']);
 s.history.push({period:'2026-11-10',effectiveAt:s.pump.effectiveAt,actual:[20000,21000,28000]});s.pump.effectiveAt='2026-11-12T15:00:00+07:00';
 const n=Date.parse('2026-11-12T15:00:00+07:00');
 c=cycleContext(advanceCycle(s,n),n);
 assert.deepEqual([c.previous.from,c.previous.to,c.current.from,c.current.to],['2026-11-10','2026-11-11','2026-11-12','2026-11-18']);
});
test('scheduler rejects stale forecasts and preserves sessions and protected prices',()=>{
 const r=updateSnapshot(original,{platts:{value:{...original.platts,sessions:original.platts.sessions.slice(0,1)}},forecast:{value:{period:'2026-11-05',basisDate:'2026-11-04',deltas:[1,2,3,0]}},wti:{skip:true}},new Date(now).toISOString());
 assert.equal(r.snapshot.forecast.period,'2026-11-12');assert.ok(r.shouldDeploy);assert.equal(r.snapshot.platts.sessions.length,original.platts.sessions.length);assert.deepEqual(r.snapshot.history,original.history);
});
test('forecast basis preceding the new window cannot qualify or create an accuracy lock',()=>{
 const s=advanceCycle(original,now);s.forecast.lockedPredictions={};
 const f={period:'2026-11-12',basisDate:'2026-11-04',deltas:[-1560,-1400,-1900,-2500]};
 const r=updateSnapshot(s,{platts:{skip:true},forecast:{value:f},wti:{skip:true}},new Date(now).toISOString()).snapshot;
 assert.equal(r.forecast.sources[0].baselineConfirmed,false);assert.deepEqual(r.forecast.lockedPredictions,{});
 assert.deepEqual(r.history,s.history);assert.deepEqual(r.forecast.base,s.forecast.base);
});

import {saveEntry, withManualPlatts} from '../dist/manual-prices.js';
test('Manual edits are dated, auditable and preserve prior values per product',()=>{
 const snapshot=withTwoSessions(), at=new Date(now).toISOString();
 const initial=saveEntry({},'platts','2026-11-06',['120,5','','160',''],at);
 assert.equal(saveEntry(initial,'platts','2026-11-06',['120.5','','160',''],at),initial);
 const edited=saveEntry(initial,'platts','2026-11-06',['121','','','159'],at);
 assert.equal(Object.keys(edited).length,1);
 assert.equal(edited['platts:2026-11-06'].revisions.length,2);
 const withForecast=saveEntry(edited,'forecast','2026-11-12',['21000','','28000'],at);
 const result=withManualPlatts(snapshot,withForecast);
 assert.equal(result.platts.sessions.length,snapshot.platts.sessions.length);
 close(cycleContext(result,now).current.trooValues,[111.945,104.68,155.76]);
 assert.deepEqual(defaultTroo(result,now),defaultTroo(withManualPlatts(snapshot,edited),now));
 assert.deepEqual(result.history,snapshot.history);
 assert.throws(()=>saveEntry({},'platts','2026-11-31',['0','','',''],at));
 assert.equal(saveEntry({},'forecast','2026-11-12',['0','',''],at)['forecast:2026-11-12'].values[0],0);
});
