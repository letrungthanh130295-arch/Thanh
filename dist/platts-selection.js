export const products = {
  a92: ['A92'],
  a95: ['A95'],
  do10: ['DO 10ppm', 'DO 0,001%S'],
  do500: ['DO 0,05%S', 'DO 500ppm']
};
export const sourceLabels = {zalo:'Zalo', chogia:'Chợ Giá', commodityscope:'CommodityScope'};
const singaporeDate = instant => new Date(instant).toLocaleDateString('en-CA',{timeZone:'Asia/Ho_Chi_Minh'});
const isoDate = day => /^\d{4}-\d{2}-\d{2}$/.test(day) && Number.isFinite(Date.parse(day)) &&
  new Date(day).toISOString().slice(0,10)===day;
const validTime = at => typeof at==='string' && /(?:Z|[+-]\d{2}:\d{2})$/.test(at) && Number.isFinite(Date.parse(at));
const validPrice = price => Number.isFinite(price) && price>0 && price<=100000;
const marketSources = ['zalo','chogia','commodityscope'];
const noPriority = (a,b) => {
  // Day, product and value are considered before source in a simultaneous batch.
  const key = r => JSON.stringify([r.session_date,r.product,r.price,r.source]);
  return Date.parse(a.first_seen_at)-Date.parse(b.first_seen_at) || key(a).localeCompare(key(b),'en');
};

export function ingestPlatts(platts, input, {now, openFrom, closedBefore, commodityscopeVerified=false}) {
  if(!validTime(now)) throw Error('Giờ ghi Platts không hợp lệ');
  const result=structuredClone(platts);
  const ledger=result.selection ??= {};
  const sessions=new Map((result.sessions??[]).map(row=>[row.date,row]));
  for(const [day,field] of [[result.date,'value'],[result.previousDate,'previous']]){
    if(day&&!sessions.has(day)) sessions.set(day,{date:day,values:result.items.map(item=>item[field])});
  }
  const accepted=input.map(row=>{
    if(!Object.hasOwn(products,row.product)||!marketSources.includes(row.source)||!isoDate(row.session_date)||
       row.session_date>singaporeDate(now)||!validPrice(row.price)||row.unit!=='USD/thùng'||
       !validTime(row.first_seen_at)||Date.parse(row.first_seen_at)>Date.parse(now)||
       singaporeDate(row.first_seen_at)<row.session_date) throw Error('Bản ghi Platts không hợp lệ');
    if(row.source_published_at!=null&&(!validTime(row.source_published_at)||Date.parse(row.source_published_at)>Date.parse(row.first_seen_at)))
      throw Error('Giờ công bố Platts không hợp lệ');
    if(row.correction&&!(typeof row.evidence==='string'&&row.evidence.trim()))throw Error('Bản sửa cần bằng chứng');
    return {product:row.product,session_date:row.session_date,price:row.price,source:row.source,
      source_published_at:row.source_published_at??null,first_seen_at:row.first_seen_at,recorded_at:now,
      status:row.correction?'corrected':'provisional',...(row.evidence&&{evidence:row.evidence})};
  }).filter(row=>row.source!=='commodityscope'||commodityscopeVerified).sort(noPriority);

  let changed=false;
  for(const row of accepted){
    const {product,session_date: day}=row;
    const index=result.items.findIndex(item=>products[product].includes(item.name));
    if(index<0)throw Error('Snapshot thiếu mã mặt hàng '+product);
    const slot=ledger[day]?.[product];
    const session=sessions.get(day);
    const existing=session?.values[index];
    const previous=slot?.selected;
    if((slot?.observations??[]).some(item=>item.source===row.source&&item.price===row.price&&
       (row.status!=='corrected'||item.status==='corrected'&&item.evidence===row.evidence)))continue;
    const closed=!!(openFrom&&day<openFrom)||!!(closedBefore&&Date.parse(row.first_seen_at)>=Date.parse(closedBefore));
    const correction=row.status==='corrected';
    if(correction&&(closed||!(previous||validPrice(existing))))throw Error('Bản sửa cần giá đã chọn trong kỳ đang mở');
    if(correction)row.previous_price=previous?.price??existing;
    const observations=[...(slot?.observations??[]),row];
    let selected=previous??null;
    if(!selected&&validPrice(existing)){
      const legacyTime=session.valueCapturedAt?.[index]??session.capturedAt??null;
      const legacySource=session.source==='Chợ Giá'||session.sourceUrl?.startsWith('https://chogia.vn/')?'chogia':null;
      if(legacySource)selected={product,session_date:day,price:existing,source:legacySource,
        source_published_at:null,first_seen_at:validTime(legacyTime)?legacyTime:null,recorded_at:null,status:'provisional'};
    }
    if(correction&&!previous&&selected)observations.unshift(selected);
    if(!closed&&(correction||(!selected&&!validPrice(existing)))){
      selected=row;
      const values=[...(session?.values??result.items.map(()=>null))];
      values[index]=row.price;
      const valueCapturedAt=[...(session?.valueCapturedAt??result.items.map((_,i)=>validPrice(session?.values[i])?session.capturedAt??null:null))];
      valueCapturedAt[index]=row.first_seen_at;
      sessions.set(day,{...session,date:day,values,valueCapturedAt});
    }else if(selected?.status==='provisional'&&selected.source!==row.source&&selected.price===row.price){
      selected={...selected,status:'confirmed'};
    }
    const reviewPrice=selected?.price??existing;
    const comparison=(slot?.comparisons??[]).concat(validPrice(reviewPrice)&&selected!==row&&!correction?[{source:row.source,first_seen_at:row.first_seen_at,
      difference:Number((row.price-reviewPrice).toFixed(6))}]:[]);
    (ledger[day]??={})[product]={selected,observations,comparisons:comparison,
      needsReview:!correction&&(slot?.needsReview===true||(validPrice(reviewPrice)&&row.price!==reviewPrice))};
    changed=true;
  }
  if(!changed)return platts;
  const ordered=[...sessions.values()].sort((a,b)=>b.date.localeCompare(a.date));
  const [latest,prior]=ordered;
  if(latest){
    Object.assign(result,{sessions:ordered,date:latest.date,previousDate:prior?.date??null});
    result.items=result.items.map((item,i)=>({...item,value:latest.values[i]??null,previous:prior?.values[i]??null}));
  }
  return result;
}
