import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {advanceCycle,cycleContext,defaultTroo} from '../dist/model.js';
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
const now=Date.parse('2026-11-06T07:30:00+07:00');
test('confirmed 05/11 pump event advances both forecast and Platts to 12/11',()=>{
 const s=advanceCycle(original,now);assert.equal(s.forecast.period,'2026-11-12');
 assert.equal(s.forecast.baseEffectiveAt,original.pump.effectiveAt);assert.deepEqual(s.forecast.base.slice(0,3),[20890,21150,28690]);
 assert.deepEqual(s.forecast.sources[0].deltas,[-1560,-1400,-1900,-2500]);
 assert.equal(s.forecast.actual,null);assert.deepEqual(s.history,original.history);assert.deepEqual(s.official,original.official);
 const c=cycleContext(s);assert.equal(c.from,'2026-11-05');assert.equal(c.until,'2026-11-12');assert.deepEqual(c.previous.dates,['2026-11-03','2026-11-04']);assert.deepEqual(c.current.dates,['2026-11-05']);assert.ok(defaultTroo(s));assert.deepEqual(advanceCycle(s,now),s);
});
test('extraordinary repricing resets window without advancing beyond next Thursday',()=>{
 const s=advanceCycle(original,now);s.pump.effectiveAt='2026-11-10T22:00:00+07:00';s.history.push({period:'2026-11-10',effectiveAt:s.pump.effectiveAt,actual:[20000,21000,28000]});
 const n=advanceCycle(s,Date.parse('2026-11-11T07:00:00+07:00'));assert.equal(n.forecast.period,'2026-11-12');assert.equal(cycleContext(n,Date.parse('2026-11-11T07:00:00+07:00')).from,'2026-11-10');assert.ok(n.forecast.sources.every(x=>x.deltas.every(v=>v===null)));assert.equal(defaultTroo(n),null);
});
test('scheduler rolls forward even if sources fail, rejects stale forecast and retains sessions',()=>{
 const r=updateSnapshot(original,{platts:{value:{...original.platts,sessions:original.platts.sessions.slice(0,1)}},forecast:{value:{period:'2026-11-05',basisDate:'2026-11-04',deltas:[1,2,3,0]}},wti:{skip:true}},new Date(now).toISOString());
 assert.equal(r.snapshot.forecast.period,'2026-11-12');assert.ok(r.shouldDeploy);assert.equal(r.snapshot.platts.sessions.length,original.platts.sessions.length);assert.deepEqual(r.snapshot.history,original.history);
});
