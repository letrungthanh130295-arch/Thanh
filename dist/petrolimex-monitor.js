import {cycleContext, plattsChanges, threshold} from './model.js';

const hour = 3600000;
const localDay = time => new Date(time + 7 * hour).toISOString().slice(0, 10);
const tradingDay = time => new Intl.DateTimeFormat('en-CA', {timeZone:'America/New_York'}).format(time);

function crudeSignal(quote, name, effectiveAt, now) {
  const observedAt = Date.parse(quote?.marketTime);
  if (!Number.isFinite(observedAt) || now < observedAt || now - observedAt > 96 * hour) return null;
  if (!Number.isFinite(quote.price) || quote.price <= 0 || !Number.isFinite(effectiveAt)) return null;
  // A close on the adjustment date may occur after the retail price took effect.
  if (observedAt <= effectiveAt) return null;
  const day = tradingDay(effectiveAt);
  const reference = [...(quote.sessions ?? [])].filter(row => row.date < day && row.price > 0)
    .sort((a,b) => b.date.localeCompare(a.date))[0];
  if (!reference) return null;
  return {name, percent:(quote.price-reference.price)/reference.price*100, reference:reference.date,
    referencePrice:reference.price, observedAt:quote.marketTime};
}

export function marketRisk(snapshot, now = Date.now()) {
  const effectiveAt = Math.max(...[snapshot.pump?.effectiveAt, snapshot.official?.effectiveAt]
    .map(Date.parse).filter(at => at <= now));
  const cycle = cycleContext(snapshot, now);
  const platts = snapshot.platts.date >= localDay(now - 96 * hour)
    ? plattsChanges(snapshot, now).filter(row => Number.isFinite(row.percent)).map(row => ({
      name:'Platts '+row.name, percent:row.percent, reference:cycle.previous.from+' – '+cycle.previous.to,
      referencePrice:row.previous, observedAt:snapshot.platts.capturedAt
    })) : [];
  const signals = [crudeSignal(snapshot.brent,'Brent',effectiveAt,now),
    crudeSignal(snapshot.wti,'WTI',effectiveAt,now), ...platts].filter(Boolean);
  return {signals, trigger:signals.find(signal => ['increase','decrease'].includes(threshold(signal.percent))) ?? null};
}

export function isThursdayWindow(slot) {
  const time = new Date(slot + 7 * hour);
  const minute = time.getUTCHours() * 60 + time.getUTCMinutes();
  return time.getUTCDay() === 4 && minute >= 14*60+30 && minute <= 16*60+30;
}

export function monitorDue(slot, active) {
  const time = new Date(slot + 7 * hour);
  const minute = time.getUTCMinutes();
  if (isThursdayWindow(slot)) return minute % 10 === 0;
  return active ? minute % 15 === 0 : minute === 0 && time.getUTCHours() % 3 === 0;
}
