import {marketCalendar} from './market-calendar.js';
export function historyRows(records){return [...records].sort((a,b)=>b.period.localeCompare(a.period)).slice(0,10);}
export function differences(actual,pred){return actual?.length===3&&pred?.length===3&&actual.every(Number.isFinite)&&pred.every(Number.isFinite)?actual.map((v,i)=>v-pred[i]):null;}
export function score(actual,pred){const d=differences(actual,pred);return d?d.reduce((a,v)=>a+Math.abs(v),0)/3:null;}
export function bestSources(record){const ranked=Object.entries(record.predictions||{}).map(([name,v])=>({name,score:score(record.actual,v)})).filter(x=>x.score!==null).sort((a,b)=>a.score-b.score);return ranked.length?ranked.filter(x=>x.score===ranked[0].score).map(x=>x.name):[];}
export function illustrative(base,delta){return Number.isFinite(base)&&Number.isFinite(delta)?base+delta:null;}


// UI projections only: keep the full snapshot and official records untouched.
export const visiblePlatts=['A92','A95','DO 0,05%S','DO 10ppm'];
export const pumpNames=['E5 RON 92-II','E10 RON 95-III','DO 0,05S-II','DO 0,001S-V'];
export function pumpValues(s){return pumpNames.map(name=>s.pump.items.find(x=>x[0]===name)?.[1]??null);}
function vnDay(value){return value?new Date(value).toLocaleDateString('en-CA',{timeZone:'Asia/Ho_Chi_Minh'}):null;}
function businessDays(from,to){const out=[];if(!from||!to||from>=to)return out;for(let d=new Date(from+'T00:00:00Z');d.toISOString().slice(0,10)<to;d.setUTCDate(d.getUTCDate()+1)){if(d.getUTCDay()!==0&&d.getUTCDay()!==6)out.push(d.toISOString().slice(0,10));if(out.length>370)break;}return out;}
function shiftDay(day,days){const d=new Date(day+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);}
function priceEvents(s,now){
 return [
  {at:s.official?.effectiveAt,prices:s.official?.prices,cutoff:s.official?.marketCutoffDate},
  {at:s.pump?.effectiveAt,prices:pumpValues(s),cutoff:s.pump?.marketCutoffDate},
  ...(s.pump?.previous?[{at:s.pump.previous.effectiveAt,prices:pumpValues({...s,pump:s.pump.previous}),cutoff:s.pump.previous.marketCutoffDate}]:[]),
  ...(s.history||[]).filter(x=>!x.isSample&&x.actual).map(x=>({at:x.effectiveAt||x.period+'T15:00:00+07:00',prices:x.actual,cutoff:x.marketCutoffDate}))
 ].filter(x=>x.at&&Date.parse(x.at)<=Number(now)&&x.prices?.slice(0,3).every(Number.isFinite));
}
function previousThursday(day){return shiftDay(nextThursday(day),-7)===day?shiftDay(day,-7):shiftDay(nextThursday(day),-7);}
export function cycleContext(s,now=Date.now()){
 const today=vnDay(now);
 const starts=[...new Set(priceEvents(s,now).map(x=>marketCalendar.startDateOverrides[x.at]||vnDay(x.at)))].sort();
 // A confirmed repricing opens the new window immediately. The Platts session
 // on that date closes after publication and cannot explain the price just set.
 // Windows are [start, next price-event date), never inclusive at both ends.
 const from=starts.at(-1)||previousThursday(today);
 const scheduled=nextThursday(from);
 const until=s.forecast.period>from&&s.forecast.period<scheduled?s.forecast.period:scheduled;
 const prior=starts.at(-2)||previousThursday(from);
 function window(start,end){
  const expected=businessDays(start,shiftDay(end,1));
  const sessions=[...new Map((s.platts.sessions||[]).filter(x=>start&&x.date>=start&&x.date<=end&&x.date<=today).map(x=>[x.date,x])).values()].sort((a,b)=>a.date.localeCompare(b.date));
  const missingDates=expected.filter(date=>!sessions.some(x=>x.date===date));
  const values=visiblePlatts.map(name=>{const i=s.platts.items.findIndex(x=>x.name===name);const valid=sessions.map(x=>x.values[i]).filter(x=>Number.isFinite(x)&&x>0);return sessions.length&&valid.length===sessions.length?valid.reduce((a,b)=>a+b,0)/valid.length:null;});
  return {from:start,to:end,until:shiftDay(end,1),dates:sessions.map(x=>x.date),count:sessions.length,expected:expected.length,missingDates,complete:!!expected.length&&!missingDates.length,values};
 }
 return {from,until,prior,current:window(from,shiftDay(until,-1)),previous:window(prior,shiftDay(from,-1))};
}
export function calculateTroo(p0,p1,fx,ratio,tax,nk0,nk1,env0,env1,vat,base){
 if(![p0,p1,fx,ratio,tax,nk0,nk1,env0,env1,vat,base].every(Number.isFinite)||base<=0)return null;
 const deltaPlatts=p1-p0;
 const blended=deltaPlatts/159*fx*ratio*(1+tax/100);
 // Xấp xỉ NK bỏ qua chi phí đưa về cảng vì không công khai.
 const importEffect=(nk1/100*p1-nk0/100*p0)*fx/159*ratio;
 const price=(base+blended+importEffect+env1-env0)*(1+vat/100);
 return {deltaPlatts,delta:Math.round(price-base),price:Math.round(price),percent:(price-base)/base*100};
}
export function threshold(percent){return Number.isFinite(percent)?percent>=14?'increase':percent<=-9?'decrease':'within':null;}


export function plattsChanges(s,now=Date.now()){const c=cycleContext(s,now);return visiblePlatts.map((name,i)=>({name,previous:c.previous.complete?c.previous.values[i]:null,current:c.current.values[i],percent:c.previous.complete&&Number.isFinite(c.previous.values[i])&&c.previous.values[i]>0&&Number.isFinite(c.current.values[i])?(c.current.values[i]/c.previous.values[i]-1)*100:null}));}
export function defaultTroo(s,now=Date.now()){const c=cycleContext(s,now),base=pumpValues(s);if(!c.previous.complete||!c.current.count)return null;const results=[.95,.90,1].map((ratio,i)=>calculateTroo(c.previous.values[i],c.current.values[i],26040,ratio,0,0,0,0,0,0,base[i]));if(results.some(x=>!x))return null;return {name:'T-Roo',period:s.forecast.period,deltas:results.map(x=>x.delta),prices:results.map(x=>x.price),currentDates:c.current.dates,previousDates:c.previous.dates};}

// Confirmed price events, never wall-clock guesses, advance the market window.
export function latestPriceEvent(s, now=Date.now()) {
 const events=priceEvents(s,now);
 events.sort((a,b)=>Date.parse(b.at)-Date.parse(a.at));
 const event=events[0];return {...event,day:vnDay(event?.at)};
}
export function nextThursday(day){const d=new Date(day+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+((4-d.getUTCDay()+7)%7||7));return d.toISOString().slice(0,10);}
export function advanceCycle(input,now=Date.now()){
 const s=structuredClone(input),event=latestPriceEvent(s,now),f=s.forecast;
 if(!event.day||Date.parse(event.at)<=Date.parse(f.baseEffectiveAt))return s;
 // Historical actuals and predictions remain in history; do not relabel them.
 const period=nextThursday(event.day),pending=s.pendingForecast;
 const fresh=pending?.period===period&&pending.basisDate>=event.day?pending:null;
 s.forecast={period,base:[...event.prices],baseEffectiveAt:event.at,marketCycleStart:event.day,
 actual:null,lockedPredictions:{},capturedAt:fresh?.capturedAt??null,basisDate:fresh?.basisDate??null,
 pageUpdatedAt:fresh?.pageUpdatedAt??null,pageUpdatedKind:fresh?.pageUpdatedKind??null,
 sources:f.sources.map(x=>({name:x.name,deltas:[null,null,null,null],isSample:false,capturedAt:null,providedAt:null,baselineConfirmed:false}))};
 if(fresh){const row=s.forecast.sources.find(x=>x.name==='Chợ Giá');Object.assign(row,fresh,{name:'Chợ Giá',isSample:false,baselineConfirmed:fresh.basisDate>=cycleContext(s,now).from});delete s.pendingForecast;}
 return s;
}
