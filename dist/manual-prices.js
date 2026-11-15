import {dieselName, forecastProducts, plattsValue} from './model.js?v=diesel-forecast-1';

export const manualProducts = ['A92', 'A95', 'DO 10ppm', dieselName];
export {forecastProducts};
export const storageKey = 'trung-thanh.manual-prices.v1';

export function saveEntry(entries, kind, day, fields, at) {
  const instant = new Date(day + 'T00:00:00Z');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !Number.isFinite(+instant) ||
      instant.toISOString().slice(0, 10) !== day) throw Error('Ngày không hợp lệ.');
  const today = new Date(at).toLocaleDateString('en-CA', {timeZone: 'Asia/Ho_Chi_Minh'});
  if (kind === 'platts' && day > today) throw Error('Ngày phiên ở tương lai.');
  const fieldsExpected = kind === 'platts' ? manualProducts : forecastProducts;
  if (fields.length !== fieldsExpected.length) throw Error('Thiếu ô nhập.');
  const values = fields.map(field => {
    const value = String(field ?? '').trim().replace(',', '.');
    if (!value) return null;
    const pattern = kind === 'platts' ? /^\d+(\.\d{1,3})?$/ : /^[+−-]?\d+$/;
    const amount = Number(value.replace('−', '-'));
    if (!pattern.test(value) || Math.abs(amount) > 100000 || (kind === 'platts' && amount <= 0))
      throw Error(kind === 'platts' ? 'Nhập giá lớn hơn 0 hoặc để trống.' : 'Nhập mức tăng/giảm bằng số nguyên, hoặc để trống.');
    return amount;
  });
  const key = kind + ':' + day;
  const previous = entries[key];
  const format = kind === 'forecast' ? 'delta-vnd-per-litre' : undefined;
  if (previous?.inherit === true && (kind!=='platts'||previous.dieselGrades) && previous.format === format && JSON.stringify(previous?.values) === JSON.stringify(values)) return entries;
  const revision = {values, ...(kind==='platts' && {dieselGrades:true}), inherit:true, updatedAt: at, source: 'Người dùng', ...(format && {format})};
  return {...entries, [key]: {...revision, revisions: [...(previous?.revisions ?? []), revision]}};
}

export function withManualPlatts(snapshot, entries) {
  const platts = snapshot.platts;
  const items = [...platts.items];
  if (!items.some(item=>[dieselName,'DO 500ppm'].includes(item.name))) items.push({name:dieselName,unit:'USD/thùng'});
  const byDate = new Map((platts.sessions ?? []).map(row => [row.date, row]));
  for (const [day, field] of [[platts.date,'value'],[platts.previousDate,'previous']]) {
    if (day && !byDate.has(day)) byDate.set(day,{date:day,values:items.map(item=>item[field])});
  }
  const dates = new Set([...byDate.keys(),...Object.keys(entries).filter(key=>key.startsWith('platts:')).map(key=>key.slice(7))]);
  const prior = manualProducts.map(()=>null);
  const observations = new Map();
  for (const {platts: quote} of snapshot.choGiaObservations ?? []) {
    if (!quote?.date || !Number.isFinite(Date.parse(quote.capturedAt))) continue;
    quote.values?.forEach((price,index)=>{
      if (!Number.isFinite(price) || price<=0) return;
      const key=JSON.stringify([quote.date,index,price]);
      if (Date.parse(quote.capturedAt)<Date.parse(observations.get(key) ?? '9999-01-01')) observations.set(key,quote.capturedAt);
    });
  }
  for (const date of [...dates].sort()) {
    const row = byDate.get(date);
    const entry = entries['platts:'+date];
    const values = row ? [...row.values] : items.map(() => null);
    const inherited = {};
    const manual = [];
    if (entry) {
      const explicit = manualPlattsValues(entry);
      manualProducts.forEach((name, i) => {
        const entered = explicit[i];
        manual[i] = entered ?? (i<2 && entry.inherit && plattsValue(items,values,name)===null ? prior[i]?.value : null);
        if (entered == null && Number.isFinite(manual[i])) inherited[name]=prior[i].date;
        if (manual[i] == null) return;
        const index = items.findIndex(item=>item.name===name || (name===dieselName && item.name==='DO 500ppm'));
        const stored = plattsValue(items,values,name);
        const observedAt=observations.get(JSON.stringify([date,index,stored]));
        const capturedAt = row?.valueCapturedAt?.[index] ?? observedAt ?? row?.capturedAt;
        const firstEntry = (entry.revisions ?? []).find(revision=>Number.isFinite(manualPlattsValues(revision)[i])) ?? entry;
        if (stored!==null && (!capturedAt || Date.parse(capturedAt)<=Date.parse(firstEntry.updatedAt))) return;
        values[index]=manual[i];
      });
    }
    if (entry || row) {
      manualProducts.forEach((name,i)=>{
        const value=plattsValue(items,values,name);
        if(value!==null) prior[i]={value,date:inherited[name]??date};
      });
    }
    if (entry && (row || manual.some(Number.isFinite))) {
      byDate.set(date,{...row,date,values,
        inherited,manualUpdatedAt:entry.updatedAt});
    }
  }
  const sessions = [...byDate.values()].sort((a, b) => b.date.localeCompare(a.date));
  const [current, previous] = sessions;
  if (!current) return snapshot;
  return {...snapshot, platts: {...platts, sessions, date: current.date,
    previousDate: previous?.date ?? null, manualUpdatedAt: current.manualUpdatedAt,
    items: items.map((item, i) => ({...item, value: current.values[i], previous: previous?.values[i] ?? null}))}};
}

// Older entries allowed the 500ppm field to represent 50ppm. Require a confirmed grade.
export function manualPlattsValues(entry) {
  return entry ? entry.values.map((value,i)=>i===3&&!entry.dieselGrades?null:value) : [];
}

// Untagged browser records from v1 are projected retail prices.
export function manualForecastDeltas(entry, base) {
  return entry?.values.map((price, i) => {
    if (!Number.isFinite(price) || (i===2 && entry.values.length===3)) return null;
    if (entry.format === 'delta-vnd-per-litre') return price;
    return Number.isFinite(base?.[i]) ? price - base[i] : null;
  });
}


export function effectiveUserForecast(entries, day, baseFor) {
  const result = forecastProducts.map(()=>null);
  const days = Object.keys(entries).filter(key=>key.startsWith('forecast:')).map(key=>key.slice(9))
    .filter(date=>date<=day).sort().reverse();
  for (const date of days) {
    const entry=entries['forecast:'+date];
    manualForecastDeltas(entry,baseFor(date)).forEach((value,i)=>{
      if(result[i]===null && value!==null) result[i]={value,date,updatedAt:entry.updatedAt};
    });
  }
  return result;
}


// Historical scoring uses only revisions already saved when the price was announced.
export function userForecastAt(entries, day, cutoff, baseFor) {
  const revisions = Object.fromEntries(Object.entries(entries).flatMap(([key,entry]) => {
    if (!key.startsWith('forecast:')) return [];
    const eligible = [...(entry.revisions ?? []),entry]
      .filter(value => Date.parse(value.updatedAt) < cutoff)
      .sort((a,b) => Date.parse(b.updatedAt)-Date.parse(a.updatedAt));
    return eligible.length ? [[key,eligible[0]]] : [];
  }));
  return effectiveUserForecast(revisions,day,baseFor);
}
