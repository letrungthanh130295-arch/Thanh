import {manualProducts, forecastProducts, storageKey, saveEntry, withManualPlatts, manualForecastDeltas} from './manual-prices.js?v=2';
import {advanceCycle,historyRows,score,bestSources,visiblePlatts,pumpValues,cycleContext,plattsChanges,defaultTroo,threshold} from './model.js?v=manual-20261111';
import {renderMarket} from './market-charts.js?v=2';
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
 const range=w=>w.from&&w.to?day(w.from)+'–'+day(w.to):'—';
 $('cycle-context').textContent='Kỳ mới '+range(c)+' · '+c.count+'/'+c.expected+' phiên';
 $('average-period').textContent='BQ kỳ trước '+range(prev)+' · BQ kỳ mới '+range(c)+(c.count?' · Đã có số liệu đến '+day(c.dates.at(-1)):' · Chưa có phiên kỳ mới');
 $('platts-time').textContent='Chốt '+day(s.platts.date)+' · lấy số '+date(s.platts.capturedAt)+' · nguồn cập nhật '+date(s.platts.pageUpdatedAt)+(s.platts.manualUpdatedAt?' · Người dùng '+date(s.platts.manualUpdatedAt):'');
 const changes=plattsChanges(s),alerts=[];
 visiblePlatts.forEach((name,i)=>{const x=s.platts.items.find(x=>x.name===name),change=changes[i];const label=name==='DO 10ppm'?'DO 0,001S · 10ppm':name;const tr=row('platts-rows',[label,num(x?.value===0?null:x?.value,2),num(change.previous,3),num(change.current,3),Number.isFinite(change.percent)?sign(change.percent,2)+'%':'—']);tr.lastElementChild.className=tone(change.percent);const box=el('div','');box.append(el('span',label),el('strong',Number.isFinite(change.percent)?sign(change.percent,2)+'%':'—',tone(change.percent)));$('threshold-estimates').append(box);if(['increase','decrease'].includes(threshold(change.percent)))alerts.push(label+' '+sign(change.percent,2)+'%');});
 $('threshold-status').dataset.trigger=String(!!alerts.length);
 $('threshold-status').textContent=!c.count?'Chưa có phiên Platts kỳ mới để tính biến động':alerts.length?'Cảnh báo Platts · '+alerts.join(' · '):'Platts chưa tới ngưỡng cảnh báo sớm';
 $('threshold-note').textContent=c.missingDates.length?'Chưa có phiên '+c.missingDates.map(day).join(', '):'Giảm từ 9% / tăng từ 14% · chỉ báo sớm';
 $('forecast-title').textContent='Dự kiến kỳ '+day(s.forecast.period);
 $('forecast-time').textContent='Chợ Giá · thành phẩm '+day(s.forecast.basisDate);
 const outdated=!!s.forecast.basisDate&&s.forecast.basisDate<c.from;
 $('forecast-basis').textContent=outdated?'Chợ Giá đang dùng thành phẩm '+day(s.forecast.basisDate)+', trước kỳ theo dõi mới '+range(c)+'. Chưa dùng để xác nhận dự báo kỳ mới.':'';$('forecast-basis').hidden=!outdated;
 const forecastPump=s.pump.previous&&s.pump.effectiveAt.slice(0,10)>=s.forecast.period?s.pump.previous:s.pump;
 const auto=defaultTroo({...s,pump:forecastPump});
 const cho=s.forecast.sources.find(x=>x.name==='Chợ Giá');
 const entered=entries['forecast:'+s.forecast.period];
 const legacy=s.forecast.sources.find(x=>x.name==='User cung cấp');
 const choDeltas=cho?.period&&cho.period!==s.forecast.period?[]:cho?.deltas;
 const userDeltas=entered?manualForecastDeltas(entered,s.forecast.base):legacy?.deltas;
 $('cho-time').textContent=date(cho?.capturedAt);
 $('troo-time').textContent=auto?date(lastCalculation):'—';
 $('user-time').textContent=date(entered?.updatedAt??legacy?.capturedAt);
 for(const i of [1,0,2]){
   const changes=[choDeltas?.[i],auto?.deltas[i],userDeltas?.[i]];
   const tr=row('forecast-rows',[forecastProducts[i],...changes.map(v=>Number.isFinite(v)?sign(v)+' đ/lít':'—')]);
   changes.forEach((value,index)=>{tr.cells[index+1].className=tone(value);});
 }
 $('troo-window').textContent='T-Roo · '+range(c)+' · '+c.count+'/'+c.expected+' phiên'+(!auto?' · Chưa đủ dữ liệu kỳ mới':' · FX 26.040 · thuế hiện hành');
 $('pending-forecast').textContent=s.pendingForecast?'Đã có bản tin kỳ '+day(s.pendingForecast.period)+', chờ xác nhận chuyển kỳ.':'';
 for(const x of historyRows(s.history)){const pred=x.predictions['T-Roo'];row('history-rows',[day(x.period)+(x.isSample?' · mẫu':''),x.actual?x.actual.map(v=>num(v)).join(' / '):'—',pred?pred.map(v=>num(v)).join(' / '):'—',num(score(x.actual,pred),1),bestSources(x).join(', ')||'—']);}
 for(const [key,title] of [['platts','Platts'],['forecast','Chợ Giá']]){const source=s.sources?.[key];if(source?.status==='error')$('source-errors').append(el('p',title+': '+source.error+' · giữ số cũ','warning'));}
 $('sample-banner').hidden=!(s.platts.isSample||s.forecast.sources.some(x=>x.isSample));$('sample-banner').textContent='Có dữ liệu mẫu';
}
let snapshot;
let entries = {};
let lastCalculation;
const form = $('price-form');
const dialog = $('price-dialog');
const {kind, day: entryDay} = form.elements;
const workflow = 'https://github.com/letrungthanh130295-arch/Thanh/actions/workflows/snapshot.yml';

function showSnapshot() {
  lastCalculation = new Date().toISOString();
  const data = withManualPlatts(advanceCycle(snapshot), entries);
  render(data);
 renderMarket(data);
  document.dispatchEvent(new CustomEvent('snapshot-loaded',{detail:data}));
}

function populateForm() {
  const isPlatts = kind.value === 'platts';
  const products = isPlatts ? manualProducts : forecastProducts;
  const entry = entries[kind.value + ':' + entryDay.value];
  const forecast = advanceCycle(snapshot).forecast;
  const values = isPlatts ? entry?.values : manualForecastDeltas(entry, entryDay.value === forecast.period ? forecast.base : null);
  $('entry-hint').textContent = !isPlatts && entry && !entry.format && entryDay.value !== forecast.period
    ? 'Kỳ cũ thiếu giá mốc. Giá tuyệt đối vẫn còn trong lịch sử chỉnh sửa.' : '';
  $('entry-date-label').textContent = isPlatts ? 'Ngày phiên' : 'Ngày điều hành dự kiến';
  $('entry-fields').replaceChildren(...products.map((name, i) => {
    const label = el('label', name + (isPlatts ? ' · USD/thùng' : ' · Tăng/giảm (đ/lít)'));
    const input = document.createElement('input');
    input.name = 'price-' + i;
    input.inputMode = isPlatts ? 'decimal' : 'text';
    input.value = values?.[i] ?? '';
    label.append(input);
    return label;
  }));
  $('entry-history').replaceChildren(...(entry?.revisions ?? []).slice().reverse().map(revision =>
    el('li', date(revision.updatedAt) + (!isPlatts && !revision.format ? ' · Giá tuyệt đối · ' : ' · ') +
      products.map((name,i)=>name+' '+(revision.format ? sign(revision.values[i]) : revision.values[i]??'—')).join(' · '))
  ));
  $('entry-error').textContent = '';
}

$('edit-prices').addEventListener('click', () => {
  if (!snapshot) return;
  kind.value = 'platts';
  entryDay.value = snapshot.platts.date;
  populateForm();
  dialog.showModal();
});
kind.addEventListener('change', () => {
  entryDay.value = kind.value === 'platts' ? snapshot.platts.date : advanceCycle(snapshot).forecast.period;
  populateForm();
});
entryDay.addEventListener('change', populateForm);
$('close-prices').addEventListener('click', () => dialog.close());
form.addEventListener('submit', event => {
  event.preventDefault();
  try {
    const current = JSON.parse(localStorage.getItem(storageKey) ?? '{}');
    const values = [...$('entry-fields').querySelectorAll('input')].map(input => input.value);
    const next = saveEntry(current, kind.value, entryDay.value, values, new Date().toISOString());
    if (next !== current) localStorage.setItem(storageKey, JSON.stringify(next));
    entries = next;
    populateForm();
    showSnapshot();
    dialog.close();
  } catch (error) {
    $('entry-error').textContent = error.message;
  }
});
window.addEventListener('storage', event => {
  if (event.key === storageKey && snapshot) {
    entries = JSON.parse(event.newValue ?? '{}');
    showSnapshot();
  }
});

async function load() {
  try {
    const response = await fetch('./snapshot.json',{cache:'no-store'});
    if (!response.ok) throw Error('HTTP ' + response.status);
    snapshot = validate(await response.json());
    showSnapshot();
  } catch (error) {
    $('status').textContent = 'Chưa tải được snapshot · ' + error.message;
  }
}
try {
  entries = JSON.parse(localStorage.getItem(storageKey) ?? '{}');
} catch {
  $('status').textContent = 'Không đọc được giá đã lưu trên trình duyệt.';
}
$('reload').addEventListener('click', () => {
  window.open(workflow, '_blank', 'noopener,noreferrer');
  $('status').textContent = 'Chọn Run workflow trên GitHub để lấy Chợ Giá, Brent và WTI. Quay lại sau khi GitHub Pages xuất bản.';
});
document.addEventListener('visibilitychange', () => { if (!document.hidden) load(); });
load();
