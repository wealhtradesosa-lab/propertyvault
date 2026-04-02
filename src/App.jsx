import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { db, auth } from './firebase';
import { collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, serverTimestamp, where, updateDoc, getDocs } from 'firebase/firestore';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, Legend, ComposedChart, Line } from 'recharts';
import { Home, DollarSign, Users, Plus, Building2, X, Trash2, Loader2, LogOut, Lock, Mail, Receipt, Landmark, UserPlus, ClipboardList, Eye, EyeOff, ChevronDown, Upload, TrendingUp, BarChart3, Calendar, Layers, ArrowUpRight, ArrowDownRight, AlertTriangle, CheckCircle, Settings, Target, Pencil, Menu, Wrench, Clock, Printer, MessageSquare, Send, Moon, Sun } from 'lucide-react';

import { ADMIN_EMAILS, C, M, fm, fmCurrency, fmDate, pct, CATS, getCats, getTerms, COUNTRIES, CURRENCY_LIST, US_STATES as US, PROPERTY_TYPES as PT } from './lib/constants';
import { parsePDF } from './lib/pdfParser';
import { Inp, Sel, PPick, Mdl, Empty, Tbl, Tip, UpgradeBanner, KPI } from './components/ui';
import { LandingPage } from './components/LandingPage';
import { AuthScreen } from './components/AuthScreen';

import { Onboarding } from './components/Onboarding';
import { DashboardContext } from './context/DashboardContext';
import { SupportView } from './views/SupportView';
import { SettingsView } from './views/SettingsView';

// Safe view wrapper — catches errors per view instead of crashing the app
class ViewGuard extends React.Component {
  constructor(props){super(props);this.state={error:null}}
  static getDerivedStateFromError(error){return {error}}
  componentDidCatch(e){console.error('View error:',e)}
  render(){
    if(this.state.error) return <div className="bg-white rounded-2xl border border-rose-200 p-8 text-center m-4">
      <div className="w-12 h-12 bg-rose-100 rounded-2xl flex items-center justify-center mx-auto mb-3"><span className="text-rose-500 text-lg font-bold">!</span></div>
      <h3 className="text-base font-bold text-slate-700 mb-2">Error en esta sección</h3>
      <p className="text-sm text-slate-400 mb-4">{this.state.error.message}</p>
      <button onClick={()=>this.setState({error:null})} className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition">Intentar de nuevo</button>
    </div>;
    return this.props.children;
  }
}

// ═══════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════
function Dashboard({propertyId,propertyData:prop,allProperties=[],onSwitchProperty,onLogout,onAddProperty,userEmail}) {
  const isAdmin=ADMIN_EMAILS.includes(userEmail);
  const [userPlan,setUserPlan]=useState(isAdmin?'pro':'free');
  // Fetch user plan from Firestore
  useEffect(()=>{if(isAdmin)return;const unsub=onSnapshot(doc(db,'users',userEmail.toLowerCase()),snap=>{if(snap.exists()){const d=snap.data();if(d.status==='active'||d.status==='past_due')setUserPlan(d.plan||'free');else setUserPlan('free');}},()=>{});return()=>unsub()},[userEmail,isAdmin]);
  const plan=isAdmin?'pro':userPlan;
  const canUse=(feature)=>{if(isAdmin)return true;const access={free:['dashboard_basic','upload','expenses','income'],starter:['dashboard_basic','upload','expenses','income','insights','str_metrics','breakeven','annual','partners','mortgage','history','seasonality'],pro:['dashboard_basic','upload','expenses','income','insights','str_metrics','breakeven','annual','partners','mortgage','history','seasonality','reports','valuation','pipeline','repairs','portfolio']};return(access[plan]||access.free).includes(feature);};
  const [view,setView]=useState('dashboard');const [modal,setModal]=useState(null);const [rptTab,setRptTab]=useState('performance');const [stmtPage,setStmtPage]=useState(0);const [stmtYearFilter,setStmtYearFilter]=useState('all');const PER_PAGE=12;const [dashYear,setDashYear]=useState('all');
  const [expenses,setExpenses]=useState([]);const [income,setIncome]=useState([]);const [contribs,setContribs]=useState([]);const [stmts,setStmts]=useState([]);
  const [loading,setLoading]=useState(true);const [extraP,setExtraP]=useState('');const [extraPA,setExtraPA]=useState('');const [uploadLog,setUploadLog]=useState([]);const fileRef=useRef(null);
  const [valuations,setValuations]=useState([]);const [mobileNav,setMobileNav]=useState(false);const [repairs,setRepairs]=useState([]);const [tasks,setTasks]=useState([]);
  const [dark,setDark]=useState(()=>{try{return localStorage.getItem('od-dark')==='1'}catch{return false}});
  useEffect(()=>{document.documentElement.classList.toggle('dark',dark);try{localStorage.setItem('od-dark',dark?'1':'0')}catch{}},[dark]);
  const [tickets,setTickets]=useState([]);const [ticketForm,setTicketForm]=useState({type:'bug',subject:'',message:'',priority:'medium'});
  const [toast,setToast]=useState(null);
  const notify=(msg,type='success')=>{setToast({msg,type});setTimeout(()=>setToast(null),4000)};
  const [valForm,setValForm]=useState({date:'',value:'',source:'manual',notes:''});const uv=useCallback((k,v)=>setValForm(x=>({...x,[k]:v})),[]);
  const [repairForm,setRepairForm]=useState({date:'',title:'',description:'',amount:'',vendor:'',category:'repair',status:'pending',paidBy:''});const ur=useCallback((k,v)=>setRepairForm(x=>({...x,[k]:v})),[]);
  const [taskForm,setTaskForm]=useState({title:'',dueDate:'',priority:'medium',status:'pending',notes:'',amount:'',frequency:'annual',payer:'owner',reminderDays:'30'});const ut=useCallback((k,v)=>setTaskForm(x=>({...x,[k]:v})),[]);
  const [settingsForm,setSettingsForm]=useState(null);
  const [editPartners,setEditPartners]=useState(null);
  const [mortConfig,setMortConfig]=useState({bal:'',rate:'',term:'30',pay:'',start:''});const [savingMort,setSavingMort]=useState(false);
  const umc=useCallback((k,v)=>setMortConfig(x=>({...x,[k]:v})),[]);
  const partners=prop.partners||[];const mort=prop.mortgage||{};
  const [expenseForm,setExpenseForm]=useState({date:'',concept:'',amount:'',paidBy:partners[0]?.id||'',category:'otros',type:'additional',frequency:'once',expCurrency:''});const [editId,setEditId]=useState(null);
  const [nf,setNf]=useState({date:'',month:'',grossAmount:''});
  const [contribForm,setContribForm]=useState({date:'',concept:'',amount:'',paidBy:partners[0]?.id||''});
  const [stmtForm,setStmtForm]=useState({year:new Date().getFullYear(),month:1,revenue:'',net:'',commission:'',duke:'',water:'',hoa:'',maintenance:'',vendor:''});
  const ue=useCallback((k,v)=>setExpenseForm(x=>({...x,[k]:v})),[]);const un=useCallback((k,v)=>setNf(x=>({...x,[k]:v})),[]);
  const uc=useCallback((k,v)=>setContribForm(x=>({...x,[k]:v})),[]);const us=useCallback((k,v)=>setStmtForm(x=>({...x,[k]:v})),[]);

  useEffect(()=>{const b=`properties/${propertyId}`,u=[];
    const L=(s,fn)=>{u.push(onSnapshot(collection(db,b,s),snap=>{const docs=snap.docs.map(d=>({id:d.id,...d.data()}));docs.sort((a,b)=>{const ta=a.createdAt?.toMillis?.()||0,tb=b.createdAt?.toMillis?.()||0;return tb-ta});fn(docs)}))};
    L('expenses',setExpenses);L('income',setIncome);L('contributions',setContribs);L('statements',setStmts);L('valuations',setValuations);L('repairs',setRepairs);L('tasks',setTasks);setTimeout(()=>setLoading(false),700);return()=>u.forEach(x=>x())},[propertyId]);
  // Reset forms when switching property
  useEffect(()=>{setSettingsForm(null);setEditPartners(null);setView('dashboard');setDashYear('all');setEditId(null);setModal(null)},[propertyId]);

  // Tickets listener (global collection)
  useEffect(()=>{
    const q=isAdmin?query(collection(db,'tickets'),orderBy('createdAt','desc')):query(collection(db,'tickets'),where('userEmail','==',userEmail),orderBy('createdAt','desc'));
    const unsub=onSnapshot(q,snap=>setTickets(snap.docs.map(d=>({id:d.id,...d.data()}))),()=>setTickets([]));
    return()=>unsub();
  },[userEmail,isAdmin]);

  const save=async(sub,data)=>{
    await addDoc(collection(db,'properties',propertyId,sub),{...data,createdAt:serverTimestamp()});
    // If expense matches an obligation category → auto-mark obligation as paid
    if(sub==='expenses'&&data.category){
      const catToObligation={'taxes':/impuesto|tax/i,'insurance':/seguro|insurance/i,'mortgage_pay':/hipoteca|mortgage/i,'contabilidad':/contab/i,'hoa':/hoa/i};
      const rx=catToObligation[data.category];
      if(rx){
        const ob=tasks.find(t=>rx.test(t.title)&&t.dueDate);
        if(ob){
          const d=new Date(ob.dueDate+'T00:00:00');
          if(ob.frequency==='monthly'){d.setMonth(d.getMonth()+1)}else{d.setFullYear(d.getFullYear()+1)}
          await updateDoc(doc(db,'properties',propertyId,'tasks',ob.id),{dueDate:d.toISOString().split('T')[0],lastPaid:new Date().toISOString().split('T')[0]});
          notify(ob.title+' actualizado en Obligaciones');
        }
      }
    }
    setModal(null);setEditId(null);
  };
  // Mark obligation paid → auto-register expense + advance due date
  const catMap={'Hipoteca':'mortgage_pay','Impuestos':'taxes','Impuesto Predial':'predial','Seguro':'insurance','Seguros':'insurance','Contabilidad':'contabilidad','HOA':'hoa','Administración':'hoa','Personal de Servicio':'personal','Prestaciones Sociales':'prestaciones','Jardinería':'jardineria'};
  const markPaid=async(task)=>{
    const today=new Date().toISOString().split('T')[0];
    // Advance due date to next period
    let nextDue='';
    if(task.dueDate){
      const d=new Date(task.dueDate+'T00:00:00');
      if(task.frequency==='monthly'){d.setMonth(d.getMonth()+1)}else{d.setFullYear(d.getFullYear()+1)}
      nextDue=d.toISOString().split('T')[0];
    }
    await updateDoc(doc(db,'properties',propertyId,'tasks',task.id),{status:'pending',dueDate:nextDue||task.dueDate,lastPaid:today});
    if(task.amount&&parseFloat(task.amount)>0){
      await addDoc(collection(db,'properties',propertyId,'expenses'),{date:today,concept:task.title+(task.notes?' — '+task.notes:''),amount:parseFloat(task.amount),category:catMap[task.title]||'otros',type:'fixed',paidBy:partners[0]?.id||'',createdAt:serverTimestamp()});
      notify(task.title+' pagado · próximo: '+(nextDue?fmDate(nextDue):'—'));
    } else { notify(task.title+' marcado como pagado') }
  };
  const update=async(sub,id,data)=>{await updateDoc(doc(db,'properties',propertyId,sub,id),data);setModal(null);setEditId(null)};
  const del=async(sub,id)=>{if(!confirm('¿Eliminar?'))return;await deleteDoc(doc(db,'properties',propertyId,sub,id))};
  const saveMortgage=async()=>{setSavingMort(true);try{await updateDoc(doc(db,'properties',propertyId),{mortgage:{balance:parseFloat(mortConfig.bal)||0,rate:parseFloat(mortConfig.rate)||0,termYears:parseInt(mortConfig.term)||30,monthlyPayment:parseFloat(mortConfig.pay)||0,startDate:mortConfig.start||''}})}catch(e){notify('Error: '+e.message,'error')}setSavingMort(false)};

  // PDF Upload handler — with robust duplicate detection
  const handlePDFs=async(files)=>{
    const fileArr=Array.from(files);
    if(fileArr.length>15){notify(`Máximo 15 PDFs. Seleccionaste ${fileArr.length}`,'error');return;}
    const log=[];
    const uploaded=new Set();
    let existingPeriods=new Set();
    try{
      const freshSnap=await getDocs(collection(db,'properties',propertyId,'statements'));
      existingPeriods=new Set(freshSnap.docs.map(d=>{const s=d.data();return s.year+'-'+s.month}));
    }catch(e){/* ignore */}

    for(let fi=0; fi<fileArr.length; fi++){
      const f=fileArr[fi];
      if(!f.name.toLowerCase().endsWith('.pdf')){log.push({file:f.name,status:'error',msg:'No es un archivo PDF'});setUploadLog([...log]);continue;}
      log.push({file:f.name,status:'processing',msg:`Procesando... (${fi+1}/${fileArr.length})`});setUploadLog([...log]);
      try{
        const rawResult=await parsePDF(f);
        if(rawResult.error){log[log.length-1]={file:f.name,status:'error',msg:rawResult.error};setUploadLog([...log]);continue;}

        // Normalize: single result → array, annual report already returns array
        const results=Array.isArray(rawResult)?rawResult:[rawResult];
        let saved=0,skipped=0;

        for(const r of results){
          const key=r.year+'-'+r.month;
          if(existingPeriods.has(key)||uploaded.has(key)){skipped++;continue;}
          if(r.revenue<=0&&r.net<=0){skipped++;continue;}

          const {_debug, ...stmtData} = r;
          await addDoc(collection(db,'properties',propertyId,'statements'),{...stmtData,createdAt:serverTimestamp()});
          uploaded.add(key);
          existingPeriods.add(key);
          saved++;
        }

        const fmt=results[0]?.format||'Unknown';
        if(results.length>1){
          log[log.length-1]={file:f.name,status:saved>0?'ok':'dup',msg:`[${fmt}] ${saved} meses importados${skipped>0?' · '+skipped+' omitidos (duplicados)':''}`};
        } else {
          const r=results[0];
          const missing=[];
          if(!r.commission)missing.push('Comisión');if(!r.net)missing.push('Net');
          let msg=`[${fmt}] ${M[r.month-1]} ${r.year} — Rev: ${fm(r.revenue)} | Net: ${fm(r.net)} | ${r.nights||0} noches`;
          if(missing.length)msg+=` ⚠️ Sin: ${missing.join(', ')}`;
          log[log.length-1]={file:f.name,status:missing.length?'warn':'ok',msg};
        }
        setUploadLog([...log]);
      }catch(e){log[log.length-1]={file:f.name,status:'error',msg:'Error: '+(e.message||String(e))};setUploadLog([...log]);}
    }
  };

  // ═══ CALCULATIONS ═══
  const pt=useMemo(()=>{const r={};partners.forEach(p=>{r[p.id]={name:p.name,color:p.color,own:p.ownership,cont:0,exp:0,inc:0}});contribs.forEach(c=>{if(r[c.paidBy])r[c.paidBy].cont+=c.amount||0});expenses.forEach(e=>{if(r[e.paidBy])r[e.paidBy].exp+=e.amount||0});const tn=income.reduce((s,i)=>s+(i.netAmount||0),0);partners.forEach(p=>{r[p.id].inc=tn*(p.ownership/100)});return r},[partners,contribs,expenses,income]);

  const xr=prop.exchangeRate||1;const toPropCur=(amt,cur)=>{if(!cur||cur===propCurrency)return amt;if(cur==='USD'&&propCurrency!=='USD')return amt*xr;if(cur!=='USD'&&propCurrency==='USD')return amt/xr;return amt;};
  const totExp=expenses.reduce((s,e)=>s+toPropCur(e.amount||0,e.expCurrency),0);
  const totGross=income.reduce((s,i)=>s+(i.grossAmount||0),0);
  const totNet=income.reduce((s,i)=>s+(i.netAmount||0),0);
  const totCont=contribs.reduce((s,c)=>s+(c.amount||0),0);

  // Statement-based financials
  const stmtRev=stmts.reduce((s,x)=>s+(x.revenue||0),0);
  const stmtNet=stmts.reduce((s,x)=>s+(x.net||0),0);
  const stmtComm=stmts.reduce((s,x)=>s+(x.commission||0),0);
  const stmtDuke=stmts.reduce((s,x)=>s+(x.duke||0),0);
  const stmtHoa=stmts.reduce((s,x)=>s+(x.hoa||0),0);
  const stmtMaint=stmts.reduce((s,x)=>s+(x.maintenance||0),0);
  const stmtWater=stmts.reduce((s,x)=>s+(x.water||0),0);
  const stmtVendor=stmts.reduce((s,x)=>s+(x.vendor||0),0);
  const totalOpEx=stmtComm+stmtDuke+stmtHoa+stmtMaint+stmtWater+stmtVendor+totExp;

  // NOI = Revenue - Operating Expenses (without mortgage)
  const revenue = stmtRev || totGross;
  const noi = revenue - totalOpEx;
  // Cash Flow = NOI - Annual Mortgage Payment
  const annualMortgage = (mort.monthlyPayment||0) * 12;
  const cashFlow = noi - annualMortgage;
  // Cash-on-Cash = Annual Cash Flow / Capital Invertido Invested
  const coc = totCont > 0 ? (cashFlow / totCont) * 100 : 0;
  // Margin
  const margin = revenue > 0 ? (stmtNet || totNet) / revenue * 100 : 0;
  // Expense ratio
  const expRatio = revenue > 0 ? totalOpEx / revenue * 100 : 0;
  // Cap Rate = NOI / Purchase Price
  const capRate = prop.purchasePrice > 0 ? (noi / prop.purchasePrice) * 100 : 0;
  // Equity
  const equity = (prop.purchasePrice || 0) - (mort.balance || 0);
  // LTV
  const ltv = prop.purchasePrice > 0 && mort.balance > 0 ? (mort.balance / prop.purchasePrice) * 100 : 0;

  const propCountry=prop.country||'US';
  const propCurrency=prop.currency||'USD';
  const fmP=v=>fmCurrency(v,propCurrency);
  const propCats=getCats(propCountry);
  const propTerms=getTerms(propCountry);

  const fixedExp=useMemo(()=>expenses.filter(e=>{const c=propCats.find(x=>x.v===e.category);return c?.fixed||e.type==='fixed'}),[expenses,propCats]);
  const additionalExp=useMemo(()=>expenses.filter(e=>{const c=propCats.find(x=>x.v===e.category);return !c?.fixed&&e.type!=='fixed'}),[expenses,propCats]);
  const expByCat=useMemo(()=>{const r={};expenses.forEach(e=>{const c=propCats.find(x=>x.v===e.category)||{l:'Otros'};if(!r[e.category])r[e.category]={name:c.l,value:0};r[e.category].value+=toPropCur(e.amount||0,e.expCurrency)});return Object.values(r).sort((a,b)=>b.value-a.value)},[expenses,propCats]);

  const annual=useMemo(()=>{const y={};stmts.forEach(s=>{if(!y[s.year])y[s.year]={year:s.year,revenue:0,net:0,commission:0,duke:0,water:0,hoa:0,maintenance:0,vendor:0,nights:0,reservations:0,n:0};const a=y[s.year];a.revenue+=s.revenue||0;a.net+=s.net||0;a.commission+=s.commission||0;a.duke+=s.duke||0;a.water+=s.water||0;a.hoa+=s.hoa||0;a.maintenance+=s.maintenance||0;a.vendor+=s.vendor||0;a.nights+=s.nights||0;a.reservations+=s.reservations||0;a.n++});return Object.values(y).sort((a,b)=>a.year-b.year)},[stmts]);

  const monthly=useMemo(()=>{const r={};stmts.forEach(s=>{if(!r[s.year])r[s.year]={rev:Array(12).fill(0),net:Array(12).fill(0)};r[s.year].rev[s.month-1]=s.revenue||0;r[s.year].net[s.month-1]=s.net||0});return r},[stmts]);
  const monthRank=useMemo(()=>{const fy=annual.filter(y=>y.n===12);if(!fy.length)return[];return M.map((m,i)=>{let s=0,c=0;fy.forEach(y=>{if(monthly[y.year]){s+=monthly[y.year].net[i];c++}});return{month:m,avg:c?s/c:0}}).sort((a,b)=>b.avg-a.avg)},[annual,monthly]);

  // YoY trend
  const yoyTrend=useMemo(()=>{if(annual.length<2)return null;const curr=annual[annual.length-1],prev=annual[annual.length-2];if(!prev.revenue)return null;const chg=((curr.revenue-prev.revenue)/prev.revenue*100).toFixed(1);return{dir:parseFloat(chg)>=0?'up':'down',text:chg+'% vs '+prev.year}},[annual]);

  // Latest valuation & real equity
  const latestVal=useMemo(()=>{const sorted=[...valuations].sort((a,b)=>(b.date||'').localeCompare(a.date||''));return sorted[0]||null},[valuations]);
  const marketValue=latestVal?parseFloat(latestVal.value)||0:prop.purchasePrice||0;
  const realEquity=marketValue-(mort.balance||0);
  const appreciation=prop.purchasePrice>0?((marketValue-prop.purchasePrice)/prop.purchasePrice*100):0;
  const realLTV=marketValue>0&&mort.balance>0?(mort.balance/marketValue*100):0;

  // Trailing 12 months
  const t12=useMemo(()=>{const sorted=[...stmts].sort((a,b)=>b.year*100+b.month-a.year*100-a.month).slice(0,12);return{rev:sorted.reduce((s,x)=>s+(x.revenue||0),0),net:sorted.reduce((s,x)=>s+(x.net||0),0),n:sorted.length}},[stmts]);

  // Cash flow timeline (cumulative net by month)
  const cfTimeline=useMemo(()=>{const sorted=[...stmts].sort((a,b)=>a.year*100+a.month-b.year*100-b.month);let cum=0;return sorted.map(s=>{cum+=s.net||0;return{period:M[s.month-1]+' '+String(s.year).slice(2),net:s.net||0,cumulative:cum}})},[stmts]);

  // Filter out years with < 6 months of data (except current year) for charts
  const curYear=new Date().getFullYear();
  const relAnnual=useMemo(()=>annual.filter(y=>y.n>=6||y.year===curYear),[annual,curYear]);
  const relMonthly=useMemo(()=>{const r={};Object.keys(monthly).forEach(y=>{const yr=parseInt(y);const a=annual.find(x=>x.year===yr);if(a&&(a.n>=6||yr===curYear))r[y]=monthly[y]});return r},[monthly,annual,curYear]);

  const mortCalc=useCallback((exMonth=0,exAnnual=0)=>{if(!mort.balance||!mort.rate||!mort.monthlyPayment)return[];let b=mort.balance;const mr=mort.rate/100/12;const sc=[];let ti=0;for(let i=1;i<=mort.termYears*12&&b>0;i++){const int=b*mr;let extra=exMonth;if(i%12===0)extra+=exAnnual;const pr=Math.min(mort.monthlyPayment-int+extra,b);b=Math.max(0,b-pr);ti+=int;if(i%12===0||b===0)sc.push({yr:Math.ceil(i/12),mo:i,bal:b,ti})}return sc},[mort]);
  const sNE=useMemo(()=>mortCalc(0,0),[mortCalc]);
  const sE=useMemo(()=>mortCalc(parseFloat(extraP)||0,parseFloat(extraPA)||0),[mortCalc,extraP,extraPA]);

  const pN=id=>partners.find(p=>p.id===id)?.name||id;const pCl=id=>partners.find(p=>p.id===id)?.color||'#94a3b8';
  const nav=[{id:'dashboard',icon:<Home size={18}/>,l:'Dashboard'},{id:'partners',icon:<Users size={18}/>,l:'Socios & Capital'},{id:'statements',icon:<ClipboardList size={18}/>,l:'Statements'},{id:'expenses',icon:<Receipt size={18}/>,l:'Gastos'},{id:'income',icon:<DollarSign size={18}/>,l:'Ingresos'},{id:'mortgage',icon:<Landmark size={18}/>,l:'Hipoteca'},{id:'repairs',icon:<Wrench size={18}/>,l:'Reparaciones'},{id:'valuation',icon:<TrendingUp size={18}/>,l:'Valorización'},{id:'pipeline',icon:<Clock size={18}/>,l:'Obligaciones'},{id:'reports',icon:<Target size={18}/>,l:'Reportes'},{id:'support',icon:<MessageSquare size={18}/>,l:'Soporte'},{id:'settings',icon:<Settings size={18}/>,l:'Configuración'}];

  if(loading)return<div className="min-h-screen bg-slate-50">
    <div className="md:hidden fixed top-0 left-0 right-0 bg-white/95 border-b border-slate-200 z-40 px-3 py-3 flex items-center gap-3"><div className="w-8 h-8 bg-slate-200 rounded-xl animate-pulse"/><div className="flex-1"><div className="h-4 bg-slate-200 rounded-lg w-32 animate-pulse"/><div className="h-2.5 bg-slate-100 rounded w-20 mt-1.5 animate-pulse"/></div></div>
    <div className="flex"><div className="hidden md:block w-60 bg-white border-r border-slate-100 h-screen p-4"><div className="h-10 bg-slate-200 rounded-xl mb-4 animate-pulse"/><div className="space-y-2">{Array(8).fill(0).map((_,i)=><div key={i} className="h-9 bg-slate-100 rounded-xl animate-pulse" style={{animationDelay:i*80+'ms'}}/>)}</div></div>
    <div className="flex-1 p-3 md:p-6 pt-[72px] md:pt-6"><div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">{Array(5).fill(0).map((_,i)=><div key={i} className="bg-white rounded-2xl p-4 border border-slate-200 animate-pulse" style={{animationDelay:i*100+'ms'}}><div className="h-2.5 bg-slate-200 rounded w-16 mb-3"/><div className="h-6 bg-slate-200 rounded w-24 mb-2"/><div className="h-2 bg-slate-100 rounded w-20"/></div>)}</div>
    <div className="grid grid-cols-1 md:grid-cols-12 gap-4"><div className="md:col-span-7 bg-white rounded-2xl p-5 border border-slate-200 h-64 animate-pulse"/><div className="md:col-span-5 bg-white rounded-2xl p-5 border border-slate-200 h-64 animate-pulse" style={{animationDelay:'200ms'}}/></div></div></div>
  </div>;
  const ctx={propertyId,prop,allProperties,onSwitchProperty,onLogout,onAddProperty,userEmail,isAdmin,plan,canUse,view,setView,modal,setModal,editId,setEditId,mobileNav,setMobileNav,dark,setDark,stmts,expenses,income,contribs,valuations,repairs,tasks,tickets,partners,mort,annual,revenue,stmtNet:stmts.reduce((s,x)=>s+(x.net||0),0),stmtComm:stmts.reduce((s,x)=>s+(x.commission||0),0),totNet:income.reduce((s,i)=>s+(i.netAmount||0),0),totCont:contribs.reduce((s,c)=>s+(c.amount||0),0)+(partners||[]).reduce((s,p)=>s+(p.initialCapital||0),0),marketValue,realEquity,realLTV,appreciation,latestVal,pt,fixedExp,additionalExp,expByCat,dashYear,setDashYear,stmtPage,setStmtPage,stmtYearFilter,setStmtYearFilter,rptTab,setRptTab,uploadLog,setUploadLog,toast,setToast,loading,expenseForm,ue,contribForm,uc,stmtForm,us,valForm,uv,repairForm,ur,taskForm,ut,mortConfig,umc,savingMort,ticketForm,setTicketForm,settingsForm,setSettingsForm,editPartners,setEditPartners,save,update,del,handlePDFs,saveMortgage,markPaid,notify,propCountry,propCurrency,propCats,propTerms,fmP,COUNTRIES,CURRENCY_LIST,M,fm,fmCurrency,fmDate,pct,CATS,US,PT,C,PER_PAGE};
  return <DashboardContext.Provider value={ctx}><div className="min-h-screen bg-[#F8FAFC] flex">
    {/* MOBILE HEADER */}
    <div className="md:hidden fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-b border-slate-200 z-40 px-3 py-2.5 flex items-center gap-3">
      <button onClick={()=>setMobileNav(true)} aria-label="Abrir menú" className="p-2 hover:bg-slate-100 rounded-xl active:bg-slate-200 transition"><Menu size={20} className="text-slate-600"/></button>
      <div className="flex-1 min-w-0"><div className="text-sm font-extrabold text-slate-800 truncate">{prop.name||'OwnerDesk'}</div><div className="text-[10px] text-slate-400 truncate">{prop.city} {prop.state}</div></div>
      <button onClick={()=>{setUploadLog([]);setModal('upload')}} className="p-2 bg-blue-600 text-white rounded-xl active:bg-blue-700 transition" aria-label="Subir statements"><Upload size={16}/></button>
    </div>

    {/* SIDEBAR — hidden on mobile, overlay when open */}
    {mobileNav&&<div className="md:hidden fixed inset-0 bg-black/40 z-50" onClick={()=>setMobileNav(false)}/>}
    <div className={`fixed md:relative z-50 md:z-auto h-full transition-transform duration-300 ${mobileNav?'translate-x-0':'-translate-x-full md:translate-x-0'} w-60 bg-white border-r border-slate-100 flex flex-col shrink-0`}>
      <div className="p-4 border-b border-slate-100">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3"><div className="w-10 h-10 bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 rounded-xl flex items-center justify-center shadow-md shadow-blue-600/20"><span className="text-xs font-black text-white tracking-tighter">OD</span></div><div className="min-w-0"><div className="text-sm font-extrabold text-slate-800 truncate">Owner<span className="text-blue-600">Desk</span></div><div className="text-[10px] text-slate-400 truncate">{userEmail}</div>{isAdmin?<div className="text-[9px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full inline-block mt-1">OWNER · PRO ∞</div>:<div className={`text-[9px] font-bold px-2 py-0.5 rounded-full inline-block mt-1 ${plan==='pro'?'text-purple-600 bg-purple-50':plan==='starter'?'text-blue-600 bg-blue-50':'text-slate-500 bg-slate-100'}`}>{plan==='pro'?'PRO':plan==='starter'?'STARTER':'FREE'}</div>}</div></div>
          <button onClick={()=>setMobileNav(false)} aria-label="Cerrar menú" className="md:hidden p-1 hover:bg-slate-100 rounded-lg"><X size={18} className="text-slate-400"/></button>
        </div>
        {allProperties.length>0&&<div className="relative"><select value={propertyId} onChange={e=>onSwitchProperty(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none appearance-none pr-8 cursor-pointer hover:bg-slate-100">{allProperties.map(p=><option key={p.id} value={p.id}>{p.name||'Sin nombre'}</option>)}</select><ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/></div>}
        {onAddProperty&&<button onClick={onAddProperty} className="w-full mt-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-xl text-[11px] font-bold hover:bg-blue-100 transition flex items-center justify-center gap-1"><Plus size={13}/>Agregar Propiedad</button>}
      </div>
      <nav role="navigation" aria-label="Módulos" className="flex-1 p-3 space-y-0.5 overflow-y-auto">{nav.map(n=><button key={n.id} onClick={()=>{setView(n.id);setMobileNav(false)}} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-[13px] transition-all ${view===n.id?'bg-blue-50 text-blue-700 font-bold':'text-slate-500 hover:bg-slate-50 hover:text-slate-700 font-medium'}`}>{n.icon}{n.l}</button>)}</nav>
      <div className="p-3 border-t border-slate-100 space-y-1">
        <button onClick={()=>setDark(!dark)} className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-slate-400 hover:text-blue-600 rounded-xl hover:bg-blue-50 transition font-medium">{dark?<Sun size={16}/>:<Moon size={16}/>}{dark?'Modo Claro':'Modo Oscuro'}</button>
        <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 transition font-medium"><LogOut size={16}/>Cerrar Sesión</button>
      </div>
    </div>

    <div className="flex-1 overflow-auto overflow-x-hidden" role="main"><div className="p-3 md:p-6 pt-[72px] md:pt-6 max-w-[1200px] lg:mx-auto"><ViewGuard>

    {/* ═══ DASHBOARD VIEW ═══ */}
    {view==='dashboard'&&(()=>{try{
      const isOwnerManaged=prop.managedBy==='owner';
      const fy=dashYear==='all'?null:annual.find(y=>y.year===dashYear);
      const fStmts=dashYear==='all'?stmts:stmts.filter(s=>s.year===dashYear);
      const n=fy?fy.n:(stmts.length||0);
      const fRev=fy?fy.revenue:(revenue||0);
      const fNet=fy?fy.net:((stmtNet||totNet)||0);
      const fComm=isOwnerManaged?0:(fy?(fy.commission||0):(stmtComm||0));
      const fDuke=fy?(fy.duke||0):(stmtDuke||0);
      const fHoa=fy?(fy.hoa||0):(stmtHoa||0);
      const fMaint=fy?(fy.maintenance||0):(stmtMaint||0);
      const fWater=fy?(fy.water||0):(stmtWater||0);
      const fVendor=fy?(fy.vendor||0):(stmtVendor||0);
      const fOpEx=fComm+fDuke+fHoa+fMaint+fWater+fVendor;

      // Currency conversion helper
      const xRate=prop.exchangeRate||1;
      const toPC=(amt,cur)=>{
        if(!cur||cur===propCurrency)return amt;
        if(cur==='USD'&&propCurrency!=='USD')return amt*xRate;
        if(cur!=='USD'&&propCurrency==='USD')return amt/xRate;
        return amt;
      };

      // Owner expenses — filter by year if needed, convert currency
      const yearExpenses=dashYear==='all'?expenses:expenses.filter(e=>(e.date||'').startsWith(String(dashYear)));
      const ownerExpTotal=yearExpenses.reduce((s,e)=>{
        const raw=e.amount||0;
        const amt=toPC(raw,e.expCurrency);
        if(e.frequency==='annual')return s+amt/12*(n||1);
        if(e.frequency==='monthly')return s+amt*(n||1);
        return s+amt;
      },0);

      const fNoi=isOwnerManaged?(fRev-ownerExpTotal):(fRev-fOpEx);
      const mMort=mort.monthlyPayment||0;
      const fMortP=mMort*n;
      const insExp=isOwnerManaged?0:yearExpenses.filter(e=>e.category==='insurance').reduce((s,e)=>s+((e.amount||0)),0);
      const taxExp=isOwnerManaged?0:yearExpenses.filter(e=>e.category==='taxes').reduce((s,e)=>s+((e.amount||0)),0);
      const ownerCosts=fMortP+(isOwnerManaged?0:insExp+taxExp+ownerExpTotal);
      const fCF=isOwnerManaged?(fNoi-fMortP):(fNoi-ownerCosts);
      const fCFmo=n>0?fCF/n:0;
      const partial=n>0&&n<12;
      const proyAnual=partial&&n>0?(fCF/n)*12:fCF;
      const fMargin=fRev>0?(fNoi/fRev*100):0;
      const noiAnual=partial&&n>0?fNoi/n*12:fNoi;
      const fCapR=marketValue>0?(noiAnual/marketValue*100):0;
      const fCoc=totCont>0?(proyAnual/totCont*100):0;
      const fDscr=mMort>0?(noiAnual/(mMort*12)):0;
      const fNights=fy?(fy.nights||0):fStmts.reduce((s,x)=>s+(x.nights||0),0);
      const fRes=fy?(fy.reservations||0):fStmts.reduce((s,x)=>s+(x.reservations||0),0);
      const availNights=n*30;
      const occupancy=availNights>0&&fNights>0?(fNights/availNights*100):0;
      const adr=fNights>0?fRev/fNights:(n>0?fRev/(n*30):0);
      const revpar=availNights>0?fRev/availNights:0;
      const prevYr=dashYear!=='all'?annual.find(y=>y.year===dashYear-1):null;
      const revChg=prevYr&&prevYr.revenue?((fRev-prevYr.revenue)/prevYr.revenue*100):null;
      const expData=isOwnerManaged?
        [['Gastos Propietario',ownerExpTotal,'#E11D48']].filter(([_,v])=>v>0).map(([name,value,fill])=>({name,value,fill})):
        [['Comisión',fComm,'#E11D48'],['Electricidad',fDuke,'#F59E0B'],['Agua',fWater,'#06B6D4'],['HOA',fHoa,'#8B5CF6'],['Mantenimiento',fMaint,'#10B981'],['Otros',fVendor,'#64748B']].filter(([_,v])=>v>0).map(([name,value,fill])=>({name,value,fill}));
      const mChart=[...fStmts].sort((a,b)=>a.year*100+a.month-b.year*100-b.month).map(s=>({m:M[s.month-1]+(dashYear==='all'?'\''+String(s.year).slice(2):''),rev:s.revenue||0,net:s.net||0,libre:(s.net||0)-mMort}));

      return <>
      <div className="hidden print-header"><div style={{display:'flex',justifyContent:'space-between'}}><div><h1 style={{fontSize:'18px',fontWeight:800,margin:0}}>{prop.name}</h1><p style={{fontSize:'9px',color:'#64748B',margin:'3px 0'}}>{prop.address}, {prop.city} {prop.state} · {new Date().toLocaleDateString('es',{day:'2-digit',month:'long',year:'numeric'})}</p></div><div style={{fontSize:'18px',fontWeight:900,color:'#1E3A5F'}}>OD</div></div></div>

      <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-3 mb-4 no-print">
        <div className="hidden md:block"><h1 className="text-lg md:text-xl font-extrabold text-slate-800">{prop.name}</h1><p className="text-xs text-slate-400 mt-0.5">{prop.address}, {prop.city} {prop.state}</p></div>
        <div className="flex gap-2">
          <button onClick={()=>window.print()} aria-label="Imprimir" className="hidden md:flex px-3 py-2 bg-slate-100 text-slate-500 text-xs rounded-xl font-bold hover:bg-slate-200 items-center gap-1.5"><Printer size={13}/></button>
          <button onClick={()=>{setExpenseForm({date:'',concept:'',amount:'',paidBy:partners[0]?.id||'',category:'otros',type:'additional',frequency:'once',expCurrency:''});setModal('expense')}} className="flex-1 md:flex-none px-4 py-3 md:py-2 bg-slate-700 text-white text-xs rounded-xl font-bold hover:bg-slate-800 active:bg-slate-900 flex items-center justify-center gap-1.5 shadow-sm"><Plus size={14}/> Gasto</button>
          <button onClick={()=>{setUploadLog([]);setModal('upload')}} className="flex-1 md:flex-none px-4 py-3 md:py-2 bg-blue-600 text-white text-xs rounded-xl font-bold hover:bg-blue-700 active:bg-blue-800 flex items-center justify-center gap-1.5 shadow-sm"><Upload size={14}/> Statements</button>
        </div>
      </div>

      {annual.length>0&&<div className="flex items-center gap-1.5 mb-4 no-print overflow-x-auto pb-1">
        <button onClick={()=>setDashYear('all')} className={`px-3.5 py-2 rounded-xl text-xs font-bold transition ${dashYear==='all'?'bg-slate-800 text-white':'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'}`}>Acumulado</button>
        {annual.map(y=><button key={y.year} onClick={()=>setDashYear(y.year)} className={`px-3.5 py-2 rounded-xl text-xs font-bold transition ${dashYear===y.year?'bg-slate-800 text-white':'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'}`}>{y.year}{y.n<12?` (${y.n}m)`:''}</button>)}
      </div>}

      {fRev>0?<>
      {/* ── ROW 1: Key Performance Indicators ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 md:gap-3 mb-5">
        <div className="bg-white rounded-2xl p-3 md:p-4 border-l-4 border-l-blue-500 border border-slate-200 shadow-sm">
          <div className="text-[10px] md:text-[9px] font-bold text-blue-500 uppercase tracking-widest">Ingreso Bruto</div>
          <div className="text-base md:text-[22px] font-extrabold text-slate-800 mt-0.5">{fm(fRev)}</div>
          <div className="text-[11px] md:text-[10px] text-slate-400 mt-0.5">{n} meses</div>
          {revChg!==null&&<div className={`text-[11px] md:text-[10px] font-bold mt-0.5 ${revChg>=0?'text-emerald-600':'text-rose-500'}`}>{revChg>=0?'▲':'▼'} {Math.abs(revChg).toFixed(0)}% YoY</div>}
        </div>
        <div className="bg-white rounded-2xl p-3 md:p-4 border-l-4 border-l-emerald-500 border border-slate-200 shadow-sm">
          <div className="text-[10px] md:text-[9px] font-bold text-emerald-600 uppercase tracking-widest">Ingreso Neto</div>
          <div className="text-base md:text-[22px] font-extrabold text-emerald-700 mt-0.5">{fm(fNet)}</div>
          <div className="text-[11px] md:text-[10px] text-slate-400 mt-0.5">Margen: <b className={fMargin>50?'text-emerald-600':fMargin>40?'text-amber-500':'text-rose-500'}>{fMargin.toFixed(0)}%</b></div>
        </div>
        <div className={`bg-white rounded-2xl p-3 md:p-4 border-l-4 border border-slate-200 shadow-sm ${fCF>=0?'border-l-emerald-500':'border-l-rose-500'}`}>
          <div className="text-[10px] md:text-[9px] font-bold text-slate-500 uppercase tracking-widest">Cash Flow</div>
          <div className={`text-base md:text-[22px] font-extrabold mt-0.5 ${fCF>=0?'text-emerald-700':'text-rose-600'}`}>{fm(fCF)}</div>
          <div className={`text-[11px] md:text-[10px] mt-0.5 ${fCF>=0?'text-emerald-500':'text-rose-400'}`}>{fm(fCFmo)}/mo</div>
        </div>
        <div className="bg-white rounded-2xl p-3 md:p-4 border-l-4 border-l-blue-400 border border-slate-200 shadow-sm">
          <div className="text-[10px] md:text-[9px] font-bold text-blue-500 uppercase tracking-widest">Ocupación</div>
          <div className="text-base md:text-[22px] font-extrabold text-slate-800 mt-0.5">{fNights>0?occupancy.toFixed(0)+'%':'—'}</div>
          <div className="text-[11px] md:text-[10px] text-slate-400 mt-0.5">{fNights>0?`${fNights} noches`:'Sin datos'}</div>
          {fNights>0&&<div className="text-[11px] md:text-[10px] text-slate-500 mt-0.5">ADR: <b className="text-blue-600">{fm(adr)}</b></div>}
        </div>
        <div className="bg-white rounded-2xl p-3 md:p-4 border-l-4 border-l-purple-500 border border-slate-200 shadow-sm">
          <div className="text-[10px] md:text-[9px] font-bold text-purple-600 uppercase tracking-widest">Retorno CoC{partial?' (ann.)':''}</div>
          <div className={`text-base md:text-[22px] font-extrabold mt-0.5 ${fCoc>8?'text-emerald-700':fCoc>4?'text-amber-600':'text-rose-600'}`}>{fCoc.toFixed(1)}%</div>
          <div className="text-[11px] md:text-[10px] text-slate-500 mt-0.5">Capital: {fm(totCont)}</div>
        </div>
      </div>

      {/* ── ROW 2: Visual P&L Cascade + Metrics ── */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-4">
        <div className="col-span-1 md:col-span-7 bg-white rounded-2xl p-3 md:p-5 border border-slate-200 shadow-sm overflow-hidden">
          <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-4">Radiografía de Costos{partial?` (${n} meses)`:''}</h3>
          <div className="space-y-1.5">
            <div className="rounded-lg relative overflow-hidden" style={{height:"34px"}}><div className="absolute inset-0 bg-blue-500"/><div className="absolute inset-0 flex items-center justify-between px-2 md:px-4 overflow-hidden"><span className="text-[10px] md:text-[11px] font-bold text-white truncate">Ingreso Bruto</span><span className="text-[12px] font-extrabold text-white">{fm(fRev)}</span></div></div>

            {isOwnerManaged?<>
              <div className="pl-2 text-[9px] font-bold text-slate-300 uppercase tracking-widest py-0.5">Gastos del Propietario</div>
              {expByCat.map(c=><div key={c.name} className="rounded-lg bg-slate-50 relative overflow-hidden" style={{height:'28px'}}><div className="absolute inset-y-0 left-0 bg-rose-400 opacity-75" style={{width:Math.max(2,(c.value||0)/fRev*100)+'%'}}/><div className="absolute inset-0 flex items-center justify-between px-2 md:px-4 overflow-hidden"><span className="text-[9px] md:text-[10px] text-slate-600 truncate">{c.name}</span><span className="text-[9px] md:text-[10px] font-bold text-slate-700 whitespace-nowrap">{fm(c.value)} <span className="text-slate-400">({(c.value/fRev*100).toFixed(0)}%)</span></span></div></div>)}
            </>:<>
              <div className="pl-2 text-[9px] font-bold text-slate-300 uppercase tracking-widest py-0.5">Gastos Operativos (descuenta el administrador)</div>
              {[[`Comisión PM (${prop.managerCommission||15}%)`,fComm,'bg-rose-400'],['Electricidad',fDuke,'bg-amber-400'],['Agua',fWater,'bg-cyan-400'],[propTerms.hoa,fHoa,'bg-purple-400'],['Mantenimiento',fMaint,'bg-teal-400'],['Vendor / Otros',fVendor,'bg-slate-400']].filter(([_,v])=>v>0).map(([l,v,bg])=>
                <div key={l} className="rounded-lg bg-slate-50 relative overflow-hidden" style={{height:'28px'}}><div className={`absolute inset-y-0 left-0 ${bg} opacity-75`} style={{width:Math.max(2,v/fRev*100)+'%'}}/><div className="absolute inset-0 flex items-center justify-between px-2 md:px-4 overflow-hidden"><span className="text-[9px] md:text-[10px] text-slate-600 truncate">{l}</span><span className="text-[9px] md:text-[10px] font-bold text-slate-700 whitespace-nowrap">{fm(v)} <span className="text-slate-400">({(v/fRev*100).toFixed(0)}%)</span></span></div></div>
              )}
            </>}

            <div className="rounded-lg relative overflow-hidden mt-1" style={{height:'34px'}}><div className="absolute inset-y-0 left-0 bg-emerald-500" style={{width:Math.max(2,fNoi>0?fNoi/fRev*100:0)+'%'}}/><div className="absolute inset-0 flex items-center justify-between px-2 md:px-4 overflow-hidden bg-emerald-50"><span className="text-[9px] md:text-[11px] font-bold text-emerald-800 truncate">= NOI <span className="text-[9px] font-normal">(Ingreso Operativo Neto)</span></span><span className="text-[12px] font-extrabold text-emerald-800">{fm(fNoi)} <span className="text-emerald-600 text-[10px]">{(fRev>0?(fNoi/fRev*100):0).toFixed(0)}%</span></span></div></div>

            {/* Mortgage */}
            {fMortP>0&&<>
              <div className="pl-2 text-[9px] font-bold text-slate-300 uppercase tracking-widest py-0.5 mt-1">Hipoteca</div>
              <div className="rounded-lg bg-slate-50 relative overflow-hidden" style={{height:'28px'}}><div className="absolute inset-y-0 left-0 bg-red-400 opacity-75" style={{width:Math.max(2,fMortP/fRev*100)+'%'}}/><div className="absolute inset-0 flex items-center justify-between px-2 md:px-4 overflow-hidden"><span className="text-[9px] md:text-[10px] text-slate-600 truncate">Hipoteca ({fm(mMort)}/mo × {n}m)</span><span className="text-[10px] font-bold text-slate-700">{fm(fMortP)} <span className="text-slate-400">({(fMortP/fRev*100).toFixed(0)}%)</span></span></div></div>
            </>}

            {/* Owner costs for PM-managed only */}
            {!isOwnerManaged&&(insExp>0||taxExp>0)&&<>
              <div className="pl-2 text-[9px] font-bold text-slate-300 uppercase tracking-widest py-0.5 mt-1">Gastos del Propietario</div>
              {insExp>0&&<div className="rounded-lg bg-slate-50 relative overflow-hidden" style={{height:'28px'}}><div className="absolute inset-y-0 left-0 bg-orange-400 opacity-75" style={{width:Math.max(2,insExp/fRev*100)+'%'}}/><div className="absolute inset-0 flex items-center justify-between px-2 md:px-4 overflow-hidden"><span className="text-[10px] text-slate-600">Seguro</span><span className="text-[10px] font-bold text-slate-700">{fm(insExp)}</span></div></div>}
              {taxExp>0&&<div className="rounded-lg bg-slate-50 relative overflow-hidden" style={{height:'28px'}}><div className="absolute inset-y-0 left-0 bg-violet-400 opacity-75" style={{width:Math.max(2,taxExp/fRev*100)+'%'}}/><div className="absolute inset-0 flex items-center justify-between px-2 md:px-4 overflow-hidden"><span className="text-[10px] text-slate-600">Impuestos</span><span className="text-[10px] font-bold text-slate-700">{fm(taxExp)}</span></div></div>}
            </>}

            {/* Cash Flow */}
            <div className={`rounded-lg relative overflow-hidden border-2 mt-1 ${fCF>=0?'border-emerald-300 bg-emerald-50':'border-rose-300 bg-rose-50'}`} style={{height:'40px'}}>
              <div className={`absolute inset-y-0 left-0 ${fCF>=0?'bg-emerald-500':'bg-rose-500'}`} style={{width:Math.max(2,Math.abs(fCF)/fRev*100)+'%'}}/>
              <div className="absolute inset-0 flex items-center justify-between px-2 md:px-4 overflow-hidden">
                <span className={`text-[11px] font-extrabold ${fCF>=0?'text-emerald-800':'text-rose-800'}`}>= Cash Flow Neto</span>
                <span className={`text-[13px] font-black ${fCF>=0?'text-emerald-700':'text-rose-700'}`}>{fm(fCF)}</span>
              </div>
            </div>
            {partial&&<div className="text-center text-[10px] text-slate-400 bg-slate-50 rounded py-1.5 mt-1">Periodo parcial ({n} meses) · Proyección anualizada: <b>{fm(proyAnual)}</b></div>}
          </div>
        </div>

        {/* Right: Property + Metrics + Health */}
        <div className="col-span-1 md:col-span-5 space-y-3">
          <div className="bg-white rounded-2xl p-3 md:p-4 border border-slate-200 shadow-sm overflow-hidden">
            <h3 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2.5">Propiedad & Patrimonio</h3>
            <div className="space-y-2">
              <div className="flex justify-between"><span className="text-[11px] text-slate-400">Valor de Mercado</span><span className="text-[11px] font-extrabold text-slate-800">{fm(marketValue)}</span></div>
              <div className="flex justify-between"><span className="text-[11px] text-slate-400">Precio de Compra</span><span className="text-[11px] font-bold text-slate-500">{fm(prop.purchasePrice)}</span></div>
              {appreciation!==0&&<div className="flex justify-between"><span className="text-[11px] text-slate-400">Valorización</span><span className={`text-[11px] font-bold ${appreciation>0?'text-emerald-600':'text-rose-500'}`}>{appreciation>0?'+':''}{appreciation.toFixed(1)}% ({fm(marketValue-prop.purchasePrice)})</span></div>}
              <div className="border-t border-slate-100 my-0.5"/>
              <div className="flex justify-between"><span className="text-[11px] text-slate-400">Equity</span><span className="text-[11px] font-extrabold text-emerald-600">{fm(realEquity)}</span></div>
              {mort.balance>0&&<div className="flex justify-between"><span className="text-[11px] text-slate-400">Deuda Hipoteca</span><span className="text-[11px] font-bold text-slate-500">{fm(mort.balance)} <span className="text-slate-400">· LTV {realLTV.toFixed(0)}%</span></span></div>}
            </div>
          </div>
          <div className="bg-white rounded-2xl p-3 md:p-4 border border-slate-200 shadow-sm overflow-hidden">
            <h3 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2.5">Rendimiento STR{partial?' (proy.)':''}</h3>
            <div className="space-y-2">
              {fNights>0&&<div className="flex justify-between"><span className="text-[11px] text-slate-400 truncate">Noches Ocupadas</span><span className="text-[11px] font-bold text-slate-700">{fNights} de {availNights} <span className="text-slate-400">({occupancy.toFixed(0)}%)</span></span></div>}
              {fNights>0&&<div className="flex justify-between"><span className="text-[11px] text-slate-400">ADR <span className="text-[9px] text-slate-300">(Tarifa Promedio/Noche)</span></span><span className="text-[11px] font-bold text-blue-600">{fm(adr)}</span></div>}
              {fNights>0&&<div className="flex justify-between"><span className="text-[11px] text-slate-400">RevPAR <span className="text-[9px] text-slate-300">(Ingreso/Noche Disponible)</span></span><span className={`text-[11px] font-bold ${revpar>100?'text-emerald-600':'text-amber-500'}`}>{fm(revpar)}</span></div>}
              {fRes>0&&<div className="flex justify-between"><span className="text-[11px] text-slate-400">Reservaciones</span><span className="text-[11px] font-bold text-slate-700">{fRes} <span className="text-slate-400">({(fNights/fRes).toFixed(1)} noches prom.)</span></span></div>}
              <div className="border-t border-slate-100 my-0.5"/>
              <div className="flex justify-between"><span className="text-[11px] text-slate-400">Cap Rate</span><span className={`text-[11px] font-bold ${fCapR>6?'text-emerald-600':fCapR>4?'text-amber-500':'text-rose-500'}`}>{fCapR.toFixed(2)}%</span></div>
              <div className="flex justify-between"><span className="text-[11px] text-slate-400">Retorno CoC</span><span className={`text-[11px] font-bold ${fCoc>8?'text-emerald-600':fCoc>4?'text-amber-500':'text-rose-500'}`}>{fCoc.toFixed(1)}%</span></div>
              {fDscr>0&&<div className="flex justify-between"><span className="text-[11px] text-slate-400">DSCR <span className="text-[9px] text-slate-300">(Cobertura de Deuda)</span></span><span className={`text-[11px] font-bold ${fDscr>1.25?'text-emerald-600':fDscr>1?'text-amber-500':'text-rose-500'}`}>{fDscr.toFixed(2)}x</span></div>}
              <div className="flex justify-between"><span className="text-[11px] text-slate-400">Ratio de Gastos</span><span className={`text-[11px] font-bold ${fOpEx/fRev<0.5?'text-emerald-600':fOpEx/fRev<0.6?'text-amber-500':'text-rose-500'}`}>{(fOpEx/fRev*100).toFixed(0)}%</span></div>
              <div className="flex justify-between"><span className="text-[11px] text-slate-400">Capital Invertido</span><span className="text-[11px] font-bold text-slate-700">{fm(totCont)}</span></div>
            </div>
          </div>
          {/* Health indicator */}
          <div className={`rounded-2xl p-3 border ${fCF>=0&&fNoi/fRev>0.4?'bg-emerald-50 border-emerald-200':fCF<0?'bg-rose-50 border-rose-200':'bg-amber-50 border-amber-200'}`}>
            <div className="flex items-center gap-2 mb-1.5">
              {fCF>=0&&fNoi/fRev>0.4?<CheckCircle size={15} className="text-emerald-500"/>:<AlertTriangle size={15} className={fCF<0?'text-rose-500':'text-amber-500'}/>}
              <span className={`text-[10px] font-bold uppercase ${fCF>=0&&fNoi/fRev>0.4?'text-emerald-700':fCF<0?'text-rose-700':'text-amber-700'}`}>{fCF>=0&&fNoi/fRev>0.4?'Inversión Saludable':fCF<0?'Requiere Atención':'En Observación'}</span>
            </div>
            <div className="space-y-1 text-[10px] text-slate-600">
              {occupancy>0&&<div className="flex items-center gap-1.5"><div className={`w-1.5 h-1.5 rounded-full ${occupancy>70?'bg-emerald-500':occupancy>50?'bg-amber-500':'bg-rose-500'}`}/>{occupancy.toFixed(0)}% ocupación ({fNights} noches)</div>}
              <div className="flex items-center gap-1.5"><div className={`w-1.5 h-1.5 rounded-full ${fNoi/fRev>0.5?'bg-emerald-500':fNoi/fRev>0.4?'bg-amber-500':'bg-rose-500'}`}/>{(fNoi/fRev*100).toFixed(0)}% margen operativo</div>
              {fDscr>0&&<div className="flex items-center gap-1.5"><div className={`w-1.5 h-1.5 rounded-full ${fDscr>1.25?'bg-emerald-500':fDscr>1?'bg-amber-500':'bg-rose-500'}`}/>{fDscr.toFixed(2)}x cobertura de deuda</div>}
              {revChg!==null&&<div className="flex items-center gap-1.5"><div className={`w-1.5 h-1.5 rounded-full ${revChg>=0?'bg-emerald-500':'bg-rose-500'}`}/>{revChg>=0?'+':''}{revChg.toFixed(0)}% ingreso vs año anterior</div>}
            </div>
          </div>
        </div>
      </div>

      {/* ── Obligaciones — smart alerts ── */}
      {(()=>{
        if(!tasks.length)return null;
        const today=new Date();today.setHours(0,0,0,0);
        const alerts=tasks.filter(t=>t.payer!=='pm'&&t.status!=='done'&&t.dueDate).map(t=>{
          const due=new Date(t.dueDate+'T00:00:00');
          const days=Math.ceil((due-today)/(1000*60*60*24));
          const threshold=parseInt(t.reminderDays)||( t.frequency==='monthly'?5:30);
          if(days<0)return {...t,days,level:'overdue'};
          if(days<=threshold)return {...t,days,level:'soon'};
          return null;
        }).filter(Boolean).sort((a,b)=>a.days-b.days);
        if(!alerts.length)return null;
        return <div className="space-y-2 mb-4">{alerts.map(a=><div key={a.id} onClick={()=>setView('pipeline')} className={`rounded-2xl p-3 border flex items-center gap-3 cursor-pointer transition ${a.level==='overdue'?'bg-rose-50 border-rose-200 hover:bg-rose-100':'bg-amber-50 border-amber-200 hover:bg-amber-100'}`}>
          <span className="text-lg shrink-0">{a.level==='overdue'?'🚨':'⏰'}</span>
          <div className="flex-1 min-w-0">
            <div className={`text-xs font-bold ${a.level==='overdue'?'text-rose-700':'text-amber-700'}`}>{a.title}{a.amount?' · '+fm(parseFloat(a.amount)):''}</div>
            <div className={`text-[10px] ${a.level==='overdue'?'text-rose-500':'text-amber-500'}`}>{a.days<0?`Vencido hace ${Math.abs(a.days)} día${Math.abs(a.days)>1?'s':''}`:`Vence en ${a.days} día${a.days>1?'s':''}`} · {fmDate(a.dueDate)}</div>
          </div>
          <button onClick={e=>{e.stopPropagation();markPaid(a)}} className={`px-3 py-1.5 rounded-xl text-[11px] font-bold shrink-0 transition ${a.level==='overdue'?'bg-rose-200 text-rose-700 hover:bg-rose-300':'bg-amber-200 text-amber-700 hover:bg-amber-300'}`}>Pagado ✓</button>
        </div>)}</div>;
      })()}

      {/* ── ROW 3: INSIGHTS — What the data tells you ── */}      {n>=2&&(canUse('insights')?<div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-4">
        {/* Smart Insights */}
        <div className="col-span-1 md:col-span-8 bg-white rounded-2xl p-3 md:p-5 border border-slate-200 shadow-sm overflow-hidden">
          <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">Insights & Recomendaciones</h3>
          <div className="space-y-2">
            {(()=>{
              const insights=[];
              const avgRevMo=n>0?fRev/n:0;
              const avgNetMo=n>0?fNet/n:0;
              const breakEvenNights=adr>0?Math.ceil((fOpEx+ownerCosts)/Math.max(n,1)/adr):0;
              const monthlyMort=mMort;
              const monthlyOwnerCost=(ownerCosts)/Math.max(n,1);
              const monthlyOpEx=fOpEx/Math.max(n,1);
              const avgNightsMo=fNights>0?Math.round(fNights/n):0;
              
              // Break-even
              if(adr>0&&breakEvenNights>0) insights.push({
                type:breakEvenNights>25?'danger':breakEvenNights>20?'warn':'good',
                icon:breakEvenNights>25?'🚨':breakEvenNights>20?'⚠️':'✅',
                title:`Punto de equilibrio: ${breakEvenNights} noches/mes`,
                desc:breakEvenNights>avgNightsMo?`Necesitas ${breakEvenNights} noches para cubrir costos pero promedias ${avgNightsMo}. Déficit de ${breakEvenNights-avgNightsMo} noches.`:`Cubres costos con ${breakEvenNights} noches y promedias ${avgNightsMo}. Margen de ${avgNightsMo-breakEvenNights} noches.`
              });

              // Cash Flow health
              if(fCF<0) insights.push({type:'danger',icon:'🔴',title:`Cash flow negativo: ${fm(fCF)}`,desc:`La propiedad no cubre sus costos. La hipoteca (${fm(fMortP)}) consume ${fRev>0?(fMortP/fRev*100).toFixed(0):0}% del ingreso bruto. ${monthlyMort>avgNetMo?'El pago mensual de hipoteca es mayor que lo que deposita el PM.':'Considera refinanciar o aumentar tarifas.'}`});
              else if(fCF>0&&fCFmo<500) insights.push({type:'warn',icon:'🟡',title:`Cash flow ajustado: ${fm(fCFmo)}/mes`,desc:'Cualquier reparación mayor o mes de baja ocupación puede dejarte en negativo. Considera construir una reserva de emergencia.'});
              else if(fCFmo>1000) insights.push({type:'good',icon:'🟢',title:`Cash flow saludable: ${fm(fCFmo)}/mes`,desc:'La propiedad genera excedente consistente después de todos los costos.'});

              // Occupancy
              if(fNights>0){
                if(occupancy>=80) insights.push({type:'good',icon:'📈',title:`Ocupación excelente: ${occupancy.toFixed(0)}%`,desc:`Con ${occupancy.toFixed(0)}% de ocupación, puedes considerar subir tarifas. Un aumento de $20/noche generaría ~${fm(fNights/n*20*12)} adicionales al año.`});
                else if(occupancy>=60) insights.push({type:'warn',icon:'📊',title:`Ocupación aceptable: ${occupancy.toFixed(0)}%`,desc:`Hay espacio para ${Math.round(availNights-fNights)} noches más. Si llenas ${Math.round((availNights-fNights)*0.5)} noches adicionales al ADR actual (${fm(adr)}), generarías ${fm(Math.round((availNights-fNights)*0.5)*adr)} extra.`});
                else insights.push({type:'danger',icon:'📉',title:`Ocupación baja: ${occupancy.toFixed(0)}%`,desc:`Solo ${fNights} de ${availNights} noches ocupadas. Revisa precios, fotos del listing, y la competencia en la zona.`});
              }

              // ADR vs market (Orlando STR avg ~$180-250)
              if(adr>0){
                if(adr>300) insights.push({type:'good',icon:'💎',title:`ADR premium: ${fm(adr)}/noche`,desc:'Tu tarifa está por encima del promedio del mercado de Orlando. Asegúrate de que las reseñas y amenities justifiquen el premium.'});
                else if(adr<150) insights.push({type:'warn',icon:'💰',title:`ADR por debajo del mercado: ${fm(adr)}/noche`,desc:'Considera mejorar amenities (hot tub, game room, tematización) para subir tarifa. Cada $25 de aumento = ~'+fm(fNights/n*25*12)+'/año extra.'});
              }

              // Mortgage burden
              if(mMort>0&&fRev>0){
                const mortPct=fMortP/fRev*100;
                if(mortPct>60) insights.push({type:'danger',icon:'🏦',title:`Hipoteca consume ${mortPct.toFixed(0)}% del ingreso`,desc:`El debt service es muy alto relativo al ingreso. DSCR de ${fDscr.toFixed(2)}x. ${fDscr<1.25?'Considera refinanciar a una tasa más baja o extender el plazo.':'Aunque el DSCR es aceptable, el margen es estrecho.'}`});
              }

              // Expense efficiency
              if(fRev>0){
                const opExPct=fOpEx/fRev*100;
                if(opExPct>55) insights.push({type:'warn',icon:'📋',title:`Ratio de gastos alto: ${opExPct.toFixed(0)}%`,desc:`Los gastos operativos consumen más de la mitad del ingreso. Los principales: Comisión PM ${fm(fComm)} (${(fComm/fRev*100).toFixed(0)}%), Electricidad ${fm(fDuke)} (${(fDuke/fRev*100).toFixed(0)}%), HOA ${fm(fHoa)} (${(fHoa/fRev*100).toFixed(0)}%).`});
              }

              // Duke Energy trend
              if(fDuke>0&&fRev>0){
                const dukePct=fDuke/fRev*100;
                if(dukePct>15) insights.push({type:'warn',icon:'⚡',title:`Electricidad alta: ${(dukePct).toFixed(0)}% del ingreso`,desc:`Duke Energy ${fm(fDuke)} (${fm(fDuke/n)}/mes). Para una propiedad STR en Orlando, lo típico es 8-12%. Verifica termostato inteligente, pool heater timer, y eficiencia del A/C.`});
              }

              // YoY comparison
              if(prevYr&&prevYr.revenue>0&&dashYear!=='all'){
                const revDiff=fRev-prevYr.revenue*(n/prevYr.n);
                const netDiff=fNet-prevYr.net*(n/prevYr.n);
                if(revDiff<0) insights.push({type:'warn',icon:'📉',title:`Ingreso ${((revDiff/(prevYr.revenue*(n/prevYr.n)))*100).toFixed(0)}% vs ${prevYr.year} (mismos meses)`,desc:`Ajustado por periodo, estás generando ${fm(Math.abs(revDiff))} menos que el año pasado. Revisa si la competencia aumentó o si tus tarifas necesitan ajuste.`});
                else if(revDiff>0) insights.push({type:'good',icon:'📈',title:`Ingreso +${((revDiff/(prevYr.revenue*(n/prevYr.n)))*100).toFixed(0)}% vs ${prevYr.year}`,desc:`Crecimiento de ${fm(revDiff)} vs el mismo periodo del año anterior. Buen momentum.`});
              }

              // Appreciation
              if(appreciation>20) insights.push({type:'good',icon:'🏠',title:`Valorización +${appreciation.toFixed(0)}% (${fm(marketValue-prop.purchasePrice)})`,desc:'Excelente apreciación. Tu equity es '+fm(realEquity)+'. Podrías hacer un HELOC para adquirir otra propiedad.'});

              return insights.length>0?insights.map((ins,i)=><div key={i} className={`flex gap-3 p-3 rounded-xl border text-sm overflow-hidden overflow-hidden ${ins.type==='good'?'bg-emerald-50 border-emerald-100':ins.type==='warn'?'bg-amber-50 border-amber-100':'bg-rose-50 border-rose-100'}`}>
                <span className="text-lg shrink-0">{ins.icon}</span>
                <div><div className={`font-bold text-xs ${ins.type==='good'?'text-emerald-800':ins.type==='warn'?'text-amber-800':'text-rose-800'}`}>{ins.title}</div><div className="text-[11px] text-slate-600 mt-0.5 break-words">{ins.desc}</div></div>
              </div>):<p className="text-sm text-slate-400 text-center py-4">Necesita más datos para generar insights</p>;
            })()}
          </div>
        </div>

        {/* Quick Numbers */}
        <div className="col-span-1 md:col-span-4 space-y-3">
          <div className="bg-white rounded-2xl p-3 md:p-4 border border-slate-200 shadow-sm overflow-hidden">
            <h3 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">Promedios Mensuales</h3>
            <div className="space-y-2">
              <div className="flex justify-between"><span className="text-[11px] text-slate-400">Ingreso Bruto</span><span className="text-[11px] font-bold text-blue-600">{fm(n>0?fRev/n:0)}/mes</span></div>
              <div className="flex justify-between"><span className="text-[11px] text-slate-400">Gastos Operativos</span><span className="text-[11px] font-bold text-rose-500">{fm(n>0?fOpEx/n:0)}/mes</span></div>
              <div className="flex justify-between"><span className="text-[11px] text-slate-400">Neto del PM</span><span className="text-[11px] font-bold text-emerald-600">{fm(n>0?fNet/n:0)}/mes</span></div>
              {mMort>0&&<div className="flex justify-between"><span className="text-[11px] text-slate-400">Hipoteca</span><span className="text-[11px] font-bold text-red-500">{fm(mMort)}/mes</span></div>}
              <div className="border-t border-slate-100 my-0.5"/>
              <div className="flex justify-between"><span className="text-[11px] font-bold text-slate-600">Cash Flow</span><span className={`text-[11px] font-extrabold ${fCFmo>=0?'text-emerald-600':'text-rose-600'}`}>{fm(fCFmo)}/mes</span></div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-3 md:p-4 border border-slate-200 shadow-sm overflow-hidden">
            <h3 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">Punto de Equilibrio</h3>
            {(()=>{
              const beMo=n>0?(fOpEx/n+mMort+insExp/Math.max(n,1)+taxExp/Math.max(n,1)):0;
              const beNights=adr>0?Math.ceil(beMo/adr):0;
              const avgNMo=fNights>0?Math.round(fNights/n):0;
              const surplus=avgNMo-beNights;
              return <div className="text-center">
                <div className="text-3xl font-black text-slate-800">{beNights}</div>
                <div className="text-[10px] text-slate-400">noches/mes para cubrir todos los costos</div>
                <div className="text-xs text-slate-500 mt-1">Costos mensuales totales: {fm(beMo)}</div>
                <div className="text-xs text-slate-500">ADR actual: {fm(adr)}/noche</div>
                {avgNMo>0&&<div className={`text-xs font-bold mt-2 px-3 py-1 rounded-full inline-block ${surplus>=0?'bg-emerald-100 text-emerald-700':'bg-rose-100 text-rose-700'}`}>{surplus>=0?`+${surplus} noches de margen`:`${Math.abs(surplus)} noches de déficit`}</div>}
              </div>;
            })()}
          </div>
        </div>
      </div>:<div className="mb-4"><UpgradeBanner plan={plan} feature="insights"/></div>)}

      {/* ── ROW 4: Monthly Chart + Property + Seasonality ── */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-4">
        <div className="col-span-1 md:col-span-7 bg-white rounded-2xl p-3 md:p-5 border border-slate-200 shadow-sm overflow-hidden">
          <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">Rendimiento Mensual</h3>
          <ResponsiveContainer width="100%" height={160}>
            <ComposedChart data={mChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9"/>
              <XAxis dataKey="m" tick={{fontSize:9,fill:'#94a3b8'}} interval={mChart.length>18?2:0}/>
              <YAxis tick={{fontSize:9,fill:'#94a3b8'}} tickFormatter={fm}/>
              <Tooltip content={<Tip/>}/><Legend wrapperStyle={{fontSize:10}}/>
              <Bar dataKey="rev" name="Ingreso Bruto" fill="#BFDBFE" radius={[3,3,0,0]}/>
              <Bar dataKey="net" name="Neto Depositado" fill="#6EE7B7" radius={[3,3,0,0]}/>
              {mMort>0&&<Line dataKey="libre" name="Cash Flow" stroke="#1E293B" strokeWidth={2} dot={{r:2,fill:'#1E293B'}}/>}
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="col-span-1 md:col-span-5 space-y-3">
          {/* Property & Equity */}
          <div className="bg-white rounded-2xl p-3 md:p-4 border border-slate-200 shadow-sm overflow-hidden">
            <h3 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">Propiedad & Patrimonio</h3>
            <div className="space-y-1.5">
              <div className="flex justify-between"><span className="text-[11px] text-slate-400 truncate">Valor de Mercado</span><span className="text-[11px] font-extrabold text-slate-800">{fm(marketValue)}</span></div>
              <div className="flex justify-between"><span className="text-[11px] text-slate-400 truncate">Precio de Compra</span><span className="text-[11px] font-bold text-slate-500">{fm(prop.purchasePrice)}</span></div>
              {appreciation!==0&&<div className="flex justify-between"><span className="text-[11px] text-slate-400">Valorización</span><span className={`text-[11px] font-bold ${appreciation>0?'text-emerald-600':'text-rose-500'}`}>{appreciation>0?'+':''}{appreciation.toFixed(1)}% ({fm(marketValue-prop.purchasePrice)})</span></div>}
              <div className="border-t border-slate-100 my-0.5"/>
              <div className="flex justify-between"><span className="text-[11px] text-slate-400">Equity</span><span className="text-[11px] font-extrabold text-emerald-600">{fm(realEquity)}</span></div>
              {realLTV>0&&<div className="flex justify-between"><span className="text-[11px] text-slate-400">LTV</span><span className={`text-[11px] font-bold ${realLTV>80?'text-rose-500':realLTV>60?'text-amber-500':'text-emerald-500'}`}>{realLTV.toFixed(0)}%</span></div>}
            </div>
          </div>
          {/* Mortgage Progress */}
          {mort.balance>0&&<div className="bg-white rounded-2xl p-3 md:p-4 border border-slate-200 shadow-sm overflow-hidden">
            <h3 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">Hipoteca</h3>
            {(()=>{
              const origBal=prop.purchasePrice*(realLTV>0?realLTV/100:0.8);
              const paidPrincipal=origBal>mort.balance?origBal-mort.balance:0;
              const pctPaid=origBal>0?(paidPrincipal/origBal*100):0;
              const monthsStart=mort.startDate?Math.round((new Date()-new Date(mort.startDate))/(30.44*24*60*60*1000)):0;
              const monthsLeft=mort.monthlyPayment>0?Math.ceil(mort.balance/(mort.monthlyPayment*0.3)):mort.termYears*12;
              const yearsLeft=Math.round(monthsLeft/12);
              const totalInterest=mort.monthlyPayment>0?(mort.monthlyPayment*monthsLeft)-mort.balance:0;
              return <div className="space-y-2">
                <div className="flex justify-between items-end">
                  <div><div className="text-lg font-extrabold text-slate-800">{fm(mort.balance)}</div><div className="text-[10px] text-slate-400">Balance actual</div></div>
                  <div className="text-right"><div className="text-sm font-bold text-emerald-600">{fm(mMort)}/mes</div><div className="text-[10px] text-slate-400">{mort.rate}% · {mort.termYears} años</div></div>
                </div>
                {/* Progress bar */}
                <div>
                  <div className="flex justify-between text-[9px] text-slate-400 mb-1"><span>Pagado {pctPaid.toFixed(0)}%</span><span>Restante {(100-pctPaid).toFixed(0)}%</span></div>
                  <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden"><div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all" style={{width:Math.max(2,pctPaid)+'%'}}/></div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center mt-1">
                  <div className="bg-emerald-50 rounded-lg p-1.5"><div className="text-[9px] text-emerald-600 font-bold">PAGADO</div><div className="text-xs font-extrabold text-emerald-700">{fm(paidPrincipal)}</div></div>
                  <div className="bg-slate-50 rounded-lg p-1.5"><div className="text-[9px] text-slate-500 font-bold">RESTANTE</div><div className="text-xs font-extrabold text-slate-700">{fm(mort.balance)}</div></div>
                  <div className="bg-blue-50 rounded-lg p-1.5"><div className="text-[9px] text-blue-500 font-bold">AÑOS REST.</div><div className="text-xs font-extrabold text-blue-700">~{yearsLeft}</div></div>
                </div>
                {monthsStart>0&&<div className="text-[10px] text-slate-400 text-center">{Math.round(monthsStart/12)} años de {mort.termYears} transcurridos{mort.startDate?` · Desde ${mort.startDate.split('-')[0]}`:''}</div>}
              </div>;
            })()}
          </div>}
          {/* Seasonality */}
          {monthRank.length>=6&&<div className="bg-white rounded-2xl p-3 md:p-4 border border-slate-200 shadow-sm overflow-hidden">
            <h3 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">Estacionalidad (histórico)</h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-emerald-50 rounded-xl p-2 text-center"><div className="text-[8px] text-emerald-600 font-bold">MEJOR MES</div><div className="text-sm font-extrabold text-emerald-700">{monthRank[0].month}</div><div className="text-[10px] text-emerald-500">{fm(monthRank[0].avg)} prom</div></div>
              <div className="bg-rose-50 rounded-xl p-2 text-center"><div className="text-[8px] text-rose-600 font-bold">PEOR MES</div><div className="text-sm font-extrabold text-rose-700">{monthRank[monthRank.length-1].month}</div><div className="text-[10px] text-rose-500">{fm(monthRank[monthRank.length-1].avg)} prom</div></div>
            </div>
          </div>}
        </div>
      </div>

      {/* ── ROW 4: Year comparison + Partners ── */}
      {(annual.length>1||partners.length>1)&&<div className={`grid ${annual.length>1&&partners.length>1?'grid-cols-2':'grid-cols-1'} gap-4`}>
        {annual.length>1&&<div className="bg-white rounded-2xl p-3 md:p-5 border border-slate-200 shadow-sm overflow-hidden">
          <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">Comparativo Anual</h3>
          <ResponsiveContainer width="100%" height={160}>
            <ComposedChart data={annual}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9"/>
              <XAxis dataKey="year" tick={{fontSize:11,fill:'#64748b'}}/>
              <YAxis tick={{fontSize:9,fill:'#94a3b8'}} tickFormatter={fm}/>
              <Tooltip content={<Tip/>}/><Legend wrapperStyle={{fontSize:10}}/>
              <Bar dataKey="revenue" name="Ingreso Bruto" fill="#93C5FD" radius={[4,4,0,0]}/>
              <Bar dataKey="net" name="Neto Depositado" fill="#6EE7B7" radius={[4,4,0,0]}/>
              <Line dataKey="hoa" name="HOA" stroke="#8B5CF6" strokeWidth={2} dot={{r:3}}/>
            </ComposedChart>
          </ResponsiveContainer>
        </div>}
        {partners.length>1&&<div className="bg-white rounded-2xl p-3 md:p-5 border border-slate-200 shadow-sm overflow-hidden">
          <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">Distribución entre Socios</h3>
          <div className="space-y-3">{partners.map(p=>{const t=pt[p.id]||{};return<div key={p.id} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0" style={{background:p.color}}>{p.name.charAt(0)}</div>
            <div className="flex-1 min-w-0"><div className="text-sm font-bold text-slate-700 truncate">{p.name} <span className="text-xs text-slate-400 font-normal">{p.ownership}%</span></div>
              <div className="flex gap-3 text-[10px] mt-0.5"><span className="text-emerald-600">Aportó {fm(t.cont)}</span><span className="text-rose-500">Gastó {fm(t.exp)}</span><span className="text-blue-600">Le toca {fm(fNet*(p.ownership/100))}</span></div>
            </div>
          </div>})}</div>
        </div>}
      </div>}

      </>:<div className="max-w-lg mx-auto py-8">
        <div className="text-center mb-8"><div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4"><Building2 size={28} className="text-blue-500"/></div><h2 className="text-xl font-extrabold text-slate-800 mb-2">Configura tu propiedad</h2><p className="text-sm text-slate-400">Completa estos pasos para ver tu dashboard con datos reales.</p></div>
        <div className="space-y-3">
          {[
            {done:stmts.length>0, step:'1', title:'Sube tus statements', desc:'Arrastra los PDFs de tu property manager (IHM, Host U, etc.)', action:'Subir PDFs', onClick:()=>{setUploadLog([]);setModal('upload')}, color:'blue'},
            {done:!!(mort.balance||mort.monthlyPayment), step:'2', title:'Configura tu hipoteca', desc:'Registra el balance, tasa y pago mensual para calcular cash flow real.', action:'Configurar', onClick:()=>setView('mortgage'), color:'indigo'},
            {done:expenses.filter(e=>e.category==='insurance'||e.category==='taxes').length>0, step:'3', title:'Agrega seguro e impuestos', desc:'Estos gastos fijos completan tu P&L y radiografía de costos.', action:'Agregar Gastos', onClick:()=>{setExpenseForm({date:'',concept:'',amount:'',paidBy:partners[0]?.id||'',category:'insurance',type:'fixed',frequency:'monthly',expCurrency:''});setModal('expense')}, color:'emerald'},
            {done:valuations.length>0, step:'4', title:'Registra el valor de mercado', desc:'Con esto calculas equity real, apreciación y Cap Rate correcto.', action:'Registrar Valor', onClick:()=>setView('valuation'), color:'purple'},
          ].map(s=><button key={s.step} onClick={s.onClick} className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all text-left ${s.done?'bg-slate-50 border-slate-100':'bg-white border-slate-200 hover:border-blue-300 hover:shadow-sm'}`}>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${s.done?'bg-emerald-100':'bg-'+s.color+'-50'}`}>{s.done?<CheckCircle size={18} className="text-emerald-500"/>:<span className={`text-sm font-extrabold text-${s.color}-500`}>{s.step}</span>}</div>
            <div className="flex-1 min-w-0"><div className={`text-sm font-bold ${s.done?'text-slate-400 line-through':'text-slate-700'}`}>{s.title}</div><div className="text-xs text-slate-400 mt-0.5">{s.done?'Completado':s.desc}</div></div>
            {!s.done&&<span className="text-xs font-bold text-blue-600 shrink-0">{s.action} →</span>}
          </button>)}
        </div>
        <div className="mt-6 p-4 bg-blue-50 rounded-2xl border border-blue-100"><div className="flex items-start gap-3"><AlertTriangle size={16} className="text-blue-500 shrink-0 mt-0.5"/><div><div className="text-xs font-bold text-blue-700">Tip</div><div className="text-xs text-blue-600 mt-0.5">Los steps 2-4 son opcionales. Con solo subir los statements ya puedes ver revenue, ocupación y gastos operativos.</div></div></div></div>
      </div>}
      <div className="hidden print-footer">OwnerDesk · {prop.name} · {new Date().toLocaleDateString('es',{day:'2-digit',month:'long',year:'numeric'})}</div>
    </>}catch(e){console.error('Dashboard error:',e);return<div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 m-6"><h3 className="font-bold text-rose-700 mb-2">Error en el dashboard</h3><p className="text-sm text-rose-600 mb-3">{e.message}</p><p className="text-xs text-slate-400 mb-3">Stmts: {stmts.length} · Revenue: {revenue} · Annual: {annual.length}</p><button onClick={()=>setView('statements')} className="px-4 py-2 bg-rose-600 text-white rounded-xl text-sm font-bold">Ir a Statements</button></div>}})()}
    {/* ═══ PARTNERS ═══ */}
    {view==='partners'&&(()=>{
      // Calculate what each partner has put in and what they should have put based on ownership %
      const totalPutAll=Object.values(pt).reduce((s,t)=>s+(t.cont||0)+(t.exp||0),0);
      const partnerBalances=partners.map(p=>{
        const t=pt[p.id]||{cont:0,exp:0,inc:0};
        const put=(t.cont||0)+(t.exp||0);  // what they actually put in
        const fairShare=totalPutAll*(p.ownership/100);  // what they should have put
        const diff=put-fairShare;  // positive = overpaid, negative = underpaid
        return{...p,t,put,fairShare,diff};
      });
      // Calculate debts between partners
      const debts=[];
      const overpaid=partnerBalances.filter(p=>p.diff>0);
      const underpaid=partnerBalances.filter(p=>p.diff<0);
      underpaid.forEach(u=>{
        overpaid.forEach(o=>{
          if(Math.abs(u.diff)>1&&o.diff>1){
            const amount=Math.min(Math.abs(u.diff),o.diff)*(Math.abs(u.diff)/(underpaid.reduce((s,x)=>s+Math.abs(x.diff),0)||1));
            if(amount>1)debts.push({from:u.name,fromColor:u.color,to:o.name,toColor:o.color,amount});
          }
        });
      });

      return <>
      <div className="flex justify-between items-center mb-6"><h1 className="text-lg md:text-[22px] font-extrabold text-slate-800">👥 Socios & Capital</h1><button onClick={()=>{setContribForm({date:new Date().toISOString().split('T')[0],concept:'',amount:'',paidBy:partners[0]?.id||''});setModal('contribution')}} className="px-4 py-2.5 bg-purple-600 text-white text-xs rounded-xl font-bold hover:bg-purple-700 flex items-center gap-1.5 shadow-sm"><Plus size={14}/> Aporte</button></div>

      {/* Partner cards */}
      <div className="grid gap-4 mb-5" style={{gridTemplateColumns:`repeat(${Math.min(partners.length,3)},1fr)`}}>{partnerBalances.map(p=>{
        return<div key={p.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-center gap-3 mb-4"><div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white text-lg font-black shadow-md" style={{background:`linear-gradient(135deg,${p.color},${p.color}cc)`}}>{p.name.charAt(0)}</div><div><div className="font-bold text-slate-800">{p.name}</div><div className="text-xs text-slate-400">{p.ownership}%</div></div></div>
        <div className="grid grid-cols-3 gap-2 text-center mb-3">
          <div className="bg-emerald-50 rounded-xl p-2.5"><div className="text-[9px] text-emerald-600 font-bold uppercase">Aportó</div><div className="text-base font-extrabold text-emerald-700">{fm(p.t.cont)}</div></div>
          <div className="bg-rose-50 rounded-xl p-2.5"><div className="text-[9px] text-rose-500 font-bold uppercase">Gastos</div><div className="text-base font-extrabold text-rose-600">{fm(p.t.exp)}</div></div>
          <div className="bg-blue-50 rounded-xl p-2.5"><div className="text-[9px] text-blue-500 font-bold uppercase">Total</div><div className="text-base font-extrabold text-blue-700">{fm(p.put)}</div></div>
        </div>
        <div className="bg-slate-50 rounded-xl p-3 border text-center space-y-1">
          <div className="flex justify-between text-[11px]"><span className="text-slate-400">Le corresponde ({p.ownership}%)</span><span className="font-bold text-slate-600">{fm(p.fairShare)}</span></div>
          <div className="flex justify-between text-[11px]"><span className="text-slate-400">Ha puesto</span><span className="font-bold text-slate-600">{fm(p.put)}</span></div>
          <div className={`flex justify-between text-[11px] pt-1 border-t border-slate-200`}><span className="font-bold text-slate-500">Balance</span><span className={`font-extrabold ${p.diff>0?'text-emerald-600':p.diff<0?'text-rose-500':'text-slate-600'}`}>{p.diff>0?'A favor: +':p.diff<0?'Debe: ':''}{fm(Math.abs(p.diff))}</span></div>
        </div>
      </div>})}</div>

      {/* Debts between partners */}
      {debts.length>0&&<div className="bg-white rounded-2xl border border-amber-200 p-5 shadow-sm mb-5">
        <h3 className="text-xs font-bold text-amber-700 uppercase tracking-widest mb-3 flex items-center gap-2"><AlertTriangle size={14}/> Cuentas Pendientes entre Socios</h3>
        <div className="space-y-2">{debts.map((d,i)=><div key={i} className="flex items-center gap-3 py-3 px-4 bg-amber-50 rounded-xl border border-amber-100">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{background:d.fromColor}}>{d.from.charAt(0)}</div>
          <div className="flex-1"><span className="text-sm font-bold text-slate-700">{d.from}</span><span className="text-sm text-slate-400 mx-2">le debe a</span><span className="text-sm font-bold text-slate-700">{d.to}</span></div>
          <div className="text-lg font-extrabold text-amber-700">{fm(d.amount)}</div>
        </div>)}</div>
      </div>}

      {/* All balanced */}
      {partners.length>1&&debts.length===0&&totalPutAll>0&&<div className="bg-emerald-50 rounded-2xl border border-emerald-200 p-4 mb-5 flex items-center gap-3">
        <CheckCircle size={18} className="text-emerald-500"/>
        <span className="text-sm font-bold text-emerald-700">Cuentas al día — todos los socios han aportado proporcionalmente a su participación.</span>
      </div>}

      {/* Contribution history */}
      {contribs.length>0&&<><h3 className="text-sm font-bold text-slate-700 mb-3">Historial de Movimientos</h3>
        <Tbl cols={[{label:'Fecha',render:r=><span className="text-slate-500">{fmDate(r.date)}</span>},{label:'Socio',render:r=><span className="font-semibold" style={{color:pCl(r.paidBy)}}>{pN(r.paidBy)}</span>},{label:'Concepto',key:'concept',cls:'text-slate-600'},{label:'Monto',r:true,render:r=><span className="font-bold text-emerald-600">{fm(r.amount)}</span>}]} rows={contribs} onDel={del} dc="contributions" onEdit={r=>{setContribForm({date:r.date||'',concept:r.concept||'',amount:String(r.amount||''),paidBy:r.paidBy||partners[0]?.id||''});setEditId(r.id);setModal('contribution')}}/>
      </>}
    </>})()}

    {/* ═══ STATEMENTS ═══ */}
    {view==='statements'&&(()=>{
      const sorted=[...stmts].sort((a,b)=>b.year*100+b.month-a.year*100-a.month);
      const years=[...new Set(stmts.map(s=>s.year))].sort((a,b)=>b-a);
      const filtered=stmtYearFilter==='all'?sorted:sorted.filter(s=>s.year===parseInt(stmtYearFilter));
      const totalPages=Math.ceil(filtered.length/PER_PAGE);
      const page=Math.min(stmtPage,Math.max(0,totalPages-1));
      const paged=filtered.slice(page*PER_PAGE,(page+1)*PER_PAGE);
      return <>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4"><h1 className="text-lg md:text-[22px] font-extrabold text-slate-800">📋 Statements <span className="text-sm font-semibold text-slate-400 ml-1">({stmts.length})</span></h1><div className="flex gap-2">
        {stmts.length>0&&<button onClick={async()=>{if(!confirm(`¿Eliminar los ${stmts.length} statements?`))return;for(const s of stmts)await deleteDoc(doc(db,'properties',propertyId,'statements',s.id))}} className="px-3 py-2.5 bg-rose-100 text-rose-600 text-xs rounded-xl font-bold hover:bg-rose-200 active:bg-rose-300 flex items-center gap-1.5"><Trash2 size={13}/></button>}
        <button onClick={()=>{setUploadLog([]);setModal('upload')}} className="flex-1 sm:flex-none px-4 py-2.5 bg-blue-600 text-white text-xs rounded-xl font-bold flex items-center justify-center gap-1.5 shadow-sm active:bg-blue-700"><Upload size={14}/> PDFs</button><button onClick={()=>setModal('addStmt')} className="flex-1 sm:flex-none px-4 py-2.5 bg-slate-700 text-white text-xs rounded-xl font-bold flex items-center justify-center gap-1.5 shadow-sm active:bg-slate-800"><Plus size={14}/> Manual</button></div></div>

      {/* Year filter + bulk delete per year */}
      {stmts.length>0&&<div className="flex items-center gap-1.5 md:gap-2 mb-4 overflow-x-auto pb-1 scrollbar-thin">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1 shrink-0">Filtrar:</span>
        <button onClick={()=>{setStmtYearFilter('all');setStmtPage(0)}} className={`px-3 py-2 rounded-xl text-xs font-semibold transition shrink-0 ${stmtYearFilter==='all'?'bg-blue-600 text-white shadow-sm':'bg-white border border-slate-200 text-slate-600 active:bg-slate-100'}`}>Todos ({stmts.length})</button>
        {years.map(y=>{const cnt=stmts.filter(s=>s.year===y).length;return<button key={y} onClick={()=>{setStmtYearFilter(String(y));setStmtPage(0)}} className={`px-3 py-2 rounded-xl text-xs font-semibold transition shrink-0 ${stmtYearFilter===String(y)?'bg-blue-600 text-white shadow-sm':'bg-white border border-slate-200 text-slate-600 active:bg-slate-100'}`}>{y} ({cnt})</button>})}
        <div className="flex-1"/>
        <div className="hidden md:flex gap-1">{years.map(y=>{const cnt=stmts.filter(s=>s.year===y).length;return<button key={'d'+y} onClick={async()=>{if(!confirm(`¿Eliminar ${cnt} statements de ${y}?`))return;for(const s of stmts.filter(s=>s.year===y))await deleteDoc(doc(db,'properties',propertyId,'statements',s.id))}} className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-semibold text-slate-400 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-500 transition flex items-center gap-1"><Trash2 size={10}/>{y}</button>})}</div>
      </div>}

      {paged.length>0?<>
        <Tbl cols={[
          {label:'Periodo',render:r=><span className="font-bold text-slate-700">{M[r.month-1]} {r.year}</span>},
          {label:'Ingreso',r:true,render:r=><span className="text-blue-600 font-semibold">{fm(r.revenue)}</span>},
          {label:'Noches',r:true,render:r=>r.nights?<span className="text-slate-600">{r.nights} <span className="text-[9px] text-slate-400">({r.reservations||'—'}res)</span></span>:<span className="text-slate-300">—</span>},
          {label:'Comisión',r:true,render:r=><span className="text-rose-400">{fm(r.commission)}</span>},
          {label:'Electricidad',r:true,render:r=><span className="text-slate-500">{fm(r.duke)}</span>},
          {label:'HOA',r:true,render:r=><span className="text-slate-500">{fm(r.hoa)}</span>},
          {label:'Agua',r:true,render:r=><span className="text-slate-500">{fm(r.water)}</span>},
          {label:'Manten.',r:true,render:r=><span className="text-slate-500">{fm(r.maintenance)}</span>},
          {label:'Gastos Op.',r:true,render:r=>{const tc=(r.commission||0)+(r.duke||0)+(r.water||0)+(r.hoa||0)+(r.maintenance||0)+(r.vendor||0);return<span className="font-semibold text-rose-500">{fm(tc)}</span>}},
          {label:'Neto',r:true,render:r=><span className="font-extrabold text-emerald-700">{fm(r.net)}</span>},
          {label:'Margen',r:true,render:r=>{const m=r.revenue?(r.net/r.revenue*100):0;return<span className={`font-bold text-xs ${m<40?'text-rose-500':m<50?'text-amber-500':'text-emerald-500'}`}>{m.toFixed(0)}%</span>}},
        ]} rows={paged} onDel={del} dc="statements" onEdit={r=>{setStmtForm({year:r.year,month:r.month,revenue:String(r.revenue||''),net:String(r.net||''),commission:String(r.commission||''),duke:String(r.duke||''),water:String(r.water||''),hoa:String(r.hoa||''),maintenance:String(r.maintenance||''),vendor:String(r.vendor||'')});setEditId(r.id);setModal('addStmt')}}/>

        {/* Pagination */}
        {totalPages>1&&<div className="flex items-center justify-between mt-4">
          <span className="text-xs text-slate-400">{filtered.length} statements · Página {page+1} de {totalPages}</span>
          <div className="flex gap-1">
            <button onClick={()=>setStmtPage(0)} disabled={page===0} className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed">«</button>
            <button onClick={()=>setStmtPage(p=>Math.max(0,p-1))} disabled={page===0} className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed">‹ Anterior</button>
            {Array.from({length:totalPages},(_,i)=>i).map(i=><button key={i} onClick={()=>setStmtPage(i)} className={`w-8 py-1.5 rounded-lg text-xs font-bold transition ${i===page?'bg-blue-600 text-white shadow-sm':'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'}`}>{i+1}</button>)}
            <button onClick={()=>setStmtPage(p=>Math.min(totalPages-1,p+1))} disabled={page>=totalPages-1} className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed">Siguiente ›</button>
            <button onClick={()=>setStmtPage(totalPages-1)} disabled={page>=totalPages-1} className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed">»</button>
          </div>
        </div>}

        {/* Totals */}
        <div className="bg-slate-50 rounded-xl p-3 mt-3 flex justify-between items-center text-xs border border-slate-100">
          <span className="text-slate-400 font-semibold">{stmtYearFilter==='all'?'Total':'Total '+stmtYearFilter} ({filtered.length} meses):</span>
          <div className="flex gap-5">
            <span>Ingreso Bruto: <b className="text-blue-600">{fm(filtered.reduce((s,x)=>s+(x.revenue||0),0))}</b></span>
            <span>Gastos Op.: <b className="text-rose-500">{fm(filtered.reduce((s,x)=>s+(x.revenue||0)-(x.net||0),0))}</b></span>
            <span>Neto al Owner: <b className="text-emerald-600">{fm(filtered.reduce((s,x)=>s+(x.net||0),0))}</b></span>
            <span>Margen: <b className="text-slate-700">{(()=>{const r=filtered.reduce((s,x)=>s+(x.revenue||0),0),n=filtered.reduce((s,x)=>s+(x.net||0),0);return r?((n/r)*100).toFixed(1)+'%':'—'})()}</b></span>
          </div>
        </div>
      </>:<Empty icon={ClipboardList} title="Sin statements" desc="Sube PDFs o ingrésalos manualmente." action="Cargar" onAction={()=>{setUploadLog([]);setModal('upload')}}/>}
    </>})()}


    {/* ═══ EXPENSES ═══ */}
    {view==='expenses'&&<>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6"><h1 className="text-lg md:text-[22px] font-extrabold text-slate-800">🧾 Gastos</h1><button onClick={()=>{setExpenseForm({date:'',concept:'',amount:'',paidBy:partners[0]?.id||'',category:'otros',type:'additional',frequency:'once',expCurrency:''});setModal('expense')}} className="px-4 py-2.5 bg-rose-500 text-white text-xs rounded-xl font-bold hover:bg-rose-600 active:bg-rose-700 flex items-center justify-center gap-1.5 shadow-sm"><Plus size={14}/> Gasto</button></div>
      {expenses.length>0&&(()=>{
        const monthlyRecurring=expenses.filter(e=>e.frequency==='monthly').reduce((s,e)=>s+(e.amount||0),0);
        const annualRecurring=expenses.filter(e=>e.frequency==='annual').reduce((s,e)=>s+(e.amount||0),0);
        const oneTime=expenses.filter(e=>!e.frequency||e.frequency==='once').reduce((s,e)=>s+(e.amount||0),0);
        const monthlyEquiv=monthlyRecurring+(annualRecurring/12);
        return <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 mb-5">
          <KPI label="Costo Mensual" value={fm(monthlyEquiv)} sub="Fijos + anuales/12" color="blue"/>
          <KPI label="Mensuales" value={fm(monthlyRecurring)} sub={expenses.filter(e=>e.frequency==='monthly').length+' gastos'} color="amber"/>
          <KPI label="Anuales" value={fm(annualRecurring)} sub={fm(annualRecurring/12)+'/mes equiv.'} color="purple"/>
          <KPI label="Únicos" value={fm(oneTime)} sub={expenses.filter(e=>!e.frequency||e.frequency==='once').length+' gastos'} color="red"/>
        </div>
      })()}
      {expByCat.length>0&&<div className="bg-white rounded-2xl p-3 md:p-5 border border-slate-200 shadow-sm overflow-hidden mb-4"><h3 className="text-sm font-bold text-slate-700 mb-3">Por Categoría</h3><ResponsiveContainer width="100%" height={Math.max(150,expByCat.length*35)}><BarChart data={expByCat} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0"/><XAxis type="number" tickFormatter={fm} tick={{fontSize:10,fill:'#94a3b8'}}/><YAxis type="category" dataKey="name" tick={{fontSize:10,fill:'#64748b'}} width={120}/><Tooltip content={<Tip/>}/><Bar dataKey="value" name="Monto" fill="#DC2626" radius={[0,6,6,0]}/></BarChart></ResponsiveContainer></div>}

      {/* Grouped by month */}
      {expenses.length>0&&(()=>{
        const sorted=[...expenses].sort((a,b)=>{const da=a.date||'0000';const db=b.date||'0000';return db.localeCompare(da)});
        const groups={};sorted.forEach(e=>{const d=e.date||'';const key=d?d.slice(0,7):'sin-fecha';if(!groups[key])groups[key]={label:d?M[parseInt(d.slice(5,7))-1]+' '+d.slice(0,4):'Sin fecha',items:[],total:0};groups[key].items.push(e);groups[key].total+=e.amount||0});
        return Object.entries(groups).map(([key,g])=><div key={key} className="mb-4">
          <div className="flex justify-between items-center mb-2 px-1"><h3 className="text-sm font-bold text-slate-600">{g.label}</h3><span className="text-sm font-extrabold text-rose-500">{fm(g.total)}</span></div>
          <Tbl cols={[
            {label:'Fecha',render:r=><span className="text-slate-500 text-xs">{r.date?r.date.slice(8):''}</span>},
            {label:'Concepto',key:'concept',cls:'text-slate-700 font-medium'},
            {label:'Categoría',render:r=>{const c=propCats.find(x=>x.v===r.category);return<span className="text-xs">{c?c.i+' '+c.l:r.category}</span>}},
            {label:'Tipo',render:r=><div className="flex gap-1 flex-wrap"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${r.type==='fixed'?'bg-amber-100 text-amber-700':'bg-slate-100 text-slate-600'}`}>{r.type==='fixed'?'Fijo':'Único'}</span>{r.frequency&&r.frequency!=='once'&&<span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${r.frequency==='annual'?'bg-purple-100 text-purple-700':'bg-blue-100 text-blue-700'}`}>{r.frequency==='annual'?'Anual':'Mensual'}</span>}</div>},
            {label:'Pagó',render:r=><span style={{color:pCl(r.paidBy)}} className="text-xs font-semibold">{pN(r.paidBy)}</span>},
            {label:'Monto',r:true,render:r=><div className="text-right"><span className="font-bold text-rose-500">{fm(r.amount)}{r.expCurrency&&r.expCurrency!==propCurrency&&<span className="text-[9px] text-slate-400 ml-1">{r.expCurrency}</span>}</span>{r.frequency==='annual'&&<div className="text-[9px] text-slate-400">{fm(r.amount/12)}/mes</div>}{r.expCurrency&&r.expCurrency!==propCurrency&&prop.exchangeRate>0&&<div className="text-[9px] text-blue-400">≈ {fmCurrency(toPropCur(r.amount,r.expCurrency),propCurrency)}</div>}</div>}
          ]} rows={g.items} onDel={del} dc="expenses" onEdit={r=>{setExpenseForm({date:r.date||'',concept:r.concept||'',amount:String(r.amount||''),paidBy:r.paidBy||partners[0]?.id||'',category:r.category||'otros',type:r.type||'additional',frequency:r.frequency||'once',expCurrency:r.expCurrency||''});setEditId(r.id);setModal('expense')}}/>
        </div>)
      })()}
      {!expenses.length&&<Empty icon={Receipt} title="Sin gastos" desc="Registra gastos fijos y adicionales." action="Registrar" onAction={()=>{setExpenseForm({date:'',concept:'',amount:'',paidBy:partners[0]?.id||'',category:'otros',type:'additional',frequency:'once',expCurrency:''});setModal('expense')}}/>}
    </>}

    {/* ═══ INCOME (powered by statements) ═══ */}
    {view==='income'&&<>
      <div className="flex justify-between items-center mb-6"><h1 className="text-[22px] font-extrabold text-slate-800">💰 Ingresos</h1><p className="text-xs text-slate-400 bg-slate-100 px-3 py-1.5 rounded-full">Datos de Statements</p></div>

      {stmts.length>0?(()=>{
        const sorted=[...stmts].sort((a,b)=>b.year*100+b.month-a.year*100-a.month);
        const totR=stmts.reduce((s,x)=>s+(x.revenue||0),0);
        const totC=stmts.reduce((s,x)=>s+(x.commission||0),0);
        const totN=stmts.reduce((s,x)=>s+(x.net||0),0);
        const avgMonth=stmts.length>0?totR/stmts.length:0;
        const avgNet=stmts.length>0?totN/stmts.length:0;
        return <>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
          <KPI label="Revenue Bruto" value={fm(totR)} sub={stmts.length+' meses'} color="blue"/>
          <KPI label="Comisiones PM" value={fm(totC)} sub={totR>0?((totC/totR)*100).toFixed(1)+'% del revenue':''} color="red"/>
          <KPI label="Net al Owner" value={fm(totN)} sub={totR>0?((totN/totR)*100).toFixed(1)+'% margen':''} color="green"/>
          <KPI label="Promedio/Mes" value={fm(avgMonth)} sub="revenue bruto" color="cyan"/>
          <KPI label="Net Promedio/Mes" value={fm(avgNet)} sub="net al owner" color="green"/>
        </div>

        {/* Revenue by year */}
        {annual.length>0&&<div className="bg-white rounded-2xl p-3 md:p-5 border border-slate-200 shadow-sm overflow-hidden mb-4"><h3 className="text-sm font-bold text-slate-700 mb-3">Revenue por Año</h3>
          <div className="grid gap-2">{annual.map(y=>{const m=y.revenue?(y.net/y.revenue*100):0;return<div key={y.year} className="flex items-center gap-3 py-3 px-4 bg-slate-50 rounded-xl">
            <span className="font-extrabold text-slate-800 w-12">{y.year}</span>
            <div className="flex-1 bg-slate-200 rounded-full h-2.5 overflow-hidden"><div className="h-full bg-blue-500 rounded-full" style={{width:Math.min(100,(y.revenue/Math.max(...annual.map(a=>a.revenue))*100))+'%'}}/></div>
            <span className="text-sm font-bold text-blue-600 w-24 text-right">{fm(y.revenue)}</span>
            <span className="text-sm font-bold text-emerald-600 w-24 text-right">{fm(y.net)}</span>
            <span className={`text-xs font-bold w-14 text-right ${m<40?'text-rose-500':m<50?'text-amber-600':'text-emerald-600'}`}>{m.toFixed(0)}%</span>
            <span className="text-[10px] text-slate-400 w-8">{y.n}m</span>
          </div>})}</div>
        </div>}

        {/* Monthly detail table */}
        <div className="bg-white rounded-2xl p-3 md:p-5 border border-slate-200 shadow-sm overflow-hidden"><h3 className="text-sm font-bold text-slate-700 mb-3">Detalle Mensual</h3>
          <Tbl cols={[
            {label:'Periodo',render:r=><span className="font-bold text-slate-700">{M[r.month-1]} {r.year}</span>},
            {label:'Ingreso',r:true,render:r=><span className="text-blue-600 font-semibold">{fm(r.revenue)}</span>},
            {label:'Comisión',r:true,render:r=><span className="text-rose-500">{fm(r.commission)}</span>},
            {label:'Gastos Op.',r:true,render:r=><span className="text-rose-400">{fm((r.duke||0)+(r.water||0)+(r.hoa||0)+(r.maintenance||0)+(r.vendor||0))}</span>},
            {label:'Neto',r:true,render:r=><span className="font-bold text-emerald-600">{fm(r.net)}</span>},
            {label:'Margen',r:true,render:r=>{const m=r.revenue?(r.net/r.revenue*100):0;return<span className={`font-bold ${m<40?'text-rose-500':m<50?'text-amber-600':'text-emerald-600'}`}>{m.toFixed(0)}%</span>}},
            ...(partners.length>1?partners.map(p=>({label:p.name.split(' ')[0]+' ('+p.ownership+'%)',r:true,render:r=><span className="text-sm" style={{color:p.color}}>{fm((r.net||0)*(p.ownership/100))}</span>})):[]),
          ]} rows={sorted}/>
        </div>
      </>})():<Empty icon={DollarSign} title="Sin ingresos" desc="Los ingresos se alimentan de los Statements. Ve a Statements y carga los PDFs de tu property manager." action="Ir a Statements" onAction={()=>setView('statements')}/>}
    </>}

    {/* ═══ MORTGAGE ═══ */}
    {view==='mortgage'&&<>
      <h1 className="text-[22px] font-extrabold text-slate-800 mb-6">🏦 Hipoteca</h1>
      {mort.balance>0?<>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6"><KPI label="Balance" value={fm(mort.balance)} color="red"/><KPI label="Tasa" value={mort.rate+'%'} sub={mort.termYears+' años'} color="amber"/><KPI label="Pago Mensual" value={fm(mort.monthlyPayment)} color="blue"/><KPI label="Total Intereses" value={sNE.length>0?fm(sNE[sNE.length-1].ti):'$0'} sub="sin pagos extra" color="purple"/><KPI label="Equity" value={fm(equity)} sub={'LTV: '+ltv.toFixed(0)+'%'} color="green"/></div>
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm mb-4"><h3 className="text-base font-extrabold text-slate-800 mb-1">💰 Simulador de Pagos Anticipados</h3><p className="text-xs text-slate-400 mb-5">¿Cuánto extra al principal cada mes?</p>
          <div className="max-w-md mb-6"><div className="grid grid-cols-1 md:grid-cols-2 gap-3"><Inp label="Extra MENSUAL al principal" value={extraP} onChange={setExtraP} prefix="$" type="number" placeholder="Ej: 200"/><Inp label="Extra ANUAL al principal" value={extraPA} onChange={setExtraPA} prefix="$" type="number" placeholder="Ej: 5,000"/></div><p className="text-[10px] text-slate-400 mt-2">El pago mensual extra se aplica cada mes. El pago anual se aplica una vez al año al final de cada año.</p></div>
          {sE.length>0&&sNE.length>0&&<><div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-emerald-50 rounded-2xl p-5 text-center border border-emerald-100"><div className="text-[10px] text-emerald-600 font-bold uppercase">Se paga en</div><div className="text-3xl font-extrabold text-emerald-700 mt-1">{Math.ceil(sE[sE.length-1].mo/12)} años</div><div className="text-xs text-emerald-500">vs {Math.ceil(sNE[sNE.length-1].mo/12)} sin extra</div></div>
            <div className="bg-blue-50 rounded-2xl p-5 text-center border border-blue-100"><div className="text-[10px] text-blue-600 font-bold uppercase">Ahorro</div><div className="text-3xl font-extrabold text-blue-700 mt-1">{fm(sNE[sNE.length-1].ti-sE[sE.length-1].ti)}</div></div>
            <div className="bg-amber-50 rounded-2xl p-5 text-center border border-amber-100"><div className="text-[10px] text-amber-600 font-bold uppercase">Meses Menos</div><div className="text-3xl font-extrabold text-amber-700 mt-1">{sNE[sNE.length-1].mo-sE[sE.length-1].mo}</div></div>
          </div><ResponsiveContainer width="100%" height={260}><AreaChart data={sNE.map((d,i)=>({yr:'Año '+d.yr,sin:d.bal,con:sE[i]?.bal||0}))}><CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0"/><XAxis dataKey="yr" tick={{fontSize:9,fill:'#94a3b8'}} interval={4}/><YAxis tick={{fontSize:10,fill:'#94a3b8'}} tickFormatter={fm}/><Tooltip content={<Tip/>}/><Legend wrapperStyle={{fontSize:11}}/><Area dataKey="sin" name="Sin extra" stroke="#DC2626" fill="rgba(220,38,38,.05)"/><Area dataKey="con" name={`$${extraP||0}/mes${extraPA?` + $${extraPA}/año`:''} extra`} stroke="#059669" fill="rgba(5,150,105,.05)"/></AreaChart></ResponsiveContainer></>}
        </div>
        <button onClick={()=>{setMortConfig({bal:String(mort.balance||''),rate:String(mort.rate||''),term:String(mort.termYears||30),pay:String(mort.monthlyPayment||''),start:mort.startDate||''});setModal('editMort')}} className="text-sm text-blue-600 font-semibold hover:text-blue-800 flex items-center gap-1.5 px-3 py-2 rounded-xl hover:bg-blue-50 transition"><Settings size={15}/> Editar datos de hipoteca</button>
      </>:<div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm max-w-lg">
        <div className="flex items-center gap-3 mb-5"><div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center"><Landmark size={24} className="text-blue-600"/></div><div><h3 className="text-base font-extrabold text-slate-800">Configurar Hipoteca</h3><p className="text-xs text-slate-400">Ingresa los datos de tu mortgage.</p></div></div>
        <div className="space-y-3"><div className="grid grid-cols-1 md:grid-cols-2 gap-3"><Inp label="Balance" value={mortConfig.bal} onChange={v=>umc('bal',v)} prefix="$" type="number" placeholder="285,000"/><Inp label="Tasa (%)" value={mortConfig.rate} onChange={v=>umc('rate',v)} type="number" placeholder="7.25"/></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3"><Inp label="Plazo (años)" value={mortConfig.term} onChange={v=>umc('term',v)} type="number" placeholder="30"/><Inp label="Pago Mensual" value={mortConfig.pay} onChange={v=>umc('pay',v)} prefix="$" type="number" placeholder="1,945"/><Inp label="Inicio" value={mortConfig.start} onChange={v=>umc('start',v)} type="date"/></div></div>
        <button onClick={saveMortgage} disabled={!mortConfig.bal||!mortConfig.rate||!mortConfig.pay||savingMort} className="w-full mt-5 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 disabled:opacity-30 transition shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2">{savingMort&&<Loader2 size={16} className="animate-spin"/>}💾 Guardar Hipoteca</button>
      </div>}
    </>}

    {/* ═══ REPAIRS & CAPEX ═══ */}
    {view==='repairs'&&<>
      <div className="flex justify-between items-center mb-6"><h1 className="text-[22px] font-extrabold text-slate-800">🔧 Reparaciones & CapEx</h1><button onClick={()=>{setRepairForm({date:new Date().toISOString().split('T')[0],title:'',description:'',amount:'',vendor:'',category:'repair',status:'pending',paidBy:partners[0]?.id||''});setEditId(null);setModal('repair')}} className="px-4 py-2.5 bg-amber-600 text-white text-xs rounded-xl font-bold hover:bg-amber-700 flex items-center gap-1.5 shadow-sm"><Plus size={14}/> Nuevo Ticket</button></div>

      {repairs.length>0&&<div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <KPI label="Total Reparaciones" value={fm(repairs.reduce((s,r)=>s+(parseFloat(r.amount)||0),0))} sub={repairs.length+' tickets'} color="amber"/>
        <KPI label="Pendientes" value={String(repairs.filter(r=>r.status==='pending').length)} color="red" alert={repairs.filter(r=>r.status==='pending').length>0?'red':null}/>
        <KPI label="En Progreso" value={String(repairs.filter(r=>r.status==='progress').length)} color="blue"/>
        <KPI label="Completados" value={String(repairs.filter(r=>r.status==='done').length)} color="green"/>
      </div>}

      {repairs.length>0?<Tbl cols={[
        {label:'Fecha',render:r=><span className="text-slate-500">{fmDate(r.date)}</span>},
        {label:'Estado',render:r=><span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${r.status==='done'?'bg-emerald-100 text-emerald-700':r.status==='progress'?'bg-blue-100 text-blue-700':'bg-amber-100 text-amber-700'}`}>{r.status==='done'?'✓ Completado':r.status==='progress'?'⏳ En Progreso':'⚠ Pendiente'}</span>},
        {label:'Título',render:r=><span className="font-semibold text-slate-700">{r.title}</span>},
        {label:'Tipo',render:r=><span className="text-xs text-slate-400">{r.category==='capex'?'📈 CapEx':r.category==='preventive'?'🛡️ Preventivo':'🔧 Reparación'}</span>},
        {label:'Vendor',key:'vendor',cls:'text-xs text-slate-500'},
        {label:'Pagó',render:r=>r.paidBy?<span className="font-medium" style={{color:pCl(r.paidBy)}}>{pN(r.paidBy)}</span>:<span className="text-slate-300">—</span>},
        {label:'Monto',r:true,render:r=><span className="font-bold text-amber-600">{fm(r.amount)}</span>},
      ]} rows={repairs} onDel={del} dc="repairs" onEdit={r=>{setRepairForm({date:r.date||'',title:r.title||'',description:r.description||'',amount:String(r.amount||''),vendor:r.vendor||'',category:r.category||'repair',status:r.status||'pending',paidBy:r.paidBy||''});setEditId(r.id);setModal('repair')}}/>
      :<Empty icon={Wrench} title="Sin reparaciones" desc="Registra mantenimientos, reparaciones y mejoras de capital (CapEx) de tu propiedad." action="Crear Ticket" onAction={()=>{setRepairForm({date:new Date().toISOString().split('T')[0],title:'',description:'',amount:'',vendor:'',category:'repair',status:'pending',paidBy:partners[0]?.id||''});setModal('repair')}}/>}
    </>}

    {/* ═══ VALUATION & EQUITY ═══ */}
    {view==='valuation'&&<>
      <div className="flex justify-between items-center mb-6"><h1 className="text-[22px] font-extrabold text-slate-800">📈 Valorización & Equity</h1><button onClick={()=>{setValForm({date:new Date().toISOString().split('T')[0],value:'',source:'manual',notes:''});setEditId(null);setModal('valuation')}} className="px-4 py-2.5 bg-blue-600 text-white text-xs rounded-xl font-bold hover:bg-blue-700 flex items-center gap-1.5 shadow-sm"><Plus size={14}/> Registrar Valor</button></div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <KPI label="Precio de Precio de Compra" value={fm(prop.purchasePrice)} color="blue"/>
        <KPI label="Valor de Mercado" value={fm(marketValue)} sub={latestVal?'Actualizado '+fmDate(latestVal.date):'Precio de Compra'} color={appreciation>=0?'green':'red'}/>
        <KPI label="Equity" value={fm(realEquity)} sub={mort.balance>0?'Valor - Hipoteca':'Sin hipoteca'} color="green" alert={realEquity>0?'green':'red'}/>
        <KPI label="Apreciación" value={appreciation.toFixed(1)+'%'} sub={appreciation>=0?fm(marketValue-prop.purchasePrice)+' ganancia':fm(prop.purchasePrice-marketValue)+' pérdida'} color={appreciation>=0?'green':'red'} trend={{dir:appreciation>=0?'up':'down',text:fm(Math.abs(marketValue-prop.purchasePrice))}}/>
      </div>

      {mort.balance>0&&<div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
        <KPI label="LTV Real" value={realLTV.toFixed(1)+'%'} sub={realLTV>80?'Alto apalancamiento':realLTV>60?'Moderado':'Conservador'} color={realLTV>80?'red':realLTV>60?'amber':'green'}/>
        <KPI label="Balance Hipoteca" value={fm(mort.balance)} color="red"/>
        <KPI label="Valor Total Invertido" value={fm(totCont)} sub="Capital de todos los socios" color="purple"/>
      </div>}

      {/* Equity waterfall */}
      <div className="bg-white rounded-2xl p-3 md:p-5 border border-slate-200 shadow-sm overflow-hidden mb-4">
        <h3 className="text-sm font-bold text-slate-700 mb-4">Composición del Equity</h3>
        <div className="space-y-3">
          <div className="flex justify-between py-3 px-4 bg-blue-50 rounded-xl border border-blue-100"><span className="font-bold text-blue-700">Valor de Mercado</span><span className="font-extrabold text-blue-700 text-lg">{fm(marketValue)}</span></div>
          {mort.balance>0&&<div className="pl-6"><div className="flex justify-between py-2 text-sm"><span className="text-rose-500">(-) Balance Deuda Hipoteca</span><span className="font-semibold text-rose-500">{fm(mort.balance)}</span></div></div>}
          <div className={`flex justify-between py-3 px-4 rounded-xl border ${realEquity>=0?'bg-emerald-50 border-emerald-100':'bg-rose-50 border-rose-100'}`}><span className={`font-bold ${realEquity>=0?'text-emerald-700':'text-rose-700'}`}>= Equity Neto</span><span className={`font-extrabold text-lg ${realEquity>=0?'text-emerald-700':'text-rose-700'}`}>{fm(realEquity)}</span></div>
          {prop.purchasePrice>0&&<div className="pl-6 space-y-1">
            <div className="flex justify-between py-2 text-sm"><span className="text-slate-500">Capital aportado (down payment + extras)</span><span className="font-semibold">{fm(totCont)}</span></div>
            <div className="flex justify-between py-2 text-sm"><span className="text-slate-500">Apreciación / Depreciación</span><span className={`font-semibold ${appreciation>=0?'text-emerald-600':'text-rose-500'}`}>{fm(marketValue-prop.purchasePrice)}</span></div>
            {mort.balance>0&&<div className="flex justify-between py-2 text-sm"><span className="text-slate-500">Principal pagado (equity por amortización)</span><span className="font-semibold text-blue-600">{fm(prop.purchasePrice-mort.balance-totCont)}</span></div>}
          </div>}
        </div>
      </div>

      {/* Valuation History */}
      {valuations.length>0&&<>
        <div className="bg-white rounded-2xl p-3 md:p-5 border border-slate-200 shadow-sm overflow-hidden mb-4"><h3 className="text-sm font-bold text-slate-700 mb-4">Historial de Valorización</h3>
          <ResponsiveContainer width="100%" height={160}><AreaChart data={[{date:fmDate(prop.purchaseDate),value:prop.purchasePrice},...[...valuations].sort((a,b)=>(a.date||'').localeCompare(b.date||'')).map(v=>({date:fmDate(v.date),value:parseFloat(v.value)||0}))]}><CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0"/><XAxis dataKey="date" tick={{fontSize:9,fill:'#94a3b8'}}/><YAxis tick={{fontSize:10,fill:'#94a3b8'}} tickFormatter={fm}/><Tooltip content={<Tip/>}/><Area dataKey="value" name="Valor" stroke="#059669" fill="rgba(5,150,105,.1)" strokeWidth={2.5}/></AreaChart></ResponsiveContainer>
        </div>
        <Tbl cols={[{label:'Fecha',render:r=><span className="text-slate-500 font-medium">{fmDate(r.date)}</span>},{label:'Valor Estimado',r:true,render:r=><span className="font-bold text-emerald-600">{fm(r.value)}</span>},{label:'Fuente',render:r=><span className="text-xs text-slate-400">{r.source==='zillow'?'Zillow':r.source==='redfin'?'Redfin':r.source==='appraisal'?'Avalúo':r.source==='broker'?'Broker':'Manual'}</span>},{label:'Notas',key:'notes',cls:'text-xs text-slate-400'}]} rows={[...valuations].sort((a,b)=>(b.date||'').localeCompare(a.date||''))} onDel={del} dc="valuations" onEdit={r=>{setValForm({date:r.date||'',value:String(r.value||''),source:r.source||'manual',notes:r.notes||''});setEditId(r.id);setModal('valuation')}}/>
      </>}
      {!valuations.length&&<div className="bg-white rounded-2xl p-3 md:p-5 border border-slate-200 shadow-sm overflow-hidden"><p className="text-sm text-slate-400 text-center py-4">Registra el valor actual de tu propiedad para trackear apreciación y equity real. Puedes usar Zillow, Redfin, un avalúo o tu propia estimación.</p></div>}
    </>}

    {/* ═══ PIPELINE ═══ */}
    {view==='pipeline'&&<>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
        <div><h1 className="text-lg md:text-[22px] font-extrabold text-slate-800">📋 Obligaciones del Propietario</h1><p className="text-xs text-slate-400 mt-1">Registra aquí tus pagos recurrentes. Al marcar "Pagado" el gasto se registra automáticamente.</p></div>
        <button onClick={()=>{setTaskForm({title:'',dueDate:'',priority:'medium',status:'pending',notes:'',amount:'',frequency:'annual',payer:'owner',reminderDays:'30'});setEditId(null);setModal('task')}} className="px-4 py-2.5 bg-indigo-600 text-white text-xs rounded-xl font-bold hover:bg-indigo-700 active:bg-indigo-800 flex items-center justify-center gap-1.5 shadow-sm"><Plus size={14}/> Agregar</button>
      </div>

      {/* Smart suggestions based on statements */}
      {(()=>{
        const pmCovers={commission:stmts.some(s=>(s.commission||0)>0),electricity:stmts.some(s=>(s.duke||0)>0),water:stmts.some(s=>(s.water||0)>0),hoa:stmts.some(s=>(s.hoa||0)>0),maintenance:stmts.some(s=>(s.maintenance||0)>0)};
        const pmTasks=tasks.filter(t=>t.payer==='pm');
        const usObligations=[
          {title:'Hipoteca',icon:'🏦',freq:'monthly'},
          {title:'Impuestos',icon:'🏛️',freq:'annual'},
          {title:'Seguro',icon:'🛡️',freq:'annual'},
          {title:'Contabilidad',icon:'📊',freq:'monthly'},
          ...(!pmCovers.hoa?[{title:'HOA',icon:'🏢',freq:'monthly'}]:[]),
        ];
        const coObligations=[
          {title:'Personal de Servicio',icon:'👷',freq:'monthly'},
          {title:'Prestaciones Sociales',icon:'📋',freq:'monthly'},
          {title:'Jardinería',icon:'🌿',freq:'monthly'},
          {title:'Impuesto Predial',icon:'🏛️',freq:'annual'},
          {title:'Seguros',icon:'🛡️',freq:'annual'},
          {title:'Contabilidad',icon:'📊',freq:'monthly'},
          {title:'Hipoteca',icon:'🏦',freq:'monthly'},
          ...(!pmCovers.hoa?[{title:'Administración',icon:'🏢',freq:'monthly'}]:[]),
        ];
        const country=prop.country||'US';
        const allObligations=country==='CO'?coObligations:usObligations;
        const existing=tasks.map(t=>t.title.toLowerCase());
        const suggestions=allObligations.filter(o=>!existing.includes(o.title.toLowerCase()));
        if(!suggestions.length)return null;

        return <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-5">
          <h3 className="text-sm font-bold text-slate-700 mb-1">{stmts.length>0?'Sugerencias basadas en tus statements':'Obligaciones comunes'}</h3>
          <p className="text-xs text-slate-400 mb-4">{stmts.length>0?'Estos pagos no aparecen en lo que cubre tu PM:':'Agrega las que apliquen a tu propiedad:'}</p>

          {(stmts.length>0&&Object.entries(pmCovers).some(([,v])=>v)||pmTasks.length>0)&&<div className="mb-4 p-3 bg-emerald-50 rounded-xl border border-emerald-200">
            <div className="text-[10px] font-bold text-emerald-700 uppercase mb-1.5">Tu PM cubre:</div>
            <div className="flex flex-wrap gap-1.5">{pmCovers.commission&&<span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-semibold">💼 Comisión</span>}{pmCovers.electricity&&<span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-semibold">⚡ Electricidad</span>}{pmCovers.water&&<span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-semibold">💧 Agua</span>}{pmCovers.hoa&&<span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-semibold">🏢 HOA</span>}{pmCovers.maintenance&&<span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-semibold">🔧 Mantenimiento</span>}{pmTasks.map(t=><span key={t.id} className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-semibold">{t.title}</span>)}</div>
          </div>}

          <div className="text-[10px] font-bold text-amber-700 uppercase mb-2">Probablemente debes pagar tú:</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {suggestions.map(o=><button key={o.title} onClick={()=>{setTaskForm({title:o.title,dueDate:'',priority:'medium',status:'pending',notes:'',amount:'',frequency:o.freq,payer:'owner',reminderDays:o.freq==='monthly'?'7':'30'});setEditId(null);setModal('task')}} className="flex items-center gap-3 p-3 rounded-xl border transition text-left bg-amber-50 border-amber-200 hover:bg-amber-100 active:bg-amber-200">
              <span className="text-lg">{o.icon}</span>
              <div>
                <span className="text-xs font-bold text-slate-700">{o.title}</span>
                <div className="text-[10px] text-slate-400">{o.freq==='monthly'?'Mensual':'Anual'}</div>
              </div>
            </button>)}
          </div>
        </div>;
      })()}

      {/* Summary KPIs */}
      {tasks.length>0&&(()=>{
        const ownerTasks=tasks.filter(t=>t.payer!=='pm');
        const pmTasks=tasks.filter(t=>t.payer==='pm');
        const monthly=ownerTasks.filter(t=>t.frequency==='monthly').reduce((s,t)=>s+(parseFloat(t.amount)||0),0);
        const annual=ownerTasks.filter(t=>t.frequency==='annual').reduce((s,t)=>s+(parseFloat(t.amount)||0),0);
        const totalAnnual=monthly*12+annual;
        const today=new Date();today.setHours(0,0,0,0);
        const overdue=ownerTasks.filter(t=>t.dueDate&&new Date(t.dueDate+'T00:00:00')<today).length;
        return <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3 mb-5">
          <KPI label="Costo Propietario/Mes" value={fm(monthly)} sub={totalAnnual>0?fm(totalAnnual)+'/año':''} color="blue"/>
          <KPI label="Obligaciones" value={ownerTasks.length+' propias'+(pmTasks.length?' · '+pmTasks.length+' PM':'')} sub={overdue>0?overdue+' vencida'+(overdue>1?'s':''):''} color={overdue>0?'red':'green'}/>
          {tasks.some(t=>t.lastPaid)&&<KPI label="Último Pago" value={fmDate(tasks.filter(t=>t.lastPaid).sort((a,b)=>(b.lastPaid||'').localeCompare(a.lastPaid||''))[0].lastPaid)} color="green"/>}
        </div>
      })()}

      {/* Obligations list */}
      {/* Obligations list — owner-paid only (PM-paid show in green card above) */}
      {(()=>{
        const ownerOnly=tasks.filter(t=>t.payer!=='pm');
        if(!ownerOnly.length)return null;
        return <div className="space-y-2">
        {[...ownerOnly].sort((a,b)=>(a.dueDate||'9').localeCompare(b.dueDate||'9')).map(t=>{
          const icons={'Hipoteca':'🏦','Impuestos':'🏛️','Seguro':'🛡️','Contabilidad':'📊','HOA':'🏢'};
          const ic=icons[t.title]||'📄';
          const today=new Date();today.setHours(0,0,0,0);
          const days=t.dueDate?Math.ceil((new Date(t.dueDate+'T00:00:00')-today)/(1000*60*60*24)):null;
          const threshold=parseInt(t.reminderDays)||(t.frequency==='monthly'?5:30);
          const isOverdue=days!==null&&days<0;
          const isSoon=days!==null&&days>=0&&days<=threshold;
          return <div key={t.id} className={`bg-white rounded-2xl border shadow-sm p-4 flex items-center gap-3 md:gap-4 ${isOverdue?'border-rose-300 bg-rose-50/30':isSoon?'border-amber-300 bg-amber-50/30':'border-slate-200'}`}>
            <span className="text-xl shrink-0">{ic}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold text-slate-800">{t.title}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${t.frequency==='monthly'?'bg-blue-100 text-blue-700':'bg-purple-100 text-purple-700'}`}>{t.frequency==='monthly'?'Mensual':'Anual'}</span>
                {isOverdue&&<span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">Vencido hace {Math.abs(days)}d</span>}
                {isSoon&&<span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Vence en {days}d</span>}
              </div>
              <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-400 flex-wrap">
                {t.amount&&<span className="font-semibold text-slate-600">{fm(parseFloat(t.amount)||0)}{t.frequency==='monthly'?'/mes':'/año'}</span>}
                {t.dueDate&&<span className="flex items-center gap-1"><Calendar size={10}/>Próximo: {fmDate(t.dueDate)}</span>}
                {t.reminderDays&&<span className="text-blue-400">⏰ {t.reminderDays}d antes</span>}
                {t.lastPaid&&<span className="text-emerald-500 font-semibold">✓ Pagado: {fmDate(t.lastPaid)}</span>}
                {t.notes&&<span className="truncate">{t.notes}</span>}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={()=>markPaid(t)} className={`px-3 py-2 rounded-xl text-[11px] font-bold transition ${isOverdue?'bg-rose-500 text-white hover:bg-rose-600':isSoon?'bg-amber-500 text-white hover:bg-amber-600':'bg-emerald-100 text-emerald-600 hover:bg-emerald-200'}`}>Pagar ✓</button>
              <button onClick={()=>{setTaskForm({title:t.title||'',dueDate:t.dueDate||'',priority:t.priority||'medium',status:t.status||'pending',notes:t.notes||'',amount:String(t.amount||''),frequency:t.frequency||'annual',payer:t.payer||'owner',reminderDays:String(t.reminderDays||'30')});setEditId(t.id);setModal('task')}} className="p-2 text-slate-300 hover:text-blue-500 rounded-xl hover:bg-blue-50 transition"><Pencil size={14}/></button>
              <button onClick={()=>del('tasks',t.id)} className="p-2 text-slate-300 hover:text-red-500 rounded-xl hover:bg-red-50 transition"><Trash2 size={14}/></button>
            </div>
          </div>})}
      </div>})()}
    </>}

    {/* ═══ SUPPORT / TICKETS ═══ */}
    {view==='support'&&<SupportView/>}


    {/* ═══ SETTINGS ═══ */}
    {view==='settings'&&<SettingsView/>}


    {/* ═══ REPORTS ═══ */}
    {view==='reports'&&<>
      <div className="flex justify-between items-center mb-2 no-print"><h1 className="text-[22px] font-extrabold text-slate-800">📄 Reportes Financieros</h1><button onClick={()=>window.print()} className="px-4 py-2.5 bg-slate-100 text-slate-600 text-xs rounded-xl font-bold hover:bg-slate-200 flex items-center gap-1.5 transition"><Printer size={13}/> Imprimir PDF</button></div>
      <p className="text-sm text-slate-400 mb-5 no-print">Reportes profesionales de tu propiedad. Selecciona un reporte y dale Imprimir PDF.</p>

      {/* Report tabs */}
      <div className="flex gap-1 bg-white rounded-2xl p-1.5 border border-slate-200 shadow-sm mb-5 overflow-x-auto no-print">
        {[['performance','📊 Rendimiento'],['pnl','📋 P&L Detallado'],['partners','👥 Socios'],['cashflow','💰 Cash Flow'],['mortgage_rpt','🏦 Hipoteca'],['expenses_rpt','🧾 Gastos']].map(([k,l])=>
          <button key={k} onClick={()=>setRptTab(k)} className={`px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${rptTab===k?'bg-blue-600 text-white shadow-md':'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}>{l}</button>
        )}
      </div>

      {/* PERFORMANCE REPORT */}
      {rptTab==='performance'&&<div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 print:shadow-none print:border-none">
        <div className="border-b-2 border-blue-600 pb-3 mb-5"><h2 className="text-lg font-extrabold text-slate-800">{prop.name} — Reporte de Rendimiento</h2><p className="text-xs text-slate-400">{prop.address}, {prop.city}, {prop.state} · Generado: {new Date().toLocaleDateString('es')}</p></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-blue-50 rounded-xl p-3 text-center border border-blue-100"><div className="text-[10px] text-blue-600 font-bold uppercase">Revenue Total</div><div className="text-xl font-extrabold text-blue-700">{fm(revenue)}</div></div>
          <div className="bg-emerald-50 rounded-xl p-3 text-center border border-emerald-100"><div className="text-[10px] text-emerald-600 font-bold uppercase">NOI</div><div className="text-xl font-extrabold text-emerald-700">{fm(noi)}</div></div>
          <div className={`rounded-xl p-3 text-center border ${cashFlow>=0?'bg-emerald-50 border-emerald-100':'bg-rose-50 border-rose-100'}`}><div className={`text-[10px] font-bold uppercase ${cashFlow>=0?'text-emerald-600':'text-rose-600'}`}>Cash Flow</div><div className={`text-xl font-extrabold ${cashFlow>=0?'text-emerald-700':'text-rose-700'}`}>{fm(cashFlow)}</div></div>
          <div className="bg-purple-50 rounded-xl p-3 text-center border border-purple-100"><div className="text-[10px] text-purple-600 font-bold uppercase">Retorno CoC</div><div className="text-xl font-extrabold text-purple-700">{coc.toFixed(1)}%</div></div>
        </div>
        <div className="grid grid-cols-6 gap-2 mb-6">
          <div className="bg-slate-50 rounded-lg p-2.5 text-center"><div className="text-[9px] text-slate-500 font-semibold uppercase">Margen</div><div className="text-sm font-extrabold text-slate-800">{margin.toFixed(1)}%</div></div>
          <div className="bg-slate-50 rounded-lg p-2.5 text-center"><div className="text-[9px] text-slate-500 font-semibold uppercase">Cap Rate</div><div className="text-sm font-extrabold text-slate-800">{capRate.toFixed(2)}%</div></div>
          <div className="bg-slate-50 rounded-lg p-2.5 text-center"><div className="text-[9px] text-slate-500 font-semibold uppercase">Ratio de Gastos</div><div className="text-sm font-extrabold text-slate-800">{expRatio.toFixed(1)}%</div></div>
          <div className="bg-slate-50 rounded-lg p-2.5 text-center"><div className="text-[9px] text-slate-500 font-semibold uppercase">Equity</div><div className="text-sm font-extrabold text-slate-800">{fm(equity)}</div></div>
          <div className="bg-slate-50 rounded-lg p-2.5 text-center"><div className="text-[9px] text-slate-500 font-semibold uppercase">LTV</div><div className="text-sm font-extrabold text-slate-800">{ltv.toFixed(0)}%</div></div>
          <div className="bg-slate-50 rounded-lg p-2.5 text-center"><div className="text-[9px] text-slate-500 font-semibold uppercase">Capital</div><div className="text-sm font-extrabold text-slate-800">{fm(totCont)}</div></div>
        </div>
        {relAnnual.length>0&&<><h3 className="text-sm font-bold text-slate-700 mb-3">Evolución Anual</h3>
          <ResponsiveContainer width="100%" height={220}><ComposedChart data={relAnnual}><CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0"/><XAxis dataKey="year" tick={{fontSize:11,fill:'#94a3b8'}}/><YAxis tick={{fontSize:10,fill:'#94a3b8'}} tickFormatter={fm}/><Tooltip content={<Tip/>}/><Legend wrapperStyle={{fontSize:11}}/><Bar dataKey="revenue" name="Revenue" fill="#2563EB" radius={[4,4,0,0]}/><Bar dataKey="net" name="Net" fill="#059669" radius={[4,4,0,0]}/><Line dataKey="commission" name="Comisión" stroke="#DC2626" strokeWidth={2} dot={{r:3}}/></ComposedChart></ResponsiveContainer>
        </>}
        {monthRank.length>0&&<><h3 className="text-sm font-bold text-slate-700 mt-5 mb-3">Estacionalidad — Mejores y Peores Meses</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">{monthRank.slice(0,4).map((r,i)=><div key={r.month} className="bg-emerald-50 rounded-xl p-3 text-center border border-emerald-100"><div className="text-[10px] text-emerald-600 font-bold">#{i+1} MEJOR</div><div className="text-base font-extrabold text-emerald-700">{r.month}</div><div className="text-xs text-emerald-500">{fm(r.avg)} avg</div></div>)}
          {monthRank.slice(-3).reverse().map((r,i)=><div key={r.month} className="bg-rose-50 rounded-xl p-3 text-center border border-rose-100"><div className="text-[10px] text-rose-600 font-bold">PEOR</div><div className="text-base font-extrabold text-rose-700">{r.month}</div><div className="text-xs text-rose-500">{fm(r.avg)} avg</div></div>)}</div>
        </>}
      </div>}

      {/* P&L REPORT */}
      {rptTab==='pnl'&&<div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="border-b-2 border-blue-600 pb-3 mb-5"><h2 className="text-lg font-extrabold text-slate-800">Estado de Resultados (P&L)</h2><p className="text-xs text-slate-400">{prop.name} · {annual.length>0?annual[0].year+' — '+annual[annual.length-1].year:'Sin datos'}</p></div>
        {annual.length>0?<>
          <Tbl cols={[{label:'Concepto',render:r=><span className={`${r.bold?'font-extrabold':'font-medium'} ${r.color||'text-slate-700'}`}>{r.concept}</span>},...annual.map(y=>({label:y.year+(y.n<12?` (${y.n}m)`:''),r:true,render:r=>{const v=r.values[y.year];return<span className={`${r.bold?'font-extrabold':'font-medium'} ${r.color||''}`}>{v!==undefined?fm(v):'—'}</span>}}))]}
            rows={[
              {concept:'Revenue (Gross)',bold:true,color:'text-blue-600',values:Object.fromEntries(annual.map(y=>[y.year,y.revenue]))},
              {concept:'(-) Comisión PM',color:'text-rose-500',values:Object.fromEntries(annual.map(y=>[y.year,y.commission]))},
              {concept:'(-) Electricidad',values:Object.fromEntries(annual.map(y=>[y.year,y.duke]))},
              {concept:'(-) HOA',values:Object.fromEntries(annual.map(y=>[y.year,y.hoa]))},
              {concept:'(-) Mantenimiento',values:Object.fromEntries(annual.map(y=>[y.year,y.maintenance]))},
              {concept:'(-) Agua',values:Object.fromEntries(annual.map(y=>[y.year,y.water]))},
              {concept:'(-) Vendor/Otros',values:Object.fromEntries(annual.map(y=>[y.year,y.vendor]))},
              {concept:'Net al Owner',bold:true,color:'text-emerald-600',values:Object.fromEntries(annual.map(y=>[y.year,y.net]))},
              {concept:'Margen',bold:true,color:null,values:Object.fromEntries(annual.map(y=>[y.year,y.revenue?(y.net/y.revenue*100):0])),render:null},
            ].map(r=>({...r,values:r.values||{}}))}
          />
          <div className="mt-4 bg-slate-50 rounded-xl p-4 border border-slate-100">
            <h4 className="text-xs font-bold text-slate-600 mb-2">Totales Acumulados</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center text-xs">
              <div><span className="text-slate-400">Revenue Total</span><div className="font-extrabold text-blue-600 text-base">{fm(stmtRev)}</div></div>
              <div><span className="text-slate-400">Gastos Totales</span><div className="font-extrabold text-rose-500 text-base">{fm(stmtRev-stmtNet)}</div></div>
              <div><span className="text-slate-400">Net Total</span><div className="font-extrabold text-emerald-600 text-base">{fm(stmtNet)}</div></div>
              <div><span className="text-slate-400">Margen Promedio</span><div className="font-extrabold text-slate-800 text-base">{stmtRev?((stmtNet/stmtRev)*100).toFixed(1)+'%':'—'}</div></div>
            </div>
          </div>
        </>:<p className="text-sm text-slate-400 text-center py-8">Carga statements para generar el P&L.</p>}
      </div>}

      {/* PARTNERS REPORT */}
      {rptTab==='partners'&&<div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="border-b-2 border-purple-600 pb-3 mb-5"><h2 className="text-lg font-extrabold text-slate-800">Reporte de Socios — Capital & Balance</h2><p className="text-xs text-slate-400">{prop.name} · {partners.length} socio(s) · Generado: {new Date().toLocaleDateString('es')}</p></div>
        <div className="grid gap-4 mb-5" style={{gridTemplateColumns:`repeat(${Math.min(partners.length,3)},1fr)`}}>
          {partners.map(p=>{const t=pt[p.id]||{};const totalPut=(t.cont||0)+(t.exp||0);const shareOfRev=revenue*(p.ownership/100);const shareOfNet=(stmtNet||totNet)*(p.ownership/100);const roi=totalPut>0?((shareOfNet/totalPut)*100).toFixed(1):0;
            return<div key={p.id} className="rounded-2xl border-2 p-5" style={{borderColor:p.color+'30',borderLeftColor:p.color,borderLeftWidth:4}}>
              <div className="flex items-center gap-3 mb-4"><div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold" style={{background:p.color}}>{p.name.charAt(0)}</div><div><div className="font-bold text-slate-800">{p.name}</div><div className="text-xs text-slate-400">{p.ownership}% participación</div></div></div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-1.5 border-b border-slate-100"><span className="text-slate-500">Capital aportado</span><span className="font-bold text-emerald-600">{fm(t.cont)}</span></div>
                <div className="flex justify-between py-1.5 border-b border-slate-100"><span className="text-slate-500">Gastos pagados</span><span className="font-bold text-rose-500">{fm(t.exp)}</span></div>
                <div className="flex justify-between py-1.5 border-b border-slate-100"><span className="text-slate-500">Total invertido</span><span className="font-extrabold text-slate-800">{fm(totalPut)}</span></div>
                <div className="flex justify-between py-1.5 border-b border-slate-100"><span className="text-slate-500">Revenue ({p.ownership}%)</span><span className="font-bold text-blue-600">{fm(shareOfRev)}</span></div>
                <div className="flex justify-between py-1.5 border-b border-slate-100"><span className="text-slate-500">Net ({p.ownership}%)</span><span className="font-bold text-emerald-600">{fm(shareOfNet)}</span></div>
                <div className="flex justify-between py-2 bg-slate-50 rounded-lg px-3 mt-2"><span className="text-slate-600 font-semibold">ROI Personal</span><span className={`font-extrabold ${parseFloat(roi)>0?'text-emerald-600':'text-rose-500'}`}>{roi}%</span></div>
              </div>
            </div>})}
        </div>
        {contribs.length>0&&<><h3 className="text-sm font-bold text-slate-700 mb-3">Historial de Movimientos</h3>
          <Tbl cols={[{label:'Fecha',render:r=><span className="text-slate-500">{fmDate(r.date)}</span>},{label:'Socio',render:r=><span className="font-semibold" style={{color:pCl(r.paidBy)}}>{pN(r.paidBy)}</span>},{label:'Tipo',render:r=><span className="text-xs">{r.type==='contribution'?'📥 Aporte':'📤 Distribución'}</span>},{label:'Concepto',key:'concept',cls:'text-slate-600'},{label:'Monto',r:true,render:r=><span className="font-bold text-emerald-600">{fm(r.amount)}</span>}]} rows={contribs}/>
        </>}
      </div>}

      {/* CASH FLOW REPORT */}
      {rptTab==='cashflow'&&<div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="border-b-2 border-emerald-600 pb-3 mb-5"><h2 className="text-lg font-extrabold text-slate-800">Estado de Cash Flow</h2><p className="text-xs text-slate-400">{prop.name} · Generado: {new Date().toLocaleDateString('es')}</p></div>
        <div className="space-y-3">
          <div className="flex justify-between py-3 px-4 bg-blue-50 rounded-xl border border-blue-100"><span className="font-bold text-blue-700">Revenue Total</span><span className="font-extrabold text-blue-700 text-lg">{fm(revenue)}</span></div>
          <div className="pl-6 space-y-1">
            <div className="flex justify-between py-2 text-sm"><span className="text-rose-500">(-) Comisión PM</span><span className="font-semibold text-rose-500">{fm(stmtComm)}</span></div>
            <div className="flex justify-between py-2 text-sm"><span className="text-rose-500">(-) Electricidad</span><span className="font-semibold text-rose-500">{fm(stmtDuke)}</span></div>
            <div className="flex justify-between py-2 text-sm"><span className="text-rose-500">(-) HOA</span><span className="font-semibold text-rose-500">{fm(stmtHoa)}</span></div>
            <div className="flex justify-between py-2 text-sm"><span className="text-rose-500">(-) Mantenimiento</span><span className="font-semibold text-rose-500">{fm(stmtMaint)}</span></div>
            <div className="flex justify-between py-2 text-sm"><span className="text-rose-500">(-) Agua</span><span className="font-semibold text-rose-500">{fm(stmtWater)}</span></div>
            <div className="flex justify-between py-2 text-sm"><span className="text-rose-500">(-) Vendor/Otros</span><span className="font-semibold text-rose-500">{fm(stmtVendor)}</span></div>
            {totExp>0&&<div className="flex justify-between py-2 text-sm"><span className="text-rose-500">(-) Gastos Adicionales</span><span className="font-semibold text-rose-500">{fm(totExp)}</span></div>}
          </div>
          <div className="flex justify-between py-3 px-4 bg-emerald-50 rounded-xl border border-emerald-100"><span className="font-bold text-emerald-700">= NOI (Ingreso Operativo Neto)</span><span className="font-extrabold text-emerald-700 text-lg">{fm(noi)}</span></div>
          {mort.balance>0&&<><div className="pl-6"><div className="flex justify-between py-2 text-sm"><span className="text-amber-600">(-) Pago de Hipoteca (anual)</span><span className="font-semibold text-amber-600">{fm(annualMortgage)}</span></div></div>
          <div className={`flex justify-between py-3 px-4 rounded-xl border ${cashFlow>=0?'bg-emerald-50 border-emerald-100':'bg-rose-50 border-rose-100'}`}><span className={`font-bold ${cashFlow>=0?'text-emerald-700':'text-rose-700'}`}>= Cash Flow</span><span className={`font-extrabold text-lg ${cashFlow>=0?'text-emerald-700':'text-rose-700'}`}>{fm(cashFlow)}</span></div></>}
          <div className="flex justify-between py-3 px-4 bg-purple-50 rounded-xl border border-purple-100 mt-2"><span className="font-bold text-purple-700">Retorno Cash-on-Cash</span><span className="font-extrabold text-purple-700 text-lg">{coc.toFixed(1)}%</span></div>
          <p className="text-[10px] text-slate-400 mt-2 text-center">Cash-on-Cash = Cash Flow Anual / Capital Total Invertido ({fm(totCont)})</p>
        </div>
      </div>}

      {/* MORTGAGE REPORT */}
      {rptTab==='mortgage_rpt'&&<div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="border-b-2 border-amber-500 pb-3 mb-5"><h2 className="text-lg font-extrabold text-slate-800">Resumen de Hipoteca</h2><p className="text-xs text-slate-400">{prop.name} · Generado: {new Date().toLocaleDateString('es')}</p></div>
        {mort.balance>0?<>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
            <div className="bg-slate-50 rounded-xl p-3 text-center border"><div className="text-[10px] text-slate-500 font-bold uppercase">Balance</div><div className="text-lg font-extrabold text-slate-800">{fm(mort.balance)}</div></div>
            <div className="bg-slate-50 rounded-xl p-3 text-center border"><div className="text-[10px] text-slate-500 font-bold uppercase">Tasa</div><div className="text-lg font-extrabold text-slate-800">{mort.rate}%</div></div>
            <div className="bg-slate-50 rounded-xl p-3 text-center border"><div className="text-[10px] text-slate-500 font-bold uppercase">Plazo</div><div className="text-lg font-extrabold text-slate-800">{mort.termYears} años</div></div>
            <div className="bg-slate-50 rounded-xl p-3 text-center border"><div className="text-[10px] text-slate-500 font-bold uppercase">Pago Mensual</div><div className="text-lg font-extrabold text-slate-800">{fm(mort.monthlyPayment)}</div></div>
            <div className="bg-slate-50 rounded-xl p-3 text-center border"><div className="text-[10px] text-slate-500 font-bold uppercase">Equity</div><div className="text-lg font-extrabold text-emerald-600">{fm(equity)}</div></div>
          </div>
          {sNE.length>0&&<>
            <h3 className="text-sm font-bold text-slate-700 mb-3">Tabla de Amortización (Anual)</h3>
            <Tbl cols={[{label:'Año',render:r=><span className="font-bold">{r.yr}</span>},{label:'Mes',r:true,render:r=>r.mo},{label:'Balance',r:true,render:r=><span className="font-semibold text-slate-800">{fm(r.bal)}</span>},{label:'Interés Acumulado',r:true,render:r=><span className="text-rose-500">{fm(r.ti)}</span>}]} rows={sNE}/>
          </>}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-rose-50 rounded-xl p-4 text-center border border-rose-100"><div className="text-[10px] text-rose-600 font-bold uppercase">Total Intereses</div><div className="text-2xl font-extrabold text-rose-700">{sNE.length>0?fm(sNE[sNE.length-1].ti):'—'}</div><div className="text-[10px] text-rose-500">sin pagos extra</div></div>
            <div className="bg-amber-50 rounded-xl p-4 text-center border border-amber-100"><div className="text-[10px] text-amber-600 font-bold uppercase">LTV</div><div className="text-2xl font-extrabold text-amber-700">{ltv.toFixed(0)}%</div><div className="text-[10px] text-amber-500">{ltv>80?'Alto riesgo':ltv>60?'Moderado':'Conservador'}</div></div>
            <div className="bg-blue-50 rounded-xl p-4 text-center border border-blue-100"><div className="text-[10px] text-blue-600 font-bold uppercase">DSCR</div><div className="text-2xl font-extrabold text-blue-700">{annualMortgage>0?(noi/annualMortgage).toFixed(2):'N/A'}</div><div className="text-[10px] text-blue-500">{noi/annualMortgage>1.25?'Saludable':'Ajustado'}</div></div>
          </div>
        </>:<p className="text-sm text-slate-400 text-center py-8">No hay hipoteca configurada. Ve al módulo de Hipoteca para configurarla.</p>}
      </div>}

      {/* EXPENSES REPORT */}
      {rptTab==='expenses_rpt'&&<div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="border-b-2 border-rose-500 pb-3 mb-5"><h2 className="text-lg font-extrabold text-slate-800">Reporte de Gastos</h2><p className="text-xs text-slate-400">{prop.name} · {expenses.length} registros · Generado: {new Date().toLocaleDateString('es')}</p></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <div className="bg-rose-50 rounded-xl p-3 text-center border border-rose-100"><div className="text-[10px] text-rose-600 font-bold uppercase">Total Gastos</div><div className="text-xl font-extrabold text-rose-700">{fm(totalOpEx)}</div></div>
          <div className="bg-amber-50 rounded-xl p-3 text-center border border-amber-100"><div className="text-[10px] text-amber-600 font-bold uppercase">Fijos (Statements)</div><div className="text-xl font-extrabold text-amber-700">{fm(stmtRev-stmtNet)}</div></div>
          <div className="bg-slate-50 rounded-xl p-3 text-center border"><div className="text-[10px] text-slate-500 font-bold uppercase">Adicionales</div><div className="text-xl font-extrabold text-slate-800">{fm(totExp)}</div></div>
          <div className="bg-blue-50 rounded-xl p-3 text-center border border-blue-100"><div className="text-[10px] text-blue-600 font-bold uppercase">Ratio de Gastos</div><div className="text-xl font-extrabold text-blue-700">{expRatio.toFixed(1)}%</div></div>
        </div>
        {/* Breakdown from statements */}
        {stmtRev>0&&<><h3 className="text-sm font-bold text-slate-700 mb-3">Desglose — Costos Operativos (de Statements)</h3>
          <div className="grid grid-cols-3 gap-2 mb-5">
            {[['Comisión PM',stmtComm,'💼'],['Electricidad',stmtDuke,'⚡'],['HOA',stmtHoa,'🏢'],['Mantenimiento',stmtMaint,'🔧'],['Agua',stmtWater,'💧'],['Vendor',stmtVendor,'🛠️']].filter(([_,v])=>v>0).map(([l,v,ic])=><div key={l} className="flex items-center gap-3 bg-slate-50 rounded-xl p-3 border">
              <span className="text-lg">{ic}</span><div><div className="text-xs text-slate-500">{l}</div><div className="font-bold text-slate-800">{fm(v)}</div><div className="text-[10px] text-slate-400">{pct(v,stmtRev)} del revenue</div></div>
            </div>)}
          </div>
        </>}
        {expByCat.length>0&&<><h3 className="text-sm font-bold text-slate-700 mb-3">Gastos Adicionales por Categoría</h3>
          <ResponsiveContainer width="100%" height={Math.max(150,expByCat.length*35)}><BarChart data={expByCat} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0"/><XAxis type="number" tickFormatter={fm} tick={{fontSize:10,fill:'#94a3b8'}}/><YAxis type="category" dataKey="name" tick={{fontSize:10,fill:'#64748b'}} width={120}/><Tooltip content={<Tip/>}/><Bar dataKey="value" name="Monto" fill="#DC2626" radius={[0,6,6,0]}/></BarChart></ResponsiveContainer>
        </>}
      </div>}
    </>}

    </ViewGuard></div></div>

    {/* ═══ MODALS ═══ */}
    {modal==='expense'&&<Mdl title={editId?'✏️ Editar Gasto':'Registrar Gasto'} grad="from-rose-500 to-rose-600" onClose={()=>{setModal(null);setEditId(null)}} footer={<><button onClick={()=>{setModal(null);setEditId(null)}} className="flex-1 py-2.5 border-2 border-slate-200 rounded-xl font-semibold text-sm text-slate-500">Cancelar</button><button onClick={()=>{const data={...expenseForm,amount:parseFloat(expenseForm.amount)};if(editId){update('expenses',editId,data)}else{save('expenses',data)}}} disabled={!expenseForm.amount||!expenseForm.concept} className="flex-1 py-2.5 bg-rose-500 text-white rounded-xl font-bold text-sm disabled:opacity-30">{editId?'Actualizar':'Guardar'}</button></>}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3"><Inp label="Fecha" value={expenseForm.date} onChange={v=>ue('date',v)} type="date" required/><Sel label="Categoría" value={expenseForm.category} onChange={v=>ue('category',v)} options={propCats.map(c=>({v:c.v,l:c.i+' '+c.l}))}/></div>
      <Inp label="Concepto" value={expenseForm.concept} onChange={v=>ue('concept',v)} placeholder="Descripción del gasto" required error={expenseForm.concept===''&&expenseForm.amount?'Ingresa una descripción':''}/>
      {propCurrency!=='USD'&&<div><label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Moneda del gasto</label><div className="grid grid-cols-2 gap-2">{[[propCurrency,propCurrency],['USD','USD ($)']].map(([v,l])=><button key={v} type="button" onClick={()=>ue('expCurrency',v)} className={`py-2 rounded-xl border-2 text-xs font-medium transition ${(expenseForm.expCurrency||propCurrency)===v?'border-blue-500 bg-blue-50 text-blue-700':'border-slate-200 text-slate-500'}`}>{l}</button>)}</div></div>}
      <Inp label={`Monto (${(expenseForm.expCurrency||propCurrency)})`} value={expenseForm.amount} onChange={v=>ue('amount',v)} prefix={propCurrency==='EUR'||expenseForm.expCurrency==='EUR'?'€':propCurrency==='GBP'||expenseForm.expCurrency==='GBP'?'£':'$'} type="number" min="0" required error={expenseForm.amount&&parseFloat(expenseForm.amount)<=0?'El monto debe ser mayor a 0':''}/>
      {(expenseForm.expCurrency||propCurrency)!==propCurrency&&prop.exchangeRate>0&&expenseForm.amount&&<div className="text-[11px] text-blue-500 font-semibold bg-blue-50 px-3 py-2 rounded-xl">= {fmCurrency(parseFloat(expenseForm.amount)*(expenseForm.expCurrency==='USD'?prop.exchangeRate:1/prop.exchangeRate),propCurrency)} {propCurrency}</div>}
      <div className="grid grid-cols-2 gap-3">
        <div><label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Tipo</label><div className="grid grid-cols-2 gap-2">{[['fixed','🔄 Fijo'],['additional','➕ Único']].map(([v,l])=><button key={v} type="button" onClick={()=>ue('type',v)} className={`py-2.5 rounded-xl border-2 text-xs font-medium transition ${expenseForm.type===v?'border-blue-500 bg-blue-50 text-blue-700':'border-slate-200 text-slate-500'}`}>{l}</button>)}</div></div>
        <div><label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Frecuencia</label><div className="grid grid-cols-3 gap-1">{[['once','1 vez'],['monthly','Mensual'],['annual','Anual']].map(([v,l])=><button key={v} type="button" onClick={()=>ue('frequency',v)} className={`py-2.5 rounded-xl border-2 text-[11px] font-medium transition ${expenseForm.frequency===v?'border-blue-500 bg-blue-50 text-blue-700':'border-slate-200 text-slate-500'}`}>{l}</button>)}</div></div>
      </div>
      {expenseForm.frequency==='annual'&&expenseForm.amount&&<div className="text-[11px] text-blue-500 font-semibold bg-blue-50 px-3 py-2 rounded-xl">= {fm(parseFloat(expenseForm.amount)/12)}/mes equivalente</div>}
      <div><label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">¿Quién pagó?</label><PPick partners={partners} selected={expenseForm.paidBy} onChange={v=>ue('paidBy',v)}/></div>
    </Mdl>}

    {modal==='contribution'&&<Mdl title={editId?'✏️ Editar Aporte':'Aporte de Capital'} grad="from-purple-500 to-purple-600" onClose={()=>{setModal(null);setEditId(null)}} footer={<><button onClick={()=>{setModal(null);setEditId(null)}} className="flex-1 py-2.5 border-2 border-slate-200 rounded-xl font-semibold text-sm text-slate-500">Cancelar</button><button onClick={()=>{const data={...contribForm,amount:parseFloat(contribForm.amount),type:'contribution'};if(editId){update('contributions',editId,data)}else{save('contributions',data)}}} disabled={!contribForm.amount} className="flex-1 py-2.5 bg-purple-600 text-white rounded-xl font-bold text-sm disabled:opacity-30">{editId?'Actualizar':'Guardar'}</button></>}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3"><Inp label="Fecha" value={contribForm.date} onChange={v=>uc('date',v)} type="date" required/><Inp label="Monto" value={contribForm.amount} onChange={v=>uc('amount',v)} prefix="$" type="number" required error={contribForm.amount&&parseFloat(contribForm.amount)<=0?'Monto debe ser mayor a 0':''}/></div>
      <Inp label="Concepto" value={contribForm.concept} onChange={v=>uc('concept',v)} placeholder="Ej: Down payment, reparación techo" required/>
      <div><label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Socio</label><PPick partners={partners} selected={contribForm.paidBy} onChange={v=>uc('paidBy',v)}/></div>
    </Mdl>}

    {modal==='addStmt'&&<Mdl title={editId?'✏️ Editar Statement':'Statement Manual'} grad="from-slate-700 to-slate-800" onClose={()=>{setModal(null);setEditId(null)}} footer={<><button onClick={()=>{setModal(null);setEditId(null)}} className="flex-1 py-2.5 border-2 border-slate-200 rounded-xl font-semibold text-sm text-slate-500">Cancelar</button><button onClick={()=>{const yr=parseInt(stmtForm.year),mo=parseInt(stmtForm.month);const data={year:yr,month:mo,revenue:parseFloat(stmtForm.revenue)||0,net:parseFloat(stmtForm.net)||0,commission:parseFloat(stmtForm.commission)||0,duke:parseFloat(stmtForm.duke)||0,water:parseFloat(stmtForm.water)||0,hoa:parseFloat(stmtForm.hoa)||0,maintenance:parseFloat(stmtForm.maintenance)||0,vendor:parseFloat(stmtForm.vendor)||0};if(editId){update('statements',editId,data)}else{if(stmts.find(s=>s.year===yr&&s.month===mo)){notify(`Ya existe statement para ${M[mo-1]} ${yr}`,"error");return;}save('statements',data);setStmtForm(x=>({...x,month:x.month<12?x.month+1:1,revenue:'',net:'',commission:'',duke:'',water:'',hoa:'',maintenance:'',vendor:''}))}}} disabled={!stmtForm.revenue} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm disabled:opacity-30">{editId?'Actualizar':'Guardar'}</button></>}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3"><Inp label="Año" value={stmtForm.year} onChange={v=>us('year',v)} type="number" disabled={!!editId}/><Sel label="Mes" value={stmtForm.month} onChange={v=>us('month',v)} options={M.map((m,i)=>({v:i+1,l:m}))}/></div>
      <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100"><div className="text-[10px] font-black text-emerald-700 uppercase mb-3">Ingresos</div><Inp label="Revenue Total" value={stmtForm.revenue} onChange={v=>us('revenue',v)} prefix="$" type="number" required error={stmtForm.revenue&&parseFloat(stmtForm.revenue)<=0?'Ingresa el revenue del periodo':''}/></div>
      <div className="bg-rose-50 rounded-2xl p-4 border border-rose-100"><div className="text-[10px] font-black text-rose-700 uppercase mb-3">Gastos</div><div className="grid grid-cols-1 md:grid-cols-2 gap-3"><Inp label="Comisión PM" value={stmtForm.commission} onChange={v=>us('commission',v)} prefix="$" type="number"/><Inp label="Electricidad" value={stmtForm.duke} onChange={v=>us('duke',v)} prefix="$" type="number"/><Inp label="Agua" value={stmtForm.water} onChange={v=>us('water',v)} prefix="$" type="number"/><Inp label="HOA" value={stmtForm.hoa} onChange={v=>us('hoa',v)} prefix="$" type="number"/><Inp label="Mantenimiento" value={stmtForm.maintenance} onChange={v=>us('maintenance',v)} prefix="$" type="number"/><Inp label="Vendor/Otros" value={stmtForm.vendor} onChange={v=>us('vendor',v)} prefix="$" type="number"/></div></div>
      <Inp label="Net al Owner" value={stmtForm.net} onChange={v=>us('net',v)} prefix="$" type="number"/>
    </Mdl>}

    {modal==='editMort'&&<Mdl title="Editar Hipoteca" grad="from-blue-600 to-blue-700" onClose={()=>setModal(null)} footer={<><button onClick={()=>setModal(null)} className="flex-1 py-2.5 border-2 border-slate-200 rounded-xl font-semibold text-sm text-slate-500">Cancelar</button><button onClick={async()=>{await saveMortgage();setModal(null)}} disabled={!(parseFloat(mortConfig.bal)>0)||!(parseFloat(mortConfig.rate)>0)||!(parseFloat(mortConfig.pay)>0)||savingMort} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm disabled:opacity-30 flex items-center justify-center gap-2">{savingMort&&<Loader2 size={14} className="animate-spin"/>}Guardar</button></>}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3"><Inp label="Balance" value={mortConfig.bal} onChange={v=>umc('bal',v)} prefix="$" type="number"/><Inp label="Tasa (%)" value={mortConfig.rate} onChange={v=>umc('rate',v)} type="number"/></div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3"><Inp label="Plazo (años)" value={mortConfig.term} onChange={v=>umc('term',v)} type="number"/><Inp label="Pago Mensual" value={mortConfig.pay} onChange={v=>umc('pay',v)} prefix="$" type="number"/><Inp label="Inicio" value={mortConfig.start} onChange={v=>umc('start',v)} type="date"/></div>
    </Mdl>}

    {modal==='repair'&&<Mdl title={editId?'✏️ Editar Ticket':'🔧 Nuevo Ticket de Reparación'} grad="from-amber-500 to-amber-600" onClose={()=>{setModal(null);setEditId(null)}} footer={<><button onClick={()=>{setModal(null);setEditId(null)}} className="flex-1 py-2.5 border-2 border-slate-200 rounded-xl font-semibold text-sm text-slate-500">Cancelar</button><button onClick={()=>{const data={...repairForm,amount:parseFloat(repairForm.amount)||0};if(editId){update('repairs',editId,data)}else{save('repairs',data)}}} disabled={!repairForm.title} className="flex-1 py-2.5 bg-amber-600 text-white rounded-xl font-bold text-sm disabled:opacity-30">{editId?'Actualizar':'Guardar'}</button></>}>
      <Inp label="Título" value={repairForm.title} onChange={v=>ur('title',v)} placeholder="Ej: Reparación de AC, Pintura exterior" required/>
      <div className="grid grid-cols-2 gap-3">
        <Inp label="Fecha" value={repairForm.date} onChange={v=>ur('date',v)} type="date" required/>
        <Inp label="Monto (USD)" value={repairForm.amount} onChange={v=>ur('amount',v)} prefix="$" type="number" min="0"/>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Sel label="Tipo" value={repairForm.category} onChange={v=>ur('category',v)} options={[{v:'repair',l:'🔧 Reparación urgente'},{v:'preventive',l:'🛡️ Mantenimiento preventivo'},{v:'capex',l:'📈 Mejora / CapEx'}]}/>
        <Sel label="Estado" value={repairForm.status} onChange={v=>ur('status',v)} options={[{v:'pending',l:'⚠ Pendiente'},{v:'progress',l:'⏳ En Progreso'},{v:'done',l:'✓ Completado'}]}/>
      </div>
      <Inp label="Vendor / Proveedor" value={repairForm.vendor} onChange={v=>ur('vendor',v)} placeholder="Ej: ABC Plumbing, Home Depot"/>
      <Inp label="Descripción (opcional)" value={repairForm.description} onChange={v=>ur('description',v)} placeholder="Detalles adicionales..."/>
      {partners.length>0&&<div><label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">¿Quién pagó?</label><PPick partners={partners} selected={repairForm.paidBy} onChange={v=>ur('paidBy',v)}/></div>}
    </Mdl>}

    {modal==='task'&&<Mdl title={editId?'✏️ Editar Obligación':'📋 Nueva Obligación'} grad="from-indigo-500 to-indigo-600" onClose={()=>{setModal(null);setEditId(null)}} footer={<><button onClick={()=>{setModal(null);setEditId(null)}} className="flex-1 py-2.5 border-2 border-slate-200 rounded-xl font-semibold text-sm text-slate-500">Cancelar</button><button onClick={()=>{const data={...taskForm,amount:taskForm.amount||''};if(editId){update('tasks',editId,data)}else{save('tasks',data)}}} disabled={!taskForm.title} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm disabled:opacity-30">{editId?'Actualizar':'Guardar'}</button></>}>
      <Inp label="Obligación" value={taskForm.title} onChange={v=>ut('title',v)} placeholder="Ej: Hipoteca, Seguro, Impuestos" required/>
      <div><label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">¿Quién paga?</label><div className="grid grid-cols-2 gap-2">{[['owner','👤 Propietario'],['pm','🏢 Property Manager']].map(([v,l])=><button key={v} type="button" onClick={()=>ut('payer',v)} className={`py-2.5 rounded-xl border-2 text-xs font-medium transition ${taskForm.payer===v?'border-blue-500 bg-blue-50 text-blue-700':'border-slate-200 text-slate-500'}`}>{l}</button>)}</div></div>
      <div className="grid grid-cols-2 gap-3">
        <Inp label="Monto (USD)" value={taskForm.amount} onChange={v=>ut('amount',v)} prefix="$" type="number" placeholder="1,850"/>
        <div><label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Frecuencia</label><div className="grid grid-cols-2 gap-2">{[['monthly','Mensual'],['annual','Anual']].map(([v,l])=><button key={v} type="button" onClick={()=>ut('frequency',v)} className={`py-2.5 rounded-xl border-2 text-xs font-medium transition ${taskForm.frequency===v?'border-blue-500 bg-blue-50 text-blue-700':'border-slate-200 text-slate-500'}`}>{l}</button>)}</div></div>
      </div>
      {taskForm.payer==='owner'&&<div className="grid grid-cols-2 gap-3">
        <Inp label="Próximo pago" value={taskForm.dueDate} onChange={v=>ut('dueDate',v)} type="date"/>
        <Sel label="Recordar antes de" value={taskForm.reminderDays} onChange={v=>ut('reminderDays',v)} options={[{v:'3',l:'3 días antes'},{v:'7',l:'1 semana antes'},{v:'15',l:'15 días antes'},{v:'30',l:'1 mes antes'},{v:'60',l:'2 meses antes'}]}/>
      </div>}
      <Inp label="Notas (opcional)" value={taskForm.notes} onChange={v=>ut('notes',v)} placeholder="Ej: Póliza #12345, County Tax"/>
    </Mdl>}

    {modal==='valuation'&&<Mdl title={editId?'✏️ Editar Valorización':'📈 Registrar Valor de Mercado'} grad="from-emerald-600 to-teal-600" onClose={()=>{setModal(null);setEditId(null)}} footer={<><button onClick={()=>{setModal(null);setEditId(null)}} className="flex-1 py-2.5 border-2 border-slate-200 rounded-xl font-semibold text-sm text-slate-500">Cancelar</button><button onClick={()=>{const data={date:valForm.date,value:parseFloat(valForm.value)||0,source:valForm.source,notes:valForm.notes};if(editId){update('valuations',editId,data)}else{save('valuations',data)}}} disabled={!valForm.value} className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-sm disabled:opacity-30">{editId?'Actualizar':'Guardar'}</button></>}>
      <Inp label="Fecha de Estimación" value={valForm.date} onChange={v=>uv('date',v)} type="date"/>
      <Inp label="Valor Estimado de Mercado" value={valForm.value} onChange={v=>uv('value',v)} prefix="$" type="number" placeholder="490,000"/>
      <Sel label="Fuente" value={valForm.source} onChange={v=>uv('source',v)} options={[{v:'manual',l:'Estimación propia'},{v:'zillow',l:'Zillow Zestimate'},{v:'redfin',l:'Redfin Estimate'},{v:'appraisal',l:'Avalúo profesional'},{v:'broker',l:'CMA de broker'},{v:'comps',l:'Comparables de mercado'}]}/>
      <Inp label="Notas (opcional)" value={valForm.notes} onChange={v=>uv('notes',v)} placeholder="Ej: Basado en venta de vecino por $500K"/>
      {valForm.value&&prop.purchasePrice>0&&<div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2 text-sm">
        <div className="flex justify-between"><span className="text-slate-500">Precio de Compra</span><span className="font-semibold">{fm(prop.purchasePrice)}</span></div>
        <div className="flex justify-between"><span className="text-slate-500">Valor Estimado</span><span className="font-bold text-emerald-600">{fm(parseFloat(valForm.value))}</span></div>
        <div className="flex justify-between border-t border-slate-200 pt-2"><span className="text-slate-600 font-semibold">Apreciación</span><span className={`font-extrabold ${parseFloat(valForm.value)>=prop.purchasePrice?'text-emerald-600':'text-rose-500'}`}>{((parseFloat(valForm.value)-prop.purchasePrice)/prop.purchasePrice*100).toFixed(1)}% ({fm(parseFloat(valForm.value)-prop.purchasePrice)})</span></div>
      </div>}
    </Mdl>}

    {modal==='upload'&&<Mdl title="📤 Subir Statements (PDF)" grad="from-blue-600 to-cyan-600" onClose={()=>setModal(null)}>
      <p className="text-sm text-slate-500 mb-3">Sube los PDFs de los owner statements de tu property manager.</p>
      <div className="flex flex-wrap gap-1.5 mb-3">{['IHM','Vacasa','Evolve','Guesty','Host U','Airbnb','Vrbo'].map(pm=><span key={pm} className="text-[10px] font-semibold bg-blue-50 text-blue-600 px-2 py-1 rounded-lg">{pm}</span>)}<span className="text-[10px] font-semibold bg-slate-100 text-slate-500 px-2 py-1 rounded-lg">+ otros</span></div>
      <label className="block border-2 border-dashed border-blue-300 rounded-2xl p-8 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all">
        <Upload size={32} className="text-blue-400 mx-auto mb-2"/>
        <div className="text-sm font-semibold text-blue-600">Haz clic aquí para seleccionar PDFs</div>
        <div className="text-xs text-slate-400 mt-1">Soporta múltiples archivos</div>
        <input type="file" accept=".pdf" multiple className="hidden" onChange={async e=>{
          const arr=[...e.target.files];
          e.target.value='';
          if(arr.length) await handlePDFs(arr);
        }}/>
      </label>
      {uploadLog.length>0&&<div className="space-y-2 mt-3 max-h-[300px] overflow-y-auto">{uploadLog.map((l,i)=>(
        <div key={i} className={`flex items-start gap-2 p-3 rounded-xl text-xs font-medium ${l.status==='ok'?'bg-emerald-50 text-emerald-700 border border-emerald-100':l.status==='warn'?'bg-amber-50 text-amber-700 border border-amber-100':l.status==='dup'?'bg-slate-50 text-slate-600 border border-slate-200':l.status==='processing'?'bg-blue-50 text-blue-700 border border-blue-100':'bg-rose-50 text-rose-700 border border-rose-100'}`}>
          <span className="shrink-0">{l.status==='ok'?'✅':l.status==='warn'?'⚠️':l.status==='dup'?'🔄':l.status==='processing'?'⏳':'❌'}</span>
          <div><div className="font-bold">{l.file}</div><div className="font-normal mt-0.5">{l.msg}</div></div>
        </div>
      ))}</div>}
      <div className="border-t border-slate-100 pt-3 mt-2">
        <button onClick={()=>{setModal('addStmt')}} className="w-full py-2.5 bg-slate-100 text-slate-600 rounded-xl font-semibold text-xs hover:bg-slate-200 transition flex items-center justify-center gap-2"><Plus size={14}/>O ingresar manualmente</button>
      </div>
    </Mdl>}

    {/* Toast notification */}
    {toast&&<div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] px-5 py-3 rounded-2xl shadow-2xl text-sm font-semibold flex items-center gap-2 animate-slide-in ${toast.type==='error'?'bg-rose-600 text-white':'bg-slate-800 text-white'}`} style={{animation:'slide-up 0.3s ease-out'}} onClick={()=>setToast(null)}>
      <span>{toast.type==='error'?'❌':'✅'}</span>{toast.msg}
    </div>}
  </div></DashboardContext.Provider>;
}

// ═══ ROOT ═══
export default function App() {
  const [user,setUser]=useState(null);const [ready,setReady]=useState(false);const [allProps,setAllProps]=useState([]);const [active,setActive]=useState(null);const [checking,setChecking]=useState(false);
  const [authMode,setAuthMode]=useState(null);
  const [addingProp,setAddingProp]=useState(false);
  useEffect(()=>onAuthStateChanged(auth,u=>{setUser(u);setReady(true);if(!u){setAllProps([]);setActive(null)}}),[]);
  useEffect(()=>{if(!user)return;setChecking(true);
    const q1=query(collection(db,'properties'),where('ownerId','==',user.uid));
    const q2=query(collection(db,'properties'),where('memberEmails','array-contains',user.email));
    let r1=[],r2=[];const merge=()=>{const m=new Map();[...r1,...r2].forEach(d=>m.set(d.id,d));const a=Array.from(m.values());setAllProps(a);if(!active&&a.length>0)setActive(a[0].id);setChecking(false)};
    const u1=onSnapshot(q1,s=>{r1=s.docs.map(d=>({id:d.id,...d.data()}));merge()});
    const u2=onSnapshot(q2,s=>{r2=s.docs.map(d=>({id:d.id,...d.data()}));merge()});
    return()=>{u1();u2()}},[user]);
  const ap=allProps.find(p=>p.id===active);
  if(!ready)return<div className="min-h-screen bg-[#080E1A] flex items-center justify-center"><div className="text-center"><div className="w-12 h-12 bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-600/20"><span className="text-sm font-black text-white">OD</span></div><Loader2 size={24} className="animate-spin text-blue-500 mx-auto"/></div></div>;
  if(!user){
    if(authMode)return<AuthScreen initialMode={authMode} onBack={()=>setAuthMode(null)}/>;
    return<LandingPage onLogin={m=>setAuthMode(m)}/>;
  }
  if(checking)return<div className="min-h-screen bg-[#080E1A] flex items-center justify-center"><div className="text-center"><div className="w-12 h-12 bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-600/20"><span className="text-sm font-black text-white">OD</span></div><Loader2 size={24} className="animate-spin text-blue-500 mx-auto mb-3"/><p className="text-white/30 text-sm">Cargando propiedades...</p></div></div>;
  if(!allProps.length||!ap||addingProp)return<Onboarding userId={user.uid} onComplete={id=>{setActive(id);setAddingProp(false)}} onBack={allProps.length>0?()=>{setAddingProp(false);if(!active&&allProps.length)setActive(allProps[0].id)}:null}/>;
  return<Dashboard propertyId={active} propertyData={ap} allProperties={allProps} onSwitchProperty={setActive} onLogout={()=>signOut(auth)} onAddProperty={()=>setAddingProp(true)} userEmail={user.email}/>;
}
