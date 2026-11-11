import {dieselName, plattsValue} from './model.js?v=rules';
const colors = ['#ffd076', '#6ee7ba'];
const number = new Intl.NumberFormat('vi-VN', {maximumFractionDigits: 2});
const marketDate = new Intl.DateTimeFormat('en-CA', {timeZone: 'America/New_York'});
const marketTime = new Intl.DateTimeFormat('vi-VN', {timeZone:'Asia/Ho_Chi_Minh', dateStyle:'short', timeStyle:'short'});
const oneDay = 86400000;
const svgNS = 'http://www.w3.org/2000/svg';

function node(tag, content, className) {
  const element = document.createElement(tag);
  if (content != null) element.textContent = content;
  if (className) element.className = className;
  return element;
}

function svgNode(parent, tag, attributes, text) {
  const element = document.createElementNS(svgNS, tag);
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value);
  if (text != null) element.textContent = text;
  parent.append(element);
  return element;
}

function crudeSeries(quote) {
  if (!quote || quote.isSample) return new Map();
  const points = new Map((quote.sessions ?? []).map(({date, price}) => [date, price]));
  for (const point of [quote, quote.previous]) {
    if (point?.marketTime && Number.isFinite(point.price)) {
      const day = point.date ?? marketDate.format(new Date(point.marketTime));
      if (!points.has(day)) points.set(day, point.price);
    }
  }
  return points;
}

export function tradingDays(maps, limit) {
  const dates = [...new Set(maps.flatMap(map => [...map.keys()]))].sort();
  if (!dates.length) return dates;
  const last = Date.parse(dates.at(-1));
  const first = Math.max(Date.parse(dates[0]), limit ? last - (limit - 1) * oneDay : -Infinity);
  const days = [];
  for (let time = first; time <= last; time += oneDay) {
    const instant = new Date(time);
    const day = instant.toISOString().slice(0, 10);
    if ((instant.getUTCDay() % 6 !== 0) || maps.some(map => map.has(day))) days.push(day);
  }
  return days;
}

function chart(title, series, limit, showPrices) {
  const card = node('article', null, 'market-chart');
  card.append(node('h3', title + ' · USD/thùng'));
  const dates = tradingDays(series.map(item => item.points), limit);
  const values = dates.flatMap(day => series.map(item => item.points.get(day))).filter(Number.isFinite);
  if (!values.length) {
    card.append(node('p', 'Chưa có dữ liệu.'));
    return card;
  }
  const legend = node('div', null, 'chart-legend');
  series.forEach(({name}, i) => {
    const item = node('span', name);
    item.style.setProperty('--series-color', colors[i]);
    legend.append(item);
  });
  const tooltip = node('output', 'Chọn điểm để xem ngày và giá.', 'chart-tooltip');
  tooltip.setAttribute('aria-live', 'polite');
  const scroll = node('div', null, 'chart-scroll');
  card.append(scroll, legend, tooltip);
  const width = Math.max(340, dates.length * (showPrices ? 43 : 11) + 55);
  const svg = svgNode(scroll, 'svg', {viewBox:'0 0 '+width+' 205', 'aria-label':title});
  svg.style.minWidth = Math.min(width, showPrices ? width : 650) + 'px';
  const min = Math.min(...values);
  const max = Math.max(...values);
  const padding = Math.max((max - min) * .12, .6);
  const low = min - padding;
  const high = max + padding;
  const x = i => dates.length === 1 ? width / 2 : 42 + i * (width - 60) / (dates.length - 1);
  const y = value => 159 - (value - low) * 128 / (high - low);
  for (let step = 0; step < 3; step++) {
    const value = low + step * (high - low) / 2;
    const pos = y(value);
    svgNode(svg, 'line', {x1:42, x2:width - 18, y1:pos, y2:pos, class:'chart-grid'});
    svgNode(svg, 'text', {x:37,y:pos+3,'text-anchor':'end'}, number.format(value));
  }
  const interval = Math.max(1, Math.ceil(dates.length / Math.floor(width / 54)));
  dates.forEach((day, i) => {
    if (i % interval === 0 || (i === dates.length - 1 && i % interval >= interval / 2))
      svgNode(svg, 'text', {x:x(i),y:183,'text-anchor':'middle'}, day.slice(5).split('-').reverse().join('/'));
  });
  series.forEach(({name,points}, index) => {
    let path = '';
    let continuous = false;
    dates.forEach((day, i) => {
      const price = points.get(day);
      if (!Number.isFinite(price)) {
        continuous = false;
        return;
      }
      path += (continuous ? 'L' : 'M') + x(i) + ',' + y(price);
      continuous = true;
    });
    svgNode(svg, 'path', {d:path, fill:'none', stroke:colors[index], 'stroke-width':2});
    dates.forEach((day, i) => {
      const price = points.get(day);
      if (!Number.isFinite(price)) return;
      const label = name+' · '+day.split('-').reverse().join('/')+' · '+number.format(price)+' USD/thùng';
      const point = svgNode(svg, 'circle', {cx:x(i),cy:y(price),r:4,fill:colors[index],tabindex:0,'aria-label':label});
      svgNode(point, 'title', {}, label);
      for (const event of ['pointerenter','click','focus']) point.addEventListener(event, () => {tooltip.textContent = label;});
      if (showPrices) svgNode(svg, 'text', {x:x(i),y:y(price)+(index ? -9 : 15),'text-anchor':'middle',fill:colors[index]}, number.format(price));
    });
  });
  return card;
}

export function renderMarket(snapshot) {
  const range = document.getElementById('chart-range');
  const labels = document.getElementById('chart-labels');
  const chartList = document.getElementById('price-charts');
  const quotes = document.getElementById('crude-quotes');
  const crude = [['Brent', snapshot.brent], ['WTI', snapshot.wti]];
  quotes.replaceChildren(...crude.map(([name, quote]) => {
    const card = node('article', null, 'market-chart');
    card.append(node('h3', name), node('strong', quote && !quote.isSample ? number.format(quote.price)+' USD/thùng' : '—'));
    if (!quote || quote.isSample) return card;
    const change = Number.isFinite(quote.previous?.price) ? quote.price - quote.previous.price : null;
    const stale = snapshot.sources?.[name.toLowerCase()]?.status === 'error' || Date.now() - Date.parse(quote.marketTime) > 36 * 3600000;
    const priceTime = marketTime.format(new Date(quote.marketTime));
    card.append(node('p', 'Giờ thị trường '+priceTime + (stale ? ' · Dữ liệu cũ' : '')));
    if (quote.capturedAt) card.append(node('p', 'Lấy lúc '+marketTime.format(new Date(quote.capturedAt))));
    if (change !== null) card.append(node('span', (change > 0 ? '+' : change < 0 ? '−' : '')+number.format(Math.abs(change))+' USD/thùng'));
    return card;
  }));
  const plattsSeries = name => {
    const sessions = (snapshot.platts.sessions ?? []).filter(row => !snapshot.platts.isSample || row.manualUpdatedAt);
    return {name, points:new Map(sessions.map(row => [row.date, plattsValue(snapshot.platts.items,row.values,name)]))};
  };
  function draw() {
    chartList.replaceChildren(
      chart('Platts xăng', ['A92','A95'].map(plattsSeries), +range.value, labels.checked),
      chart('Platts dầu', ['DO 10ppm',dieselName].map(plattsSeries), +range.value, labels.checked),
      chart('Dầu thô', crude.map(([name, quote])=>({name, points:crudeSeries(quote)})), +range.value, labels.checked)
    );
  }
  range.onchange = labels.onchange = draw;
  draw();
}
