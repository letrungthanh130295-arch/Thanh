import {manualProducts, forecastProducts, storageKey, saveEntry, withManualPlatts, manualForecastDeltas, effectiveUserForecast, userForecastAt} from './manual-prices.js?v=platts-alert';
import {advanceCycle,historyRows,score,bestSources,visiblePlatts,pumpValues,cycleContext,plattsChanges,defaultTroo,threshold, plattsValue} from './model.js?v=platts-average-20261114c';
import {marketRisk} from './petrolimex-monitor.js?v=platts-alert';
import {renderMarket} from './market-charts.js?v=rules';
const $=id=>document.getElementById(id);
const num=(v,d=0)=>Number.isFinite(v)?new Intl.NumberFormat('vi-VN',{minimumFractionDigits:d,maximumFractionDigits:d}).format(v):'—';
const sign=(v,d=0)=>Number.isFinite(v)?(v<0?'−':v>0?'+':'')+num(Math.abs(v),d):'—';
const date=v=>v&&Number.isFinite(Date.parse(v))?new Date(v).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'}):'—';
const day=v=>v?v.split('-').reverse().join('/'):'—';
const tone=v=>v<0?'down':v>0?'up':'';
const el=(tag,text,cls)=>{const n=document.createElement(tag);n.textContent=text;if(cls)n.className=cls;return n;};
function row(id,values){const tr=document.createElement('tr');values.forEach((v,i)=>tr.append(el(i?'td':'th',v)));$(id).append(tr);return tr;}
function validate(s){if(s.schemaVersion!==2||s.platts?.items?.length!==12||s.forecast?.sources?.length!==5||s.history?.length!==10)throw Error('Snapshot không đúng cấu trúc');return s;}
let petrolimexStatus;
function renderPetrolimex() {
 const status=petrolimexStatus;
 const label=$('petrolimex-status');
 const risk=snapshot?marketRisk(snapshot):null;
 const alerts=risk?.alerts??[];
 const available=risk?.signals.some(signal=>signal.name.startsWith('Platts ')&&Number.isFinite(signal.percent));
 label.dataset.trigger=String(alerts.length>0);
 label.textContent=(alerts.length?'Cảnh báo · '+alerts.map(signal=>signal.name).join(' · '):
   available?'Theo lịch cơ bản và khung điều hành thứ Năm':'Chưa đủ dữ liệu bình quân Platts')+
   (status?' · Kiểm tra gần nhất '+date(status.lastCheckedAt)+(status.error?' · '+status.error:''):' · Chưa có lượt kiểm tra Petrolimex');
 const signals=$('petrolimex-signals');
 signals.replaceChildren();
 for(const signal of risk?.signals??[]){
   const box=el('div','');
   box.append(el('span',signal.name.startsWith('Platts ')?signal.name:signal.name+' · tham khảo'),
     el('strong',Number.isFinite(signal.percent)?sign(signal.percent,2)+'%':'Chưa đủ dữ liệu',tone(signal.percent)),
     el('small','Mốc '+signal.reference+' · '+num(signal.referencePrice,2)+' USD/thùng'));
   signals.append(box);
 }
}
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
 const changes=plattsChanges(s,Date.now(),cycle),alerts=[];
 const latest=s.platts.sessions[0];
 visiblePlatts.forEach((name,i)=>{const price=plattsValue(s.platts.items,s.platts.items.map(item=>item.value),name),change=changes[i];const label=name==='DO 10ppm'?'DO 0,001S · 10ppm':name;const tr=row('platts-rows',[label,num(price,2),num(change.previous,3),num(change.current,3),Number.isFinite(change.percent)?sign(change.percent,2)+'%':'—']);tr.lastElementChild.className=tone(change.percent);const inherited=latest?.inherited?.[name];if(inherited)tr.cells[1].append(el('small','Kế thừa '+day(inherited),'inherit-note'));const box=el('div','');box.append(el('span',label),el('strong',Number.isFinite(change.percent)?sign(change.percent,2)+'%':'—',tone(change.percent)));$('threshold-estimates').append(box);if(['increase','decrease'].includes(threshold(change.percent)))alerts.push(label+' '+sign(change.percent,2)+'%');});
 $('threshold-status').dataset.trigger=String(!!alerts.length);
 $('threshold-status').textContent=!changes.some(change=>Number.isFinite(change.percent))?'Chưa đủ dữ liệu bình quân Platts':alerts.length?'Cảnh báo Platts · '+alerts.join(' · '):'Platts chưa tới ngưỡng cảnh báo sớm';
 $('threshold-note').textContent=c.missingDates.length?'Chưa có phiên '+c.missingDates.map(day).join(', '):'Giảm từ 10% / tăng từ 15% · chỉ báo sớm';
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
 const user=effectiveUserForecast(entries,s.forecast.period,day=>forecastBase(s,day));
 const userDeltas=user.map((value,i)=>value?.value??(entered?null:legacy?.deltas[i]));
 $('cho-time').textContent=date(cho?.capturedAt);
 $('troo-time').textContent=auto?date(lastCalculation):'—';
 $('user-time').textContent=date(entered?.updatedAt??user.map(value=>value?.updatedAt).filter(Boolean).sort().at(-1)??legacy?.capturedAt);
 for(const i of [1,0,2]){
   const changes=[choDeltas?.[i],auto?.deltas[i],userDeltas?.[i]];
   const tr=row('forecast-rows',[forecastProducts[i],...changes.map(v=>Number.isFinite(v)?sign(v)+' đ/lít':'—')]);
   changes.forEach((value,index)=>{tr.cells[index+1].className=tone(value);});
   if(user[i] && user[i].date!==s.forecast.period) tr.cells[3].append(el('small','Kế thừa '+day(user[i].date),'inherit-note'));
 }
 $('troo-window').textContent='T-Roo · '+range(c)+' · '+c.count+'/'+c.expected+' phiên'+(!auto?' · Chưa đủ dữ liệu kỳ mới':' · FX 26.040 · thuế hiện hành');
 $('pending-forecast').textContent=s.pendingForecast?'Đã có bản tin kỳ '+day(s.pendingForecast.period)+', chờ xác nhận chuyển kỳ.':'';
 for(const x of historyRows(s.history)){
   const predictions={...x.predictions};
   const isCurrent=x.effectiveAt===s.official.effectiveAt;
   const cutoff=Date.parse(x.publishedAt??(isCurrent?s.official.publishedAt:null));
   const base=x.base??(isCurrent&&s.pump.previous?pumpValues({...s,pump:s.pump.previous}):null);
   const period=x.forecastPeriod??x.period;
   if(base?.slice(0,3).every(Number.isFinite)&&Number.isFinite(cutoff)){
     const local=userForecastAt(entries,period,cutoff,day=>day===period?base:forecastBase(s,day));
     if(local.every(item=>Number.isFinite(item?.value))){
       predictions['User cung cấp']=local.map((item,i)=>base[i]+item.value);
     }
   }
   const visible={'Chợ Giá':predictions['Chợ Giá'],'T-Roo':predictions['T-Roo'],'Người dùng':predictions['User cung cấp']};
   row('history-rows',[day(x.period)+(x.isSample?' · mẫu':''),x.actual?x.actual.map(v=>num(v)).join(' / '):'—',
     ...Object.values(visible).map(pred=>num(score(x.actual,pred),1)),bestSources({...x,predictions:visible}).join(', ')||'—']);
 }
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

function forecastBase(data, day) {
  return day===data.forecast.period ? data.forecast.base : data.history.find(row=>row.period===day)?.base;
}

function populateForm() {
  const isPlatts = kind.value === 'platts';
  const products = isPlatts ? manualProducts : forecastProducts;
  const entry = entries[kind.value + ':' + entryDay.value];
  const data = advanceCycle(snapshot);
  const selected = entryDay.value;
  const values = isPlatts ? entry?.values : manualForecastDeltas(entry,forecastBase(data,selected));
  const past = Object.fromEntries(Object.entries(entries).filter(([key])=>key.slice(key.indexOf(':')+1)<selected));
  const inherited = isPlatts
    ? withManualPlatts(data,past).platts.sessions.filter(row=>row.date<selected)
    : effectiveUserForecast(past,selected,day=>forecastBase(data,day));
  $('entry-hint').textContent = !isPlatts && entry && !entry.format && !forecastBase(data,selected)
    ? 'Kỳ cũ thiếu giá mốc. Giá tuyệt đối vẫn còn trong lịch sử chỉnh sửa.'
    : 'Ô trống lấy số gần nhất trước ngày đã chọn.';
  $('entry-date-label').textContent = isPlatts ? 'Ngày phiên' : 'Ngày điều hành dự kiến';
  $('entry-fields').replaceChildren(...products.map((name, i) => {
    const label = el('label', name + (isPlatts ? ' · USD/thùng' : ' · Tăng/giảm (đ/lít)'));
    const input = document.createElement('input');
    input.name = 'price-' + i;
    input.inputMode = isPlatts ? 'decimal' : 'text';
    input.value = values?.[i] ?? '';
    const priorRow = isPlatts ? inherited.find(row=>plattsValue(data.platts.items,row.values,name)!==null) : null;
    const prior = isPlatts ? priorRow && {date:priorRow.inherited?.[name]??priorRow.date,
      value:plattsValue(data.platts.items,priorRow.values,name)} : inherited[i];
    input.placeholder = prior ? (isPlatts ? num(prior.value,2) : sign(prior.value)) : 'Chưa có số';
    label.append(input);
    if(prior) label.append(el('small','Kế thừa nếu để trống · '+day(prior.date),'inherit-note'));
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
    if (kind.value==='forecast' && current['forecast:'+entryDay.value] && !current['forecast:'+entryDay.value].format &&
      !forecastBase(advanceCycle(snapshot),entryDay.value) && values.every(value=>!value.trim()))
      throw Error('Nhập mức tăng/giảm để sửa bản ghi cũ thiếu giá mốc.');
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
  try {
    const monitor = await fetch('./petrolimex-status.json',{cache:'no-store'});
    if (monitor.ok) petrolimexStatus = await monitor.json();
  } catch {
    // Keep the last displayed check when the connection drops.
  }
  renderPetrolimex();
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
