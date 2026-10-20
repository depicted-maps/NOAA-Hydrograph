
'use strict';
// One-station POC; changing ?station= does NOT change any ArcGIS Online records.
const params=new URLSearchParams(location.search);
const rawStation=(params.get('station')||'WOOR1').trim().toUpperCase();
const gauge=rawStation.replace(/^NWS(?=[A-Z0-9]{5}$)/,'');
if(!/^[A-Z0-9]{5,8}$/.test(gauge)){
  document.body.textContent='Invalid NOAA station identifier. Expected 5–8 letters or digits.';
  throw new Error('Invalid station identifier');
}
const $=id=>document.getElementById(id);
const base='https://api.water.noaa.gov/nwps/v1/gauges/'+encodeURIComponent(gauge);
const native='https://water.noaa.gov/gauges/'+gauge.toLowerCase();
$('native').href=native;
$('stationLink').href=native;
$('dataLink').href=base+'/stageflow';
$('forecastLink').href=base+'/stageflow/forecast';
$('bannerId').textContent='NOAA '+gauge+' · National Water Prediction Service';
function stationCoords(){if(gauge==='WOOR1')return {lat:42.006389,lon:-71.503056};const lat=Number(metadata?.latitude??metadata?.location?.latitude??metadata?.coordinates?.latitude);const lon=Number(metadata?.longitude??metadata?.location?.longitude??metadata?.coordinates?.longitude);return Number.isFinite(lat)&&Number.isFinite(lon)&&lat!==0&&lon!==0?{lat,lon}:null;}
$('mapToggle').addEventListener('click',()=>{const box=$('mapbox');const opening=box.style.display!=='block';box.style.display=opening?'block':'none';$('mapToggle').textContent=opening?'Hide map':'Show map';if(opening){const p=stationCoords();if(p){const delta=.055;const bbox=[p.lon-delta,p.lat-delta,p.lon+delta,p.lat+delta].join('%2C');$('stationMap').src='https://www.openstreetmap.org/export/embed.html?bbox='+bbox+'&layer=mapnik&marker='+p.lat+'%2C'+p.lon;}else{box.style.display='none';$('mapToggle').textContent='Show map';alert('NOAA coordinates were not returned for this station.');}}});
$('plotToggle').addEventListener('click',()=>{const main=$('mainPlot');const hidden=main.classList.toggle('hidden-chart');$('plotToggle').textContent=hidden?'Show plots':'Hide plots';});
let metadata=null, stageflow=null, days=2, metric='primary', curves=[], rangeStart=0, rangeEnd=100;
function fail(msg){$('err').textContent=msg;$('err').style.display='block';$('pending').textContent='Graph unavailable — see diagnostic message above';$('pending').style.display='grid';$('chart').style.display='none';$('status').textContent='No verified live graph';}
async function getJSON(url){let res=await fetch(url,{headers:{'Accept':'application/json'},cache:'no-store'});if(!res.ok)throw new Error('NOAA returned HTTP '+res.status+' for '+url);return res.json();}
/* RiverWise-derived normalization and flood-category interpretation.
   RiverWise copyright (c) 2026 Will Miller, MIT. License retained below. */
function numeric(value){
  if(value===null||value===undefined||value==='')return null;
  const n=Number(value);
  return Number.isFinite(n)&&n > -900 ? n : null;
}
function series(product,key){
  if(!product)return [];
  const arr=Array.isArray(product.data)?product.data:Array.isArray(product.values)?product.values:Array.isArray(product)?product:[];
  return arr.map(point=>{
    const time=point.validTime??point.time??point.timestamp??point.dateTime;
    const raw=point[key]??(key==='primary'?point.stage:point.flow);
    const val=numeric(raw&&typeof raw==='object'?(raw.value??raw.stage??raw.flow):raw);
    return {t:Date.parse(time),v:val};
  }).filter(point=>Number.isFinite(point.t)&&point.v!==null).sort((a,b)=>a.t-b.t);
}
function thresholdList(m){
  const categories=m?.flood?.categories??m?.floodCategories??m?.flood_categories??{};
  return [
    ['Action','action','#ab8834'],
    ['Minor','minor','#d1a33e'],
    ['Moderate','moderate','#ed7d40'],
    ['Major','major','#bb4351']
  ].map(([title,key,color])=>{
    let raw=categories[key];
    if(raw&&typeof raw==='object')raw=raw.stage??raw.value??raw.primary;
    return {title,val:numeric(raw),color};
  }).filter(record=>record.val!==null);
}
function svgEl(tag,attrs,text){const el=document.createElementNS('http://www.w3.org/2000/svg',tag);Object.entries(attrs||{}).forEach(([k,v])=>el.setAttribute(k,v));if(text!==undefined)el.textContent=text;return el;}
function draw(){const svg=$('chart');svg.replaceChildren();$('tip').style.display='none';const obs=series(stageflow?.observed,metric);
// NOAA products can carry overlapping timestamps. Keep original data unchanged,
// but display forecasts only *after* the final observed timestamp.
const forecastRaw=series(stageflow?.forecast,metric);
const lastObserved=obs.length?obs[obs.length-1].t:null;
// Single handoff: no forecast point at or before the final observed timestamp.
// This is DISPLAY-ONLY: it never changes NOAA source data.
const forecast=lastObserved===null?forecastRaw:forecastRaw.filter(p=>p.t>lastObserved);
if(lastObserved!==null&&forecast.some(p=>p.t<=lastObserved))throw new Error('Forecast/observation handoff invariant failed');
curves=[{name:'Observed',pts:obs,color:'#176fbc'},{name:'Forecast',pts:forecast,color:'#9950ac'}];let all=curves.flatMap(x=>x.pts);if(!all.length){fail('NOAA responded but this gauge has no usable '+(metric==='primary'?'stage':'flow')+' time-series values in the expected API fields. Use the official gauge page to inspect available products.');return;}
const minTime=Math.min(...all.map(p=>p.t)),maxTime=Math.max(...all.map(p=>p.t));
const present=obs.length?Math.max(...obs.map(p=>p.t)):minTime;
const viewStart=days===0?minTime:Math.max(minTime,present-days*86400000);
let x0=viewStart+(maxTime-viewStart)*rangeStart/100;
let x1=viewStart+(maxTime-viewStart)*rangeEnd/100;
if(x1<=x0)x1=x0+60000;
all=all.filter(p=>p.t>=x0&&p.t<=x1);
if(!all.length){fail('No NOAA points in this selected time range. Use Reset or All available.');return;}
$('rangeLabel').textContent=new Date(x0).toLocaleString()+' — '+new Date(x1).toLocaleString();
$('startRange').disabled=false;$('endRange').disabled=false;

// Displaying flood categories and scaling the y-axis to include them are independent controls.
// NWPS flood categories refer to stage, not discharge; disable the scaling choice in Flow mode.
const isStage=metric==='primary';
$('scaleFlood').disabled=!isStage;
const availableThresholds=isStage?thresholdList(metadata):[];
const th=isStage&&$('thresholds').checked?availableThresholds:[];
const scaleToFlood=isStage&&$('scaleFlood').checked;
const vals=all.map(p=>p.v).concat(scaleToFlood?availableThresholds.map(t=>t.val):[]);
let lo=Math.min(...vals),hi=Math.max(...vals),span=Math.max(hi-lo,.1);lo-=span*.12;hi+=span*.12;
const left=67,right=970,top=27,bottom=326;const X=t=>left+(t-x0)/(x1-x0)*(right-left),Y=v=>bottom-(v-lo)/(hi-lo)*(bottom-top);
svg.append(svgEl('rect',{x:left,y:top,width:right-left,height:bottom-top,fill:'#f7fafc'}));
for(let i=0;i<=5;i++){const y=top+i*(bottom-top)/5,v=hi-(hi-lo)*i/5;svg.append(svgEl('line',{x1:left,x2:right,y1:y,y2:y,stroke:'#d9e4ec'}));svg.append(svgEl('text',{x:left-9,y:y+4,'text-anchor':'end',fill:'#576e80','font-size':12},v.toFixed(Math.abs(v)>=100?0:2)));}
for(let i=0;i<=6;i++){const t=x0+i*(x1-x0)/6,x=X(t);svg.append(svgEl('line',{x1:x,x2:x,y1:top,y2:bottom,stroke:'#edf1f5'}));svg.append(svgEl('text',{x,y:bottom+24,'text-anchor':'middle',fill:'#536c7c','font-size':11},new Date(t).toLocaleString(undefined,{month:'short',day:'numeric',hour:'numeric'})));}
if(th.length){const ordered=[...th].filter(t=>t.val>=lo&&t.val<=hi).sort((a,b)=>a.val-b.val);let lower=bottom;for(const band of ordered){const y=Math.max(top,Math.min(bottom,Y(band.val)));svg.append(svgEl('rect',{x:left,y:y,width:right-left,height:Math.max(0,lower-y),fill:band.color,'fill-opacity':'.09'}));lower=y;}}
for(const h of th){const y=Y(h.val);if(y<top||y>bottom)continue;svg.append(svgEl('line' ,{x1:left,x2:right,y1:y,y2:y,stroke:h.color,'stroke-width':1.8,'stroke-dasharray':'7 5'}));svg.append(svgEl('text',{x:right-6,y:y-5,'text-anchor':'end','font-size':12,fill:h.color},h.title+' '+h.val));}
// Final plot-level safeguard: segment paths can never cross the handoff timestamp.
for(const c of curves){
  const points=c.pts.filter(p=>p.t>=x0&&p.t<=x1&&(
    lastObserved===null || (c.name==='Forecast'?p.t>lastObserved:p.t<=lastObserved)
  ));
  if(!points.length)continue;
  svg.append(svgEl('polyline',{points:points.map(p=>X(p.t).toFixed(2)+','+Y(p.v).toFixed(2)).join(' '),fill:'none',stroke:c.color,'stroke-width':2.8,'stroke-linecap':'round','stroke-linejoin':'round'}));
}
// Make the observed-to-forecast boundary explicit, but only when both are visible.
if(lastObserved!==null&&forecast.some(p=>p.t>x0&&p.t<=x1)&&obs.some(p=>p.t>=x0&&p.t<=x1)&&lastObserved>=x0&&lastObserved<=x1){
  const boundary=X(lastObserved);
  svg.append(svgEl('line',{x1:boundary,x2:boundary,y1:top,y2:bottom,stroke:'#65798b','stroke-width':1.5,'stroke-dasharray':'4 5'}));
  svg.append(svgEl('text',{x:Math.min(boundary+7,right-115),y:top+13,'font-size':11,fill:'#415466'},'Last observation'));
}
svg.append(svgEl('text',{x:left,y:17,fill:'#314f63','font-size':13,'font-weight':'bold'},metric==='primary'?'Stage':'Flow'));
svg.onpointermove=e=>{const rect=svg.getBoundingClientRect(),t=x0+((e.clientX-rect.left)/rect.width*1000-left)/(right-left)*(x1-x0);let nearest=null;for(const c of curves)for(const p of c.pts){const diff=Math.abs(p.t-t);if(!nearest||diff<nearest.diff)nearest={...p,name:c.name,diff};}if(!nearest)return;const tip=$('tip');tip.textContent=nearest.name+' · '+new Date(nearest.t).toLocaleString()+' · '+nearest.v;tip.style.display='block';tip.style.left=Math.min(e.clientX-rect.left+12,rect.width-215)+'px';tip.style.top=Math.max(5,e.clientY-rect.top-45)+'px';};svg.onpointerleave=()=>$('tip').style.display='none';
$('pending').style.display='none';svg.style.display='block';$('status').textContent='v1.00.8 · '+obs.length+' observed points · '+forecast.length+' future forecast points'+(forecastRaw.length!==forecast.length?' (overlapping forecast times hidden)':'')+' · '+(th.length?'Flood thresholds shown':'No flood thresholds shown');}
async function refresh(){ $('err').style.display='none';$('status').textContent='Requesting NOAA NWPS data…';$('chart').style.display='none';$('pending').style.display='grid';$('pending').textContent='Loading live hydrograph…';try{const [gaugeInfo,observations,forecastResult]=await Promise.all([
  getJSON(base),
  getJSON(base+'/stageflow/observed'),
  getJSON(base+'/stageflow/forecast').catch(error=>{console.warn('Forecast not available:',error.message);return null;})
]);
metadata=gaugeInfo;
stageflow={observed:observations,forecast:forecastResult};$('station').textContent=metadata?.name||metadata?.description||('NOAA gauge '+gauge);$('centerName').textContent=metadata?.name||metadata?.description||('NOAA gauge '+gauge);$('centerId').textContent='NWSLI: '+gauge+' · Source: NOAA/NWS NWPS';$('bannerName').textContent=metadata?.name||metadata?.description||('Blackstone River at Woonsocket, RI');$('metadata').textContent='Gauge '+gauge+' · '+(metadata?.state?.name||metadata?.state?.abbreviation||'Location from NOAA')+' · Live source data';$('loaded').textContent='Retrieved '+new Date().toLocaleString();draw();}catch(e){fail(e.message+' — If the API works in a tab but not here, check browser CORS or network restrictions. No data has been fabricated.');}}
for(const b of document.querySelectorAll('[data-days]'))b.addEventListener('click',()=>{days=Number(b.dataset.days);rangeStart=0;rangeEnd=100;$('startRange').value='0';$('endRange').value='100';document.querySelectorAll('[data-days]').forEach(x=>x.classList.toggle('active',x===b));if(stageflow)draw();});$('metric').addEventListener('change',e=>{metric=e.target.value;if(stageflow)draw();});$('thresholds').addEventListener('change',()=>{if(stageflow)draw();});$('scaleFlood').addEventListener('change',()=>{if(stageflow)draw();});$('refresh').addEventListener('click',refresh);
$('startRange').addEventListener('input',e=>{rangeStart=Math.min(Number(e.target.value),rangeEnd-1);if(stageflow)draw();});
$('endRange').addEventListener('input',e=>{rangeEnd=Math.max(Number(e.target.value),rangeStart+1);if(stageflow)draw();});
$('resetRange').addEventListener('click',()=>{rangeStart=0;rangeEnd=100;$('startRange').value='0';$('endRange').value='100';if(stageflow)draw();});
$('allWindow').addEventListener('click',()=>{days=0;rangeStart=0;rangeEnd=100;$('startRange').value='0';$('endRange').value='100';document.querySelectorAll('[data-days]').forEach(x=>x.classList.remove('active'));if(stageflow)draw();});
const refreshTimer=setInterval(()=>{if($('autoRefresh').checked&&document.visibilityState==='visible')refresh();},300000);
refresh();

/*
MIT License

Copyright (c) 2026 Will Miller

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/
