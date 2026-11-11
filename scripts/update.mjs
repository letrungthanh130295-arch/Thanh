import {advanceCycle,cycleContext} from '../dist/model.js';
export function vnDay(iso){return new Date(iso).toLocaleDateString('en-CA',{timeZone:'Asia/Ho_Chi_Minh'});}
const digest=v=>JSON.stringify(v);
export function updateSnapshot(old,results,checkedAt){const s=advanceCycle(old,Date.parse(checkedAt)),reasons=[],errors=[];if(s.forecast.period!==old.forecast.period)reasons.push('cycle');s.lastCheckedAt=checkedAt;s.sources??={};
 const apply=(key,fn)=>{const r=results[key];if(r?.skip||!r)return;if(r?.error){s.sources[key]={...s.sources[key],status:'error',lastAttemptAt:checkedAt,error:String(r.error).slice(0,400)};errors.push(key+': '+r.error);return;}try{if(!r?.value)throw Error('Không có kết quả');fn(r.value);s.sources[key]={status:'ok',lastAttemptAt:checkedAt,lastSuccessAt:checkedAt,error:null};}catch(e){s.sources[key]={...s.sources[key],status:'error',lastAttemptAt:checkedAt,error:e.message};errors.push(key+': '+e.message);}};
 apply('platts',p=>{if(p.date<old.platts.date)throw Error('Dòng mới nhất cũ hơn snapshot, giữ số cũ');if(p.date>vnDay(checkedAt))throw Error('Ngày Platts ở tương lai');const before=[old.platts.date,old.platts.items.map(v=>v.value)];const after=[p.date,p.items.map(v=>v.value)];if(digest(before)!==digest(after)||old.platts.isSample)reasons.push('platts');s.platts={...p,sessions:[...new Map([...(old.platts.sessions||[]),...(p.sessions||[])].map(x=>[x.date,x])).values()].sort((a,b)=>b.date.localeCompare(a.date)),capturedAt:checkedAt,isSample:false};});
 apply('forecast',f=>{if(f.basisDate>vnDay(checkedAt)||f.basisDate>f.period)throw Error('Ngày thành phẩm không hợp lệ');if(f.period<s.forecast.period)throw Error('Trang dự báo vẫn ở kỳ cũ, giữ số cũ');const before=s.forecast.sources.find(x=>x.name==='Chợ Giá');if(f.period!==s.forecast.period){if(digest(s.pendingForecast?.deltas)!==digest(f.deltas)||s.pendingForecast?.period!==f.period)reasons.push('forecast-period');s.pendingForecast={...f,capturedAt:checkedAt};return;}if(digest(before.deltas)!==digest(f.deltas)||before.isSample)reasons.push('forecast');s.forecast.sources=s.forecast.sources.map(x=>x.name==='Chợ Giá'?{...x,...f,capturedAt:checkedAt,isSample:false,baselineConfirmed:f.basisDate>=cycleContext(s,Date.parse(checkedAt)).from}:x);Object.assign(s.forecast,{capturedAt:checkedAt,pageUpdatedAt:f.pageUpdatedAt,pageUpdatedKind:f.pageUpdatedKind,basisDate:f.basisDate});});
 for (const key of ['wti','brent']) {
   apply(key, quote => {
     const stored = old[key];
     if (stored?.marketTime && Date.parse(quote.marketTime) < Date.parse(stored.marketTime))
       throw Error('Giờ thị trường cũ hơn dữ liệu đã lưu');
     const previous = stored && !stored.isSample
       ? {price:stored.price,capturedAt:stored.capturedAt,marketTime:stored.marketTime,date:stored.date} : null;
     if (!previous || Math.abs(quote.price - previous.price) >= 1 - 1e-9) reasons.push(key);
     const sessions = new Map((stored?.sessions ?? []).map(point => [point.date, point]));
     for (const point of quote.sessions ?? []) {
       if (!sessions.has(point.date)) sessions.set(point.date, {...point,capturedAt:checkedAt,sourceUrl:quote.sourceUrl});
     }
     const same = stored?.price === quote.price && stored.marketTime === quote.marketTime && !stored.isSample;
     const history = [...sessions.values()].sort((a,b)=>a.date.localeCompare(b.date));
     s[key] = same ? {...stored,sessions:history} : {...quote,capturedAt:checkedAt,
       previous:history.at(-1) ?? previous,sessions:history,isSample:false};
   });
 }
 const f = results.forecast?.value;
 if (f && s.sources.forecast?.status === 'ok') {
   const values = f.deltas.slice(0,3);
   const id = digest([f.sourceUrl,f.period,f.basisDate,values]);
   if (!(s.forecastSnapshots ?? []).some(entry => entry.id === id)) {
     (s.forecastSnapshots ??= []).push({id,source:'Chợ Giá',sourceUrl:f.sourceUrl,
       capturedAt:checkedAt,period:f.period,basisDate:f.basisDate,deltas:values});
     reasons.push('forecast-snapshot');
   }
 }
 const deadline=s.forecast.period+'T15:00:00+07:00';
 if(Date.parse(checkedAt)<Date.parse(deadline)){
   for(const x of s.forecast.sources){
     if(x.baselineConfirmed&&x.basisDate>=cycleContext(s,Date.parse(checkedAt)).from&&!x.isSample&&x.capturedAt&&x.deltas.slice(0,3).every(Number.isFinite))
       (s.forecast.lockedPredictions??={})[x.name]={prices:x.deltas.slice(0,3).map((v,i)=>s.forecast.base[i]+v),capturedAt:x.capturedAt};
   }
 }
 // Scheduling never mutates official prices, pump prices, history, forecast.actual or its base.
 if(digest(s.official)!==digest(old.official)||digest(s.pump)!==digest(old.pump)||digest(s.history)!==digest(old.history))throw Error('PROTECTED_DATA_CHANGED');
 const succeeded=Object.keys(results).some(k=>s.sources[k]?.status==='ok'&&s.sources[k]?.lastAttemptAt===checkedAt);if(succeeded)s.capturedAt=checkedAt;s.mode='mixed';return {snapshot:s,shouldDeploy:reasons.length>0,reasons:[...new Set(reasons)],errors};}

