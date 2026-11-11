import {dieselName, plattsValue} from './model.js?v=rules';

export const manualProducts = ['A92', 'A95', 'DO 10ppm', dieselName];
export const forecastProducts = ['E5', 'E10', 'DO'];
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
  if (previous?.inherit === true && previous.format === format && JSON.stringify(previous?.values) === JSON.stringify(values)) return entries;
  const revision = {values, inherit:true, updatedAt: at, source: 'Người dùng', ...(format && {format})};
  return {...entries, [key]: {...revision, revisions: [...(previous?.revisions ?? []), revision]}};
}

export function withManualPlatts(snapshot, entries) {
  const platts = snapshot.platts;
  const byDate = new Map((platts.sessions ?? []).map(row => [row.date, row]));
  for (const [day, field] of [[platts.date,'value'],[platts.previousDate,'previous']]) {
    if (day && !byDate.has(day)) byDate.set(day,{date:day,values:platts.items.map(item=>item[field])});
  }
  const dates = new Set([...byDate.keys(),...Object.keys(entries).filter(key=>key.startsWith('platts:')).map(key=>key.slice(7))]);
  const prior = manualProducts.map(()=>null);
  for (const date of [...dates].sort()) {
    const row = byDate.get(date);
    const entry = entries['platts:'+date];
    const values = row ? [...row.values] : platts.items.map(() => null);
    const inherited = {};
    const manual = [];
    if (entry) {
      manualProducts.forEach((name, i) => {
        manual[i] = entry.values[i] ?? (entry.inherit ? prior[i]?.value : null);
        if (entry.inherit && entry.values[i] == null && prior[i]) inherited[name]=prior[i].date;
        if (manual[i] == null && !entry.inherit) return;
        const index = platts.items.findIndex(item=>item.name===name);
        const alias = name===dieselName ? platts.items.findIndex(item=>item.name==='DO 50ppm') : -1;
        if (index>=0) values[index]=manual[i]??null;
        if (alias>=0) values[alias]=index>=0?null:manual[i]??null;
      });
    }
    if (entry || row) {
      manualProducts.forEach((name,i)=>{
        const value=plattsValue(platts.items,values,name);
        if(value!==null) prior[i]={value,date:inherited[name]??date,manual:entry?.values[i]!=null || !!(inherited[name] && prior[i]?.manual)};
      });
    }
    if (entry && (row || manual.some(Number.isFinite))) {
      byDate.set(date,{...row,date,values,manualDiesel:entry.values[2]??entry.values[3]??(inherited[manualProducts[2]] && prior[2]?.manual ? manual[2] : undefined),
        inherited,manualUpdatedAt:entry.updatedAt});
    }
  }
  const sessions = [...byDate.values()].sort((a, b) => b.date.localeCompare(a.date));
  const [current, previous] = sessions;
  if (!current) return snapshot;
  return {...snapshot, platts: {...platts, sessions, date: current.date,
    previousDate: previous?.date ?? null, manualUpdatedAt: current.manualUpdatedAt,
    items: platts.items.map((item, i) => ({...item, value: current.values[i], previous: previous?.values[i] ?? null}))}};
}

// Untagged browser records from v1 are projected retail prices.
export function manualForecastDeltas(entry, base) {
  return entry?.values.map((price, i) => {
    if (!Number.isFinite(price)) return null;
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
