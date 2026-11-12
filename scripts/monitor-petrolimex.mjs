import {spawnSync} from 'node:child_process';
import {mkdir,readFile,writeFile,rename} from 'node:fs/promises';
import {dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {load} from 'cheerio';
import {applyManual} from './admin.mjs';
import {defaultTroo,differences,nextThursday,pumpNames,pumpValues,score} from '../dist/model.js';
import {marketRisk,monitorDue} from '../dist/petrolimex-monitor.js';

const index = 'https://www.petrolimex.com.vn/ndi/thong-cao-bao-chi.html';
const normalize = value => value.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replaceAll('đ','d').replace(/\s+/g,' ').trim();
const time = (d,m,y,h,min) => {
  const iso = `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}T${h.padStart(2,'0')}:${min}:00+07:00`;
  const at = Date.parse(iso);
  if (!Number.isFinite(at) || new Date(at+25200000).toISOString().slice(0,16) !== iso.slice(0,16)) throw Error('Ngày giờ Petrolimex không hợp lệ');
  return iso;
};
const noticeLink = /\/ndi\/thong-cao-bao-chi\/petrolimex-dieu-chinh-gia-xang-dau-tu-(\d{1,2})-gio-(\d{2})-phut-ngay-(\d{1,2})-(\d{1,2})-(\d{4})\.html$/;
function officialUrl(url, host) {
  const parsed = new URL(url,index);
  if (parsed.protocol !== 'https:' || parsed.host !== host || parsed.username || parsed.password) throw Error('URL Petrolimex không hợp lệ');
  return parsed;
}

export function candidates(html, previousAt, now) {
  const $ = load(html);
  return [...new Map($('a[href]').toArray().flatMap(el => {
    if (!normalize($(el).text()).includes('dieu chinh gia')) return [];
    let url;
    try {url = officialUrl($(el).attr('href'),'www.petrolimex.com.vn');} catch {return [];}
    const parts = url.pathname.match(noticeLink);
    if (!parts) return [];
    const [,h,min,d,m,y] = parts;
    const at = Date.parse(time(d,m,y,h,min));
    return at > previousAt && at <= now ? [[url.href,{url:url.href,at}]] : [];
  })).values()].sort((a,b) => a.at-b.at);
}

export function parseNotice(html, candidate, now) {
  const $ = load(html);
  const heading = normalize($('.blogDetail__title').text());
  const body = $('.entry-detail');
  const explicit = normalize(body.text()).match(/muc gia moi co hieu luc tu thoi diem (\d{1,2}) gio (\d{2}) phut ngay (\d{1,2}) thang (\d{1,2}) nam (\d{4})/);
  const title = heading.match(/^petrolimex dieu chinh gia xang dau tu (\d{1,2}) gio (\d{2}) phut ngay (\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})$/);
  const publication = normalize($('.blogDetail__meta .f-date').text()).match(/^(\d{1,2}):(\d{2}) (sa|ch) @ .+? - (\d{1,2}) thang (\d{1,2}), (\d{4})$/);
  if (!title || !explicit || !publication || normalize($('.blogDetail__meta .f-author').text()) !== 'petrolimex') throw Error('Thiếu xác nhận tiêu đề, hiệu lực hoặc giờ công bố Petrolimex');
  const toTime = ([,h,min,d,m,y]) => time(d,m,y,h,min);
  const effectiveAt = toTime(explicit);
  const [,h,min,meridiem,d,m,y] = publication;
  if (+h < 1 || +h > 12) throw Error('Giờ công bố Petrolimex không hợp lệ');
  const publishedAt = time(d,m,y,String(+h%12+(meridiem==='ch'?12:0)),min);
  if (toTime(title) !== effectiveAt || Date.parse(effectiveAt) !== candidate.at || Date.parse(publishedAt) > now) throw Error('Mốc giờ thông cáo Petrolimex không khớp');
  const image = body.find('img').first().attr('src');
  if (!image) throw Error('Thiếu bảng giá Petrolimex');
  const tableUrl = officialUrl(image,'files.petrolimex.com.vn').href;
  return {effectiveAt,publishedAt,sourceUrl:candidate.url,tableUrl};
}

const products = [
  [/^xang e10 ron 95 m[a-z]{1,4} 5$/, 'E10 RON 95-V'], [/^xang e10 ron 95 m[a-z]{1,4} 3$/,pumpNames[1]],
  [/^xang e5 ron 92 m[a-z]{1,4} 2$/,pumpNames[0]], [/^diezen 0[,.]001s m[a-z]{1,4} 5$/,pumpNames[3]],
  [/^diezen 0[,.]05s m[a-z]{1,4} 2$/,pumpNames[2]], [/^dau h[oe]a 2\s*-\s*k$/, 'Dầu hỏa 2-K'],
  [/mazut 3[,.]5s/, 'FO 3,5S'], [/mazut 180 0[,.]5s/, 'FO 180S-0,5S']
];
export function verifyPrices({headers,rows}) {
  if (headers.map(normalize).join('|') !== 'vung 1|vung 2') throw Error('Bảng giá Petrolimex thiếu hai cột vùng');
  const prices = new Map();
  for (const [label,unit,region1,region2] of rows) {
    const product = products.find(([pattern]) => pattern.test(normalize(label)));
    if (!product) continue;
    const name = product[1];
    const expectedUnit = name.startsWith('FO') ? /^d[oe]ng\s*\/\s*kg$/ : /^d[oe]ng\s*\/\s*lit$/;
    if (prices.has(name) || !expectedUnit.test(normalize(unit)) ||
        ![region1,region2].every(v => Number.isSafeInteger(v) && v >= 1000 && v < 100000) ||
        region2 < region1 || region2 > region1*1.02+10) throw Error('Bảng giá Petrolimex sai đơn vị, dòng trùng hoặc cột vùng');
    prices.set(name,region1);
  }
  if (![...pumpNames,'FO 3,5S'].every(name => prices.has(name))) throw Error('Bảng giá Petrolimex thiếu mặt hàng bắt buộc');
  return prices;
}

const before = (at,cutoff) => Date.parse(at) < cutoff;
function lockForecast(snapshot, notice, oldForecast) {
  const cutoff = Date.parse(notice.publishedAt);
  const date = notice.effectiveAt.slice(0,10);
  const forecast = snapshot.forecast;
  const observations = (snapshot.choGiaObservations ?? []).map(row => row.forecast)
    .filter(row => row?.period === forecast.period && row.basisDate >= forecast.marketCycleStart &&
      row.basisDate < date && before(row.capturedAt,cutoff) && row.deltas?.slice(0,3).every(Number.isFinite))
    .sort((a,b) => Date.parse(b.capturedAt)-Date.parse(a.capturedAt));
  const row = observations[0];
  const locked = forecast.lockedPredictions ??= {};
  const existing = locked['Chợ Giá'];
  if (row && (!existing || Date.parse(existing.capturedAt) < Date.parse(row.capturedAt))) {
    locked['Chợ Giá'] = {prices:row.deltas.slice(0,3).map((v,i) => forecast.base[i]+v),capturedAt:row.capturedAt};
  }

  if (oldForecast?.period === forecast.period && before(oldForecast.capturedAt,cutoff) &&
      oldForecast.prices.every(Number.isFinite)) locked['T-Roo'] = oldForecast;
  if (!locked['T-Roo']) {
    const source = structuredClone(snapshot);
    source.platts.sessions = source.platts.sessions.filter(session => session.date < date &&
      (session.date < forecast.marketCycleStart || before(session.capturedAt,cutoff)));
    const troo = defaultTroo(source,cutoff-1);
    const capturedAt = source.platts.sessions.filter(session => troo?.currentDates.includes(session.date))
      .map(session => session.capturedAt).sort((a,b) => Date.parse(b)-Date.parse(a))[0];
    if (capturedAt && troo?.prices.every(Number.isFinite)) locked['T-Roo'] = {prices:troo.prices,capturedAt};
  }
}

export function applyNotice(old, notice, prices, now, oldForecast) {
  const previousAt = Math.max(Date.parse(old.pump.effectiveAt),Date.parse(old.official.effectiveAt));
  if (Date.parse(notice.effectiveAt) <= previousAt) return old;
  const snapshot = structuredClone(old);
  const day = notice.effectiveAt.slice(0,10);
  lockForecast(snapshot,notice,oldForecast);
  // An unscheduled adjustment ends the live forecast without relabeling its inputs.
  const applicable = snapshot.forecast.period === day;
  if (!applicable) {
    snapshot.interruptedForecasts ??= [];
    snapshot.interruptedForecasts.push({...snapshot.forecast,endedAt:notice.effectiveAt,sourceUrl:notice.sourceUrl});
  }
  const previous = {...old.pump};
  delete previous.previous;
  // Only promote a pending forecast whose inputs are from the new price cycle.
  const pending = snapshot.pendingForecast;
  if (pending?.basisDate < day) delete snapshot.pendingForecast;
  const s = applyManual(snapshot,{...notice,type:'official',
    prices:[...pumpNames.slice(0,3),'FO 3,5S'].map(name => prices.get(name)),
    nextPeriod:nextThursday(day),
    pump:{items:[...prices],source:'Petrolimex · Vùng 1',sourceUrl:notice.sourceUrl,
      tableUrl:notice.tableUrl,region:1,previous,capturedAt:now}
  },now);
  Object.assign(s.official,{source:'Petrolimex · Vùng 1',region:1,tableUrl:notice.tableUrl,
    changes:[...pumpValues(old).slice(0,3),old.pump.items.find(([name])=>name==='FO 3,5S')?.[1]]
      .map((value,i) => Number.isFinite(value)?s.official.prices[i]-value:null)});
  s.forecast.base = pumpValues(s);
  if (pending?.basisDate < day) s.pendingForecast = pending;
  const record = s.history.find(row => row.period === day);
  record.forecastPeriod = snapshot.forecast.period;
  record.base = snapshot.forecast.base;
  record.publishedAt = notice.publishedAt;
  const replaced = old.history.filter(row =>
    !s.history.some(current => current.period === row.period && current.effectiveAt === row.effectiveAt));
  if (replaced.length) s.historyArchive = [...(old.historyArchive ?? []), ...replaced];
  const cutoff = Date.parse(notice.publishedAt);
  const forecasts = snapshot.forecast;
  record.predictions = Object.fromEntries(Object.entries(forecasts.lockedPredictions)
    .filter(([,value]) => before(value.capturedAt,cutoff) && value.prices?.every(Number.isFinite))
    .map(([name,value]) => [name,value.prices]));
  for (const row of forecasts.sources) {
    if (row.baselineConfirmed && !row.isSample && before(row.capturedAt,cutoff) &&
        row.deltas?.slice(0,3).every(Number.isFinite)) {
      const locked = forecasts.lockedPredictions[row.name];
      if (!locked || !before(row.capturedAt,Date.parse(locked.capturedAt))) {
        record.predictions[row.name] = row.deltas.slice(0,3).map((v,i) => forecasts.base[i]+v);
      }
    }
  }
  record.accuracy = Object.fromEntries(['Chợ Giá','T-Roo','User cung cấp'].map(name => [name,{
    errors:differences(record.actual,record.predictions[name]), mae:score(record.actual,record.predictions[name])
  }]));
  return s;
}

async function readUrl(url) {
  const response = await fetch(url,{redirect:'error',signal:AbortSignal.timeout(25000)});
  if (!response.ok) throw Error('Petrolimex HTTP '+response.status);
  const body = Buffer.from(await response.arrayBuffer());
  if (body.length > 6_000_000) throw Error('Phản hồi Petrolimex quá lớn');
  return body;
}

const statePath = process.env.PETROLIMEX_STATE ?? '.run/petrolimex-status.json';
const snapshotPath = 'dist/snapshot.json';
async function writeJson(path,value) {
  await mkdir(dirname(path),{recursive:true});
  await writeFile(path+'.tmp',JSON.stringify(value,null,2)+'\n');
  await rename(path+'.tmp',path);
}
async function readState() {
  try {return JSON.parse(await readFile(statePath,'utf8'));} catch (error) {
    if (error.code !== 'ENOENT') throw error;
    return {};
  }
}

export async function run(slot, {force=false, now=new Date()}={}) {
  let snapshot = JSON.parse(await readFile(snapshotPath,'utf8'));
  const previous = await readState();
  const risk = marketRisk(snapshot,+now);
  if (!force && (!monitorDue(Date.parse(slot),!!risk.trigger) || Date.parse(previous.slot) >= Date.parse(slot))) return false;
  const observedAt = now.toISOString();
  const status = {slot,lastCheckedAt:observedAt,lastSuccessAt:previous.lastSuccessAt ?? null,error:null,
    ...risk, forecast:previous.forecast ?? null};
  const original = snapshot;
  try {
    const html = await readUrl(index);
    const links = candidates(html.toString(),Math.max(Date.parse(snapshot.pump.effectiveAt),Date.parse(snapshot.official.effectiveAt)),+now);
    if (!load(html.toString())('.blog__item, a[href*="petrolimex-dieu-chinh-gia-xang-dau"]').length) throw Error('Trang thông cáo Petrolimex thiếu danh sách');
    for (const candidate of links) {
      const notice = parseNotice((await readUrl(candidate.url)).toString(),candidate,+now);
      const result = spawnSync(process.env.PETROLIMEX_PYTHON ?? 'python3',['scripts/read-petrolimex-table.py'],{
        input:await readUrl(notice.tableUrl),timeout:90000,encoding:'utf8'
      });
      if (result.status !== 0) throw Error('Không xác thực được ảnh bảng giá Petrolimex: '+(result.stderr?.trim().split('\n').at(-1) || result.error?.message || 'OCR lỗi'));
      snapshot = applyNotice(snapshot,notice,verifyPrices(JSON.parse(result.stdout)),observedAt,previous.forecast);
    }
    if (snapshot !== original) await writeJson(snapshotPath,snapshot);
    status.lastSuccessAt = new Date().toISOString();
    Object.assign(status,marketRisk(snapshot,+now));
  } catch (error) {
    status.error = error.message;
    console.error('Petrolimex: '+error.message);
    snapshot = original;
  }
  const troo = defaultTroo(snapshot,+now);
  if (troo?.prices.every(Number.isFinite) && Date.parse(snapshot.forecast.period+'T15:00:00+07:00') > +now)
    status.forecast = {period:troo.period,prices:troo.prices,capturedAt:observedAt};
  await writeJson(statePath,status);
  return true;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const slot = process.argv[2];
  if (!Number.isFinite(Date.parse(slot))) throw Error('Thiếu mốc lịch Petrolimex hợp lệ');
  const force = process.argv.includes('--force');
  if (process.argv.includes('--due')) {
    const snapshot = JSON.parse(await readFile(snapshotPath,'utf8'));
    const previous = await readState();
    const active = !!marketRisk(snapshot).trigger;
    if (!force && (!monitorDue(Date.parse(slot),active) || Date.parse(previous.slot) >= Date.parse(slot))) process.exitCode = 1;
  } else {
    await run(slot,{force});
  }
}
