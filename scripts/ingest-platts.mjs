import {readFile,rename,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {cycleContext} from '../dist/model.js';
import {ingestPlatts,products} from '../dist/platts-selection.js';
import {updateSnapshot} from './update.mjs';
import {FORECAST_URL,PLATTS_URL} from './parsers.mjs';

export function trackedSessions(platts){
  return platts.sessions.map(row=>({date:row.date,prices:Object.fromEntries(Object.entries(products).map(([code,names])=>
    [code,row.values[platts.items.findIndex(item=>names.includes(item.name))]??null]))}));
}

export function applyObservations(snapshot,payload,now,{zaloReceivedAt=now}={}){
  const cycle=cycleContext(snapshot,Date.parse(now));
  let rows=[];
  if(payload.source==='zalo'){
    if(!payload.prices || !Object.keys(payload.prices).length)throw Error('Cần ít nhất một báo giá Zalo');
    rows=Object.entries(payload.prices).map(([product,price])=>({product,price,session_date:payload.session_date,
      source:'zalo',unit:'USD/thùng',first_seen_at:zaloReceivedAt,source_published_at:payload.source_published_at,
      correction:payload.correction===true,evidence:payload.evidence}));
  } else if(payload.source==='chogia'){
    const quote=payload.platts;
    if(quote){
      if(quote.sourceUrl!==PLATTS_URL)throw Error('URL Platts Chợ Giá không hợp lệ');
      if(!Array.isArray(quote.sessions)||quote.sessions.length>30)throw Error('Danh sách phiên Chợ Giá không hợp lệ');
      rows=quote.sessions.flatMap(({date,prices})=>Object.entries(prices).filter(([,price])=>price!=null).map(([product,price])=>({
        product,price,session_date:date,source:'chogia',unit:'USD/thùng',first_seen_at:quote.capturedAt,
        source_published_at:date===quote.date?quote.sourcePublishedAt:null
      })));
    }
  } else throw Error('Nguồn chưa được bật');
  const platts=ingestPlatts(snapshot.platts,rows,{now,openFrom:cycle.from,closedBefore:cycle.until+'T15:00:00+07:00'});
  const base=platts===snapshot.platts?snapshot:{...snapshot,platts:{...platts,capturedAt:now}};
  if(payload.source!=='chogia'||!payload.scheduledAt)return base;
  const scheduled=new Date(payload.scheduledAt);
  const slot=scheduled.toLocaleString('en-GB',{timeZone:'Asia/Ho_Chi_Minh',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
  if(!['06','09','12','15','18','21'].some(hour=>slot===hour+':00:00')||+scheduled>Date.parse(now))throw Error('Mốc snapshot Chợ Giá không hợp lệ');
  const history=[...(base.choGiaObservations??[])];
  const index=history.findIndex(item=>Date.parse(item.scheduledAt)===+scheduled);
  const old=history[index]??{scheduledAt:payload.scheduledAt};
  const record={...old};
  if(payload.platts&&!old.platts){
    const {capturedAt,date,previousDate,sourceUrl,sessions}=payload.platts;
    const latest=sessions.find(row=>row.date===date);
    record.platts={capturedAt,date,previousDate,sourceUrl,values:snapshot.platts.items.map(({name})=>{
      const code=Object.keys(products).find(key=>products[key].includes(name));
      return latest?.prices[code]??null;
    })};
  }
  const f=payload.forecast;
  if(f&&!old.forecast){
    if(f.sourceUrl!==FORECAST_URL||!Array.isArray(f.deltas)||f.deltas.length!==4||
       !f.deltas.every(value=>value===null||Number.isSafeInteger(value)&&Math.abs(value)<=20000)||
       !Number.isFinite(Date.parse(f.capturedAt))||Date.parse(f.capturedAt)>Date.parse(now))throw Error('Dự báo Chợ Giá không hợp lệ');
    if(!/^\d{4}-\d{2}-\d{2}$/.test(f.period)||!/^\d{4}-\d{2}-\d{2}$/.test(f.basisDate)||
       (f.diesel10Delta!=null&&(!Number.isSafeInteger(f.diesel10Delta)||Math.abs(f.diesel10Delta)>20000)))
      throw Error('Phiên hoặc mức dự báo Chợ Giá không hợp lệ');
    record.forecast=f;
  }
  if(!record.platts&&!record.forecast||record.platts===old.platts&&record.forecast===old.forecast)return base;
  if(index<0)history.push(record);
  else history[index]=record;
  const updated=record.forecast&&record.forecast!==old.forecast
    ?updateSnapshot(base,{forecast:{value:record.forecast}},record.forecast.capturedAt).snapshot:base;
  return {...updated,choGiaObservations:history};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const path='dist/snapshot.json';
  const old=JSON.parse(await readFile(path,'utf8'));
  const next=applyObservations(old,JSON.parse(process.env.PLATTS_PAYLOAD),new Date().toISOString(),{zaloReceivedAt:process.env.DISPATCH_CREATED_AT});
  if(next!==old){
    await writeFile(path+'.tmp',JSON.stringify(next,null,2)+'\n');
    await rename(path+'.tmp',path);
  }
}
