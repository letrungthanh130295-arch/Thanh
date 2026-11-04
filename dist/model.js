export function historyRows(records){return [...records].sort((a,b)=>b.period.localeCompare(a.period)).slice(0,10);}
export function differences(actual,pred){return actual?.length===3&&pred?.length===3&&actual.every(Number.isFinite)&&pred.every(Number.isFinite)?actual.map((v,i)=>v-pred[i]):null;}
export function score(actual,pred){const d=differences(actual,pred);return d?d.reduce((a,v)=>a+Math.abs(v),0)/3:null;}
export function bestSources(record){const ranked=Object.entries(record.predictions||{}).map(([name,v])=>({name,score:score(record.actual,v)})).filter(x=>x.score!==null).sort((a,b)=>a.score-b.score);return ranked.length?ranked.filter(x=>x.score===ranked[0].score).map(x=>x.name):[];}
export function illustrative(base,delta){return Number.isFinite(base)&&Number.isFinite(delta)?base+delta:null;}
