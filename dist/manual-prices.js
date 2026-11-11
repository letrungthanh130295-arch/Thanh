export const manualProducts = ['A92', 'A95', 'DO 10ppm', 'DO 50ppm'];
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
    const pattern = kind === 'platts' ? /^\d+(\.\d{1,3})?$/ : /^\d+$/;
    if (!pattern.test(value) || Number(value) <= 0 || Number(value) > 100000)
      throw Error('Nhập giá lớn hơn 0 hoặc để trống.');
    return Number(value);
  });
  const key = kind + ':' + day;
  const previous = entries[key];
  if (JSON.stringify(previous?.values) === JSON.stringify(values)) return entries;
  if (!previous && values.every(value => value === null)) throw Error('Nhập ít nhất một giá.');
  const revision = {values, updatedAt: at, source: 'Người dùng'};
  return {...entries, [key]: {...revision, revisions: [...(previous?.revisions ?? []), revision]}};
}

export function withManualPlatts(snapshot, entries) {
  const platts = snapshot.platts;
  const byDate = new Map((platts.sessions ?? []).map(row => [row.date, row]));
  for (const [key, entry] of Object.entries(entries)) {
    if (!key.startsWith('platts:') || !entry.values.some(Number.isFinite)) continue;
    const date = key.slice(7);
    const row = byDate.get(date);
    const values = row ? [...row.values] : platts.items.map(() => null);
    manualProducts.forEach((name, i) => {
      if (Number.isFinite(entry.values[i])) values[platts.items.findIndex(x => x.name === name)] = entry.values[i];
    });
    byDate.set(date, {...row, date, values, manualDiesel: entry.values[2] ?? entry.values[3],
      manualUpdatedAt: entry.updatedAt});
  }
  const sessions = [...byDate.values()].sort((a, b) => b.date.localeCompare(a.date));
  const [current, previous] = sessions;
  if (!current) return snapshot;
  return {...snapshot, platts: {...platts, sessions, date: current.date,
    previousDate: previous?.date ?? null, manualUpdatedAt: current.manualUpdatedAt,
    items: platts.items.map((item, i) => ({...item, value: current.values[i], previous: previous?.values[i] ?? null}))}};
}
