"use strict";
// v1.01.0: independent Apache ECharts implementation. No NOAA site code copied.
const $=id=>document.getElementById(id);
const query=new URLSearchParams(location.search);const raw=(query.get('station')||'NWPR1').trim().toUpperCase();
const id=raw.replace(/^NWS(?=[A-Z0-9]{5}$)/,'');const valid=/^[A-Z0-9]{5,8}$/.test(id);
const url='https://api.water.noaa.gov/nwps/v1/gauges/'+encodeURIComponent(id);
const official='https://water.noaa.gov/gauges/'+id.toLowerCase()+'#hg=official';
$('official').href=official;$('officialFooter').href=official;$('dataLink').href=url+'/stageflow';
let chart=null, meta=null, observed=null, predicted=null, fullObs=[], fullForecast=[], lastCutoff=null, zoomWindow=null, metric='primary';
let retrieval=0, errorLogged=false;
const fmtTime=t=>new Date(t).toLocaleString('en-US',{timeZone:'America/New_York',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'});
function warn(msg){$('warning').hidden=false;$('warning').textContent=msg;}
function clearWarn(){$('warning').hidden=true;$('warning').textContent='';}
async function fetchJson(u){const r=await fetch(u,{cache:'no-store',headers:{Accept:'application/json'}});if(!r.ok)throw Error('NOAA HTTP '+r.status+' for '+u);return r.json();}
// RiverWise-derived value/series validation; original copyright and MIT license retained.
function numeric(v){if(v==null||v==='')return null;let n=Number(v);return Number.isFinite(n)&&n>-900?n:null;}
function points(p){let array=Array.isArray(p?.data)?p.data:Array.isArray(p?.values)?p.values:Array.isArray(p)?p:[];
 return array.map(v=>{let t=Date.parse(v.validTime??v.time??v.timestamp??v.dateTime);let value=v.primary??v.stage; if(value&&typeof value==='object')value=value.value??value.stage;return [t,numeric(value)];}).filter(p=>Number.isFinite(p[0])&&p[1]!=null).sort((a,b)=>a[0]-b[0]);}
function categories(m){const c=m?.flood?.categories??m?.floodCategories??{};return [['action','Action','#f3eb9d'],['minor','Minor Flood','#fce3b9'],['moderate','Moderate Flood','#f6c4b9'],['major','Major Flood','#edc6ef']].map(([k,label,color])=>{let o=c[k];let value=numeric(o&&typeof o==='object'?o.stage??o.primary:o);return {key:k,label,color,value};}).filter(x=>x.value!=null).sort((a,b)=>a.value-b.value);}
function chartData(){fullObs=points(observed);const forecastRaw=points(predicted);lastCutoff=fullObs.length?fullObs[fullObs.length-1][0]:null;
 fullForecast=lastCutoff==null?forecastRaw:forecastRaw.filter(p=>p[0]>lastCutoff);
 if(lastCutoff!=null&&fullForecast.some(p=>p[0]<=lastCutoff))throw Error('Observed/forecast overlap invariant');
 return [fullObs,fullForecast];}
function limits(data,cat){let vals=data.flatMap(arr=>arr.map(p=>p[1]));if($('scaleFlood').checked)vals.push(...cat.map(c=>c.value));const low=Math.min(...vals),high=Math.max(...vals),span=Math.max(.1,high-low);return [low-span*.1,high+span*.1];}
function setupZoomWindow(){let all=fullObs.concat(fullForecast);const first=all[0]?.[0],last=all.at(-1)?.[0];if(first==null)return;
 if(zoomWindow===null){let end=last;let start=Math.max(first,(lastCutoff??last)-2*864e5);zoomWindow=[start,end];}
 zoomWindow=[Math.max(first,zoomWindow[0]),Math.min(last,zoomWindow[1])];if(zoomWindow[0]>=zoomWindow[1])zoomWindow=[first,last];}
function render(preserve=true){if(!window.echarts){warn('The chart library did not load. Check the internet connection and JavaScript CDN.');return;}
 const [obs,fc]=chartData();if(!obs.length&&!fc.length){warn('NOAA returned no usable observed or forecast stage data for this station.');return;}
 const all=obs.concat(fc);const minX=Math.min(...all.map(p=>p[0])),maxX=Math.max(...all.map(p=>p[0]));const cats=categories(meta);
 if(!preserve)zoomWindow=null;setupZoomWindow();const [yMin,yMax]=limits([obs,fc],cats);
 if(!chart)chart=echarts.init($('chart'),null,{renderer:'canvas'});
 const markLines=[];if(lastCutoff!=null)markLines.push({name:'Observation / forecast boundary',xAxis:lastCutoff,lineStyle:{color:'#0579ad',width:1.4,type:'dashed'},label:{formatter:'Latest observation',position:'insideEndTop',color:'#246685',fontSize:10}});
 const marks=$('showFlood').checked?cats.map(c=>[{name:c.label+' '+c.value+' ft',yAxis:c.value,lineStyle:{color:'#8e776f',width:1},label:{formatter:c.label+' '+c.value+' ft',position:'insideStartTop',fontSize:10}}]):[];
 const pieces=[];if($('showFlood').checked){for(let i=0;i<cats.length;i++){pieces.push([{yAxis:cats[i].value,itemStyle:{color:cats[i].color,opacity:.4}},{yAxis:i+1<cats.length?cats[i+1].value:yMax}]);}}
 const opt={animation:false,backgroundColor:'#fff',grid:[{left:74,right:32,top:45,bottom:150}],legend:{top:4,data:['Observed','Forecast'],selectedMode:false,textStyle:{fontSize:13}},tooltip:{trigger:'axis',axisPointer:{type:'cross'},formatter:xs=>xs.map(x=>x.marker+' '+x.seriesName+': '+Number(x.value[1]).toFixed(2)+' ft').join('<br>')+'<br>'+fmtTime(xs[0].value[0])},
 xAxis:[{type:'time',axisLabel:{formatter:v=>new Date(v).toLocaleString('en-US',{timeZone:'America/New_York',month:'short',day:'numeric',hour:'numeric'})},axisLine:{lineStyle:{color:'#8294a5'}},axisTick:{show:true}}],yAxis:[{type:'value',name:'Tide / River Stage (ft)',nameLocation:'middle',nameGap:50,min:yMin,max:yMax,splitLine:{lineStyle:{color:'#d9e1e7'}}}],
 dataZoom:[{id:'wheel',type:'inside',xAxisIndex:0,filterMode:'none',zoomOnMouseWheel:true,moveOnMouseWheel:'shift',moveOnMouseMove:false,minValueSpan:3600000},{id:'navigator',type:'slider',xAxisIndex:0,filterMode:'none',bottom:38,height:58,showDataShadow:true,showDetail:true,handleSize:20,brushSelect:false,startValue:zoomWindow[0],endValue:zoomWindow[1]}],
 toolbox:{right:24,top:0,feature:{restore:{show:true},saveAsImage:{show:true,title:'Save hydrograph as PNG',pixelRatio:2}}},
 series:[{name:'Observed',type:'line',data:obs,showSymbol:false,symbol:'circle',lineStyle:{color:'#1766b0',width:2.8},itemStyle:{color:'#1766b0'},connectNulls:false,markLine:{silent:true,symbol:'none',data:markLines.concat(marks.map(row=>row[0]))},markArea:{silent:true,data:pieces}},{name:'Forecast',type:'line',data:fc,showSymbol:false,lineStyle:{color:'#8c40a8',width:2.5},itemStyle:{color:'#8c40a8'},connectNulls:false}]};
 chart.setOption(opt,true);
 chart.off('datazoom');chart.on('datazoom',()=>{let dz=chart.getOption()?.dataZoom?.[1];if(!dz)return;let start=dz.startValue,end=dz.endValue;if(Number.isFinite(Number(start))&&Number.isFinite(Number(end))){zoomWindow=[Number(start),Number(end)];}});
 $('handoff').textContent=lastCutoff==null?'No observations available':('Last observation: '+fmtTime(lastCutoff)+(fc.length?' · First forecast: '+fmtTime(fc[0][0]):' · No forecast available'));
 $('seriesCount').textContent=obs.length+' observations / '+fc.length+' future forecast values';
}
async function reload(){const token=++retrieval;clearWarn();$('loaded').textContent='Requesting live NOAA data…';
 if(!valid){warn('Invalid station ID; expected 5–8 letters/digits.');return;}
 try{const [m,o,f]=await Promise.all([fetchJson(url),fetchJson(url+'/stageflow/observed'),fetchJson(url+'/stageflow/forecast').catch(e=>{console.warn('NOAA forecast unavailable:',e);return null;})]);if(token!==retrieval)return;meta=m;observed=o;predicted=f;
 $('title').textContent=m.name||'NOAA gauge '+id;$('subtitle').textContent='NOAA '+id+' · National Water Prediction Service';$('stationName').textContent=m.name||'Gauge '+id;
 $('stationInfo').textContent='NWSLI '+id+' · NOAA official forecast data (if provided) · Independent chart rendering · Datum/units require station verification';
 $('loaded').textContent='Retrieved '+fmtTime(Date.now());render(true);
 }catch(e){warn('Cannot load verified NOAA gauge data: '+e.message+'. Use the official NOAA link for current conditions.');$('loaded').textContent='Live NOAA data unavailable';}}
for(const b of document.querySelectorAll('[data-zoom]'))b.addEventListener('click',()=>{if(!fullObs.length&&!fullForecast.length)return;let a=fullObs.concat(fullForecast).map(p=>p[0]),low=Math.min(...a),high=Math.max(...a);let days=b.dataset.zoom==='all'?null:Number(b.dataset.zoom);zoomWindow=days==null?[low,high]:[Math.max(low,(lastCutoff??high)-days*864e5),high];render(true);});
$('scaleFlood').addEventListener('change',()=>render(true));$('showFlood').addEventListener('change',()=>render(true));$('refresh').addEventListener('click',reload);
$('print').addEventListener('click',()=>window.print());$('downloadCSV').addEventListener('click',()=>{if(!fullObs.length&&!fullForecast.length)return;let rows=[['type','timestamp_utc','stage_ft'],...fullObs.map(p=>['observed',new Date(p[0]).toISOString(),p[1]]),...fullForecast.map(p=>['forecast',new Date(p[0]).toISOString(),p[1]])];let blob=new Blob([rows.map(r=>r.join(',')).join('\r\n')],{type:'text/csv'});let a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=id+'_hydrograph.csv';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500);});
setInterval(()=>{if($('autoRefresh').checked&&!document.hidden)reload();},300000);window.addEventListener('resize',()=>chart?.resize());
reload();
