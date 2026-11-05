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
export function cycleContext(s){
 const until=s.forecast.period;
 const from=vnDay(s.official.effectiveAt);
 const prior=[...new Set(s.history.map(x=>x.period))].filter(x=>x<from).sort().at(-1)??null;
 function window(start,end){
  const expected=businessDays(start,end);
  const sessions=[...new Map((s.platts.sessions||[]).filter(x=>start&&x.date>=start&&x.date<end).map(x=>[x.date,x])).values()].sort((a,b)=>a.date.localeCompare(b.date));
  const missingDates=expected.filter(date=>!sessions.some(x=>x.date===date));
  const values=visiblePlatts.map(name=>{const i=s.platts.items.findIndex(x=>x.name===name);const valid=sessions.map(x=>x.values[i]).filter(x=>Number.isFinite(x)&&x>0);return sessions.length&&valid.length===sessions.length?valid.reduce((a,b)=>a+b,0)/valid.length:null;});
  return {from:start,until:end,dates:sessions.map(x=>x.date),count:sessions.length,expected:expected.length,missingDates,complete:!!expected.length&&!missingDates.length,values};
 }
 return {from,until,prior,current:window(from,until),previous:window(prior,from)};
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


export function plattsChanges(s){const c=cycleContext(s);return visiblePlatts.map((name,i)=>({name,previous:c.previous.complete?c.previous.values[i]:null,current:c.current.values[i],percent:c.previous.complete&&Number.isFinite(c.previous.values[i])&&c.previous.values[i]>0&&Number.isFinite(c.current.values[i])?(c.current.values[i]/c.previous.values[i]-1)*100:null}));}
export function defaultTroo(s){const c=cycleContext(s),base=pumpValues(s);if(!c.previous.complete||!c.current.count)return null;const results=[.95,.90,1].map((ratio,i)=>calculateTroo(c.previous.values[i],c.current.values[i],26040,ratio,0,0,0,0,0,0,base[i]));if(results.some(x=>!x))return null;return {name:'T-Roo',period:s.forecast.period,deltas:results.map(x=>x.delta),prices:results.map(x=>x.price),currentDates:c.current.dates,previousDates:c.previous.dates};}
