export function vnDay(iso){return new Date(iso).toLocaleDateString('en-CA',{timeZone:'Asia/Ho_Chi_Minh'});}
const digest=v=>JSON.stringify(v);
export function updateSnapshot(old,results,checkedAt){const s=structuredClone(old),reasons=[],errors=[];s.lastCheckedAt=checkedAt;s.sources??={};
 const apply=(key,fn)=>{const r=results[key];if(r?.skip)return;if(r?.error){s.sources[key]={...s.sources[key],status:'error',lastAttemptAt:checkedAt,error:String(r.error).slice(0,400)};errors.push(key+': '+r.error);return;}try{if(!r?.value)throw Error('Không có kết quả');fn(r.value);s.sources[key]={status:'ok',lastAttemptAt:checkedAt,lastSuccessAt:checkedAt,error:null};}catch(e){s.sources[key]={...s.sources[key],status:'error',lastAttemptAt:checkedAt,error:e.message};errors.push(key+': '+e.message);}};
 apply('platts',p=>{if(p.date<old.platts.date)throw Error('Dòng mới nhất cũ hơn snapshot, giữ số cũ');if(p.date>vnDay(checkedAt))throw Error('Ngày Platts ở tương lai');const before=[old.platts.date,old.platts.items.map(v=>v.value)];const after=[p.date,p.items.map(v=>v.value)];if(digest(before)!==digest(after)||old.platts.isSample)reasons.push('platts');s.platts={...p,capturedAt:checkedAt,isSample:false};});
 apply('forecast',f=>{if(f.basisDate>vnDay(checkedAt)||f.basisDate>f.period)throw Error('Ngày thành phẩm không hợp lệ');if(f.period<old.forecast.period)throw Error('Trang dự báo vẫn ở kỳ cũ, giữ số cũ');const before=old.forecast.sources.find(x=>x.name==='Chợ Giá');if(f.period!==old.forecast.period){if(digest(s.pendingForecast?.deltas)!==digest(f.deltas)||s.pendingForecast?.period!==f.period)reasons.push('forecast-period');s.pendingForecast={...f,capturedAt:checkedAt};return;}if(digest(before.deltas)!==digest(f.deltas)||before.isSample)reasons.push('forecast');s.forecast.sources=s.forecast.sources.map(x=>x.name==='Chợ Giá'?{...x,...f,capturedAt:checkedAt,isSample:false,baselineConfirmed:f.basisDate>=old.forecast.baseEffectiveAt.slice(0,10)}:x);Object.assign(s.forecast,{capturedAt:checkedAt,pageUpdatedAt:f.pageUpdatedAt,pageUpdatedKind:f.pageUpdatedKind,basisDate:f.basisDate});});
 apply('wti',w=>{if(old.wti.marketTime&&Date.parse(w.marketTime)<Date.parse(old.wti.marketTime))throw Error('WTI cũ hơn giờ thị trường đã lưu');const previous=old.wti.isSample?null:{price:old.wti.price,capturedAt:old.wti.capturedAt,marketTime:old.wti.marketTime};if(previous===null||Math.abs(w.price-previous.price)>=1-1e-9)reasons.push('wti');s.wti={...w,capturedAt:checkedAt,previous,isSample:false};});
 const deadline=s.forecast.period+'T15:00:00+07:00';
 if(Date.parse(checkedAt)<Date.parse(deadline)){
   for(const x of s.forecast.sources){
     if(x.baselineConfirmed&&!x.isSample&&x.capturedAt&&x.deltas.slice(0,3).every(Number.isFinite))
       (s.forecast.lockedPredictions??={})[x.name]={prices:x.deltas.slice(0,3).map((v,i)=>s.forecast.base[i]+v),capturedAt:x.capturedAt};
   }
 }
 // Scheduling never mutates official prices, pump prices, history, forecast.actual or its base.
 if(digest(s.official)!==digest(old.official)||digest(s.pump)!==digest(old.pump)||digest(s.history)!==digest(old.history)||digest(s.forecast.actual)!==digest(old.forecast.actual))throw Error('PROTECTED_DATA_CHANGED');
 const succeeded=Object.keys(results).some(k=>s.sources[k]?.status==='ok');if(succeeded)s.capturedAt=checkedAt;s.mode='mixed';return {snapshot:s,shouldDeploy:reasons.length>0,reasons:[...new Set(reasons)],errors};}

