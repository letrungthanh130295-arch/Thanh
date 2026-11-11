import {readFile, writeFile, rename} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {parsePlatts, parseForecast, parseCrude, PLATTS_URL, FORECAST_URL} from './parsers.mjs';
import {updateSnapshot} from './update.mjs';

async function readSource(url, parse, fetcher, accept='text/html') {
  try {
    const response = await fetcher(url, {headers:{Accept:accept}, signal:AbortSignal.timeout(25000)});
    if (!response.ok) throw Error('HTTP ' + response.status);
    const body = await response.text();
    if (body.length > 6_000_000) throw Error('Phản hồi quá lớn');
    return {value: parse(body)};
  } catch (error) {
    return {error: error.message};
  }
}

async function yahoo(symbol, fetcher, now) {
  const errors = [];
  for (const host of ['query2','query1']) {
    const url = 'https://'+host+'.finance.yahoo.com/v8/finance/chart/'+symbol+'?interval=1d&range=3mo';
    const result = await readSource(url, body => ({...parseCrude(JSON.parse(body),symbol,now),sourceUrl:url}), fetcher,'application/json');
    if (result.value) return result;
    errors.push(host+': '+result.error);
  }
  return {error:errors.join('; ')};
}

export function fillMissingPlatts(old, incoming) {
  const sessions = new Map((old.sessions ?? []).map(row => [row.date, row]));
  for (const [date, key] of [[old.date, 'value'], [old.previousDate, 'previous']]) {
    if (date && !sessions.has(date)) sessions.set(date, {date, values:old.items.map(item => item[key])});
  }
  for (const row of incoming.sessions) {
    const stored = sessions.get(row.date);
    const values = row.values.map((price, i) => stored?.values[i] || price);
    sessions.set(row.date, {...row, ...stored, values});
  }
  const ordered = [...sessions.values()].sort((a,b) => b.date.localeCompare(a.date));
  const [current, previous] = ordered;
  return {...old, date:current.date, previousDate:previous?.date ?? null, sessions:ordered,
    pageUpdatedAt:incoming.pageUpdatedAt, pageUpdatedKind:incoming.pageUpdatedKind,
    sourceUrl:incoming.sourceUrl,
    items:old.items.map((item,i) => ({...item,value:current.values[i],previous:previous?.values[i] ?? null}))};
}

export async function run({path='dist/snapshot.json', fetcher=fetch, now=new Date(), crudeOnly=false}={}) {
  const old = JSON.parse(await readFile(path,'utf8'));
  const [platts, forecast, wti, brent] = await Promise.all([
    crudeOnly ? {skip:true} : readSource(PLATTS_URL, parsePlatts, fetcher),
    crudeOnly ? {skip:true} : readSource(FORECAST_URL, parseForecast, fetcher),
    yahoo('CL=F', fetcher, now),
    yahoo('BZ=F', fetcher, now)
  ]);
  if (platts.value) platts.value = fillMissingPlatts(old.platts, platts.value);
  const result = updateSnapshot(old, {platts, forecast, wti, brent}, now.toISOString());
  for (const error of result.errors) console.error(error);
  if (result.errors.length === (crudeOnly ? 2 : 4)) throw Error('Không đọc được dữ liệu từ các nguồn đã yêu cầu.');
  const numbers = value => JSON.stringify((value.sessions ?? []).map(({date,values})=>[date,values]));
  const publishedForecast = value => {
    const source = value.forecast.sources.find(row => row.name === 'Chợ Giá');
    return JSON.stringify([source?.period, source?.basisDate, source?.deltas, value.pendingForecast?.period, value.pendingForecast?.basisDate, value.pendingForecast?.deltas]);
  };
  const crudeData = quote => JSON.stringify([quote?.marketTime,quote?.price,quote?.sessions?.map(({date,price})=>[date,price])]);
  const crudeChanged = ['wti','brent'].some(key=>crudeData(old[key]) !== crudeData(result.snapshot[key]));
  const changed = crudeChanged || result.shouldDeploy || publishedForecast(old) !== publishedForecast(result.snapshot) || (!result.errors.some(error=>error.startsWith('platts:')) &&
    numbers(old.platts) !== numbers(result.snapshot.platts));
  if (changed) {
    await writeFile(path+'.tmp', JSON.stringify(result.snapshot,null,2)+'\n');
    await rename(path+'.tmp',path);
  }
  return {...result, changed};
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await run({crudeOnly:process.argv.includes('--crude-only')});
