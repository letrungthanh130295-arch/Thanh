import {historyRows,score,bestSources,visiblePlatts,pumpValues,cycleContext,plattsChanges,defaultTroo,threshold} from './model.js';
const $=id=>document.getElementById(id);
const num=(v,d=0)=>Number.isFinite(v)?new Intl.NumberFormat('vi-VN',{minimumFractionDigits:d,maximumFractionDigits:d}).format(v):'—';
const sign=(v,d=0)=>Number.isFinite(v)?(v<0?'−':v>0?'+':'')+num(Math.abs(v),d):'—';
const date=v=>v&&Number.isFinite(Date.parse(v))?new Date(v).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'}):'—';
const day=v=>v?v.split('-').reverse().join('/'):'—';
const tone=v=>v<0?'down':v>0?'up':'';
const el=(tag,text,cls)=>{const n=document.createElement(tag);n.textContent=text;if(cls)n.className=cls;return n;};
function row(id,values){const tr=document.createElement('tr');values.forEach((v,i)=>tr.append(el(i?'td':'th',v)));$(id).append(tr);return tr;}
function validate(s){if(s.schemaVersion!==2||s.platts?.items?.length!==12||s.forecast?.sources?.length!==5||s.history?.length!==10)throw Error('Snapshot không đúng cấu trúc');return s;}
function render(s){
 validate(s);['pump-prices','platts-rows','threshold-estimates','forecast-rows','history-rows','source-errors'].forEach(id=>$(id).replaceChildren());
 $('snapshot').textContent='SNAPSHOT · cập nhật lúc '+date(s.capturedAt)+' · UTC+7';
 $('pump-time').textContent='Hiệu lực '+date(s.pump.effectiveAt);
 const pump=pumpValues(s);['E5 RON 92-II','E10 RON 95-III','DO 0,05S-II','DO 0,001S-V · 10ppm'].forEach((name,i)=>{const box=el('div','');box.append(el('span',name),el('strong',num(pump[i])));$('pump-prices').append(box);});
 const cycle=cycleContext(s),c=cycle.current,prev=cycle.previous;
 const range=w=>w.dates.length?day(w.dates[0])+'–'+day(w.dates.at(-1)):'—';
 $('cycle-context').textContent='Kỳ này '+range(c)+' · '+c.count+'/'+c.expected+' phiên';
 $('average-period').textContent='BQ trước '+range(prev)+' · BQ kỳ này '+range(c);
 $('platts-time').textContent='Chốt '+day(s.platts.date)+' · lấy số '+date(s.platts.capturedAt)+' · nguồn cập nhật '+date(s.platts.pageUpdatedAt);
 const changes=plattsChanges(s),alerts=[];
 visiblePlatts.forEach((name,i)=>{const x=s.platts.items.find(x=>x.name===name),change=changes[i];const label=name==='DO 10ppm'?'DO 0,001S · 10ppm':name;const tr=row('platts-rows',[label,num(x?.value===0?null:x?.value,2),num(change.previous,3),num(change.current,3),Number.isFinite(change.percent)?sign(change.percent,2)+'%':'—']);tr.lastElementChild.className=tone(change.percent);const box=el('div','');box.append(el('span',label),el('strong',Number.isFinite(change.percent)?sign(change.percent,2)+'%':'—',tone(change.percent)));$('threshold-estimates').append(box);if(['increase','decrease'].includes(threshold(change.percent)))alerts.push(label+' '+sign(change.percent,2)+'%');});
 $('threshold-status').dataset.trigger=String(!!alerts.length);
 $('threshold-status').textContent=alerts.length?'Cảnh báo Platts · '+alerts.join(' · '):'Platts chưa tới ngưỡng cảnh báo sớm';
 $('threshold-note').textContent=c.missingDates.length?'Còn thiếu phiên '+c.missingDates.map(day).join(', '):'Giảm từ 9% / tăng từ 14% · chỉ báo sớm';
 $('wti-price').textContent=num(s.wti.price,2);const wtiChange=Number.isFinite(s.wti.previous?.price)?s.wti.price-s.wti.previous.price:null;$('wti-change').textContent=sign(wtiChange,2)+' USD so lần trước';$('wti-change').className=tone(wtiChange);$('wti-time').textContent='Lấy số '+date(s.wti.capturedAt);$('wti-market-time').textContent='Giao dịch '+date(s.wti.marketTime);
 $('forecast-title').textContent='Dự kiến kỳ '+day(s.forecast.period);
 $('forecast-time').textContent='Chợ Giá · thành phẩm '+day(s.forecast.basisDate)+' · lấy số '+date(s.forecast.capturedAt);
 const outdated=s.forecast.basisDate<s.forecast.baseEffectiveAt?.slice(0,10);
 $('forecast-basis').textContent=outdated?'Chợ Giá đang dùng dữ liệu trước kỳ điều chỉnh gần nhất.':'';$('forecast-basis').hidden=!outdated;
 const forecastPump=s.pump.previous&&s.pump.effectiveAt.slice(0,10)>=s.forecast.period?s.pump.previous:s.pump;
 const forecastBase=pumpValues({...s,pump:forecastPump});
 const auto=defaultTroo({...s,pump:forecastPump});
 const forecasts=s.forecast.sources.map(stored=>stored.name==='T-Roo'?(stored.deltas.slice(0,3).every(Number.isFinite)?stored:auto):stored).filter(x=>x&&x.deltas.slice(0,3).some(Number.isFinite));
 const head=$('forecast-table').tHead;head.replaceChildren();const header=document.createElement('tr');['Mặt hàng',...forecasts.map(x=>x.name),'Giá thật'].forEach(name=>header.append(el('th',name)));head.append(header);
 ['E5','E10 RON 95-III','DO 0,05S'].forEach((name,i)=>{const tr=row('forecast-rows',[name,...forecasts.map(x=>{const v=x.deltas[i];return Number.isFinite(v)?sign(v)+' → '+num(x.prices?.[i]??(forecastBase[i]+v)):'—';}),num(s.forecast.actual?.[i])]);forecasts.forEach((x,j)=>tr.children[j+1].className=tone(x.deltas[i]));});
 $('troo-window').textContent='T-Roo · '+range(c)+' · '+c.count+'/'+c.expected+' phiên · FX 26.040 · thuế hiện hành';
 $('pending-forecast').textContent=s.pendingForecast?'Đã có bản tin kỳ '+day(s.pendingForecast.period)+', chờ xác nhận chuyển kỳ.':'';
 for(const x of historyRows(s.history)){const pred=x.predictions['T-Roo'];row('history-rows',[day(x.period)+(x.isSample?' · mẫu':''),x.actual?x.actual.map(v=>num(v)).join(' / '):'—',pred?pred.map(v=>num(v)).join(' / '):'—',num(score(x.actual,pred),1),bestSources(x).join(', ')||'—']);}
 for(const [key,title] of [['platts','Platts'],['forecast','Chợ Giá'],['wti','WTI']]){const source=s.sources?.[key];if(source?.status==='error')$('source-errors').append(el('p',title+': '+source.error+' · giữ số cũ','warning'));}
 $('sample-banner').hidden=!(s.platts.isSample||s.wti.isSample||s.forecast.sources.some(x=>x.isSample));$('sample-banner').textContent='Có dữ liệu mẫu';
}
async function load(){const b=$('reload');b.disabled=true;try{const r=await fetch('./snapshot.json',{cache:'no-store'});if(!r.ok)throw Error('HTTP '+r.status);const s=validate(await r.json());render(s);document.dispatchEvent(new CustomEvent('snapshot-loaded',{detail:s}));$('status').textContent='';}catch(e){$('status').textContent='Chưa tải được snapshot · '+e.message;}finally{b.disabled=false;}}
$('reload').addEventListener('click',load);load();
