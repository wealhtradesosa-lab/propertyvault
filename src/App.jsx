import React, { useState, useEffect, useMemo, useCallback, useRef, lazy, Suspense } from 'react';
import { db, auth } from './firebase';
import { collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, serverTimestamp, where, updateDoc, getDocs, setDoc } from 'firebase/firestore';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, Legend, ComposedChart, Line, LineChart } from 'recharts';
import { Home, DollarSign, Users, Plus, Building2, X, Trash2, Loader2, LogOut, Lock, Mail, Receipt, Landmark, UserPlus, ClipboardList, Eye, EyeOff, ChevronDown, Upload, TrendingUp, BarChart3, Calendar, Layers, ArrowUpRight, ArrowDownRight, AlertTriangle, CheckCircle, Settings, Target, Pencil, Menu, Wrench, Clock, Printer, MessageSquare, Send, Moon, Sun } from 'lucide-react';

import { ADMIN_EMAILS, VIP_EMAILS, C, M, fm, fmCurrency, fmDate, pct, CATS, getCats, getTerms, COUNTRIES, CURRENCY_LIST, US_STATES as US, PROPERTY_TYPES as PT } from './lib/constants';
import { createT } from './lib/i18n';
// PDF parser loaded dynamically — delays 328KB pdf.js chunk until first upload
let _parsePDF = null, _parseMortgage = null;
const loadParsers = async () => {
  if (!_parsePDF) {
    const mod = await import('./lib/pdfParser');
    _parsePDF = mod.parsePDF;
    _parseMortgage = mod.parseMortgageStatement;
  }
  return { parsePDF: _parsePDF, parseMortgageStatement: _parseMortgage };
};
import { Inp, Sel, PPick, Mdl, Empty, Tbl, Tip, UpgradeBanner, KPI } from './components/ui';
const LandingPage = lazy(() => import('./components/LandingPage').then(m => ({ default: m.LandingPage })));
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
  const isVIP=VIP_EMAILS.includes(userEmail.toLowerCase());
  const [userPlan,setUserPlan]=useState(isAdmin?'pro':'free');
  const [trialDays,setTrialDays]=useState(0);const [isTrial,setIsTrial]=useState(false);
  useEffect(()=>{if(isAdmin||isVIP){if(isVIP)setUserPlan('pro');return;}const ref=doc(db,'users',userEmail.toLowerCase());const unsub=onSnapshot(ref,async(snap)=>{if(snap.exists()){const d=snap.data();if((d.status==='active'||d.status==='past_due')&&d.plan&&d.plan!=='free'){setUserPlan(d.plan);setIsTrial(false);setTrialDays(0);return;}if(d.trialStartDate){const start=d.trialStartDate.toDate?d.trialStartDate.toDate():new Date(d.trialStartDate);const elapsed=Math.floor((Date.now()-start.getTime())/(1000*60*60*24));const remaining=14-elapsed;if(remaining>0){setUserPlan('pro');setIsTrial(true);setTrialDays(remaining)}else{setUserPlan('free');setIsTrial(false);setTrialDays(0)}}else{try{await setDoc(ref,{trialStartDate:serverTimestamp(),email:userEmail},{merge:true});setUserPlan('pro');setIsTrial(true);setTrialDays(14)}catch(e){setUserPlan('free')}}}else{try{await setDoc(ref,{trialStartDate:serverTimestamp(),email:userEmail},{merge:true});setUserPlan('pro');setIsTrial(true);setTrialDays(14)}catch(e){setUserPlan('free')}}},()=>{});return()=>unsub()},[userEmail,isAdmin,isVIP]);
  const plan=isAdmin?'pro':userPlan;
  const canUse=(feature)=>{if(isAdmin||isVIP)return true;const access={free:['dashboard_basic','upload','expenses','income'],starter:['dashboard_basic','upload','expenses','income','insights','str_metrics','breakeven','annual','partners','mortgage','history','seasonality'],pro:['dashboard_basic','upload','expenses','income','insights','str_metrics','breakeven','annual','partners','mortgage','history','seasonality','reports','valuation','pipeline','repairs','portfolio']};return(access[plan]||access.free).includes(feature);};
  const [view,setView]=useState('dashboard');const [modal,setModal]=useState(null);const [rptTab,setRptTab]=useState('performance');const [stmtPage,setStmtPage]=useState(0);const [stmtYearFilter,setStmtYearFilter]=useState('all');const PER_PAGE=12;const [dashYear,setDashYear]=useState('all');const [viewCur,setViewCur]=useState(null);
  const [portData,setPortData]=useState(null);const [portLoading,setPortLoading]=useState(false);
  const [expenses,setExpenses]=useState([]);const [income,setIncome]=useState([]);const [contribs,setContribs]=useState([]);const [stmts,setStmts]=useState([]);
  const [loading,setLoading]=useState(true);const [extraP,setExtraP]=useState('');const [extraPA,setExtraPA]=useState('');const [uploadLog,setUploadLog]=useState([]);const fileRef=useRef(null);
  const [parsedPreview,setParsedPreview]=useState(null);
  const [valuations,setValuations]=useState([]);const [mobileNav,setMobileNav]=useState(false);const [repairs,setRepairs]=useState([]);const [tasks,setTasks]=useState([]);
  const [dark,setDark]=useState(()=>{try{return localStorage.getItem('od-dark')==='1'}catch{return false}});
  const [lang,setLang]=useState(()=>{try{return localStorage.getItem('od-lang')||(prop.country&&!['US','GB'].includes(prop.country)?'es':'en')}catch{return 'en'}});
  const t=createT(lang);
  const toggleLang=()=>{const nl=lang==='en'?'es':'en';setLang(nl);try{localStorage.setItem('od-lang',nl)}catch{}};
  useEffect(()=>{document.documentElement.classList.toggle('dark',dark);try{localStorage.setItem('od-dark',dark?'1':'0')}catch{}},[dark]);
  const [tickets,setTickets]=useState([]);const [ticketForm,setTicketForm]=useState({type:'bug',subject:'',message:'',priority:'medium'});
  const [toast,setToast]=useState(null);
  const [liveTRM,setLiveTRM]=useState(null);
  useEffect(()=>{
    const fetchTRM=async()=>{try{const r=await fetch('https://open.er-api.com/v6/latest/USD');const d=await r.json();if(d.rates)setLiveTRM({COP:d.rates.COP,EUR:d.rates.EUR,MXN:d.rates.MXN,GBP:d.rates.GBP,BRL:d.rates.BRL,updated:new Date().toLocaleTimeString('es',{hour:'2-digit',minute:'2-digit'})})}catch(e){console.log('TRM fetch failed',e)}};
    fetchTRM();const interval=setInterval(fetchTRM,3600000);return()=>clearInterval(interval);
  },[]);
  const notify=(msg,type='success')=>{setToast({msg,type});setTimeout(()=>setToast(null),4000)};
  const [valForm,setValForm]=useState({date:'',value:'',source:'manual',notes:''});const uv=useCallback((k,v)=>setValForm(x=>({...x,[k]:v})),[]);
  const [repairForm,setRepairForm]=useState({date:'',title:'',description:'',amount:'',vendor:'',category:'repair',status:'pending',paidBy:''});const ur=useCallback((k,v)=>setRepairForm(x=>({...x,[k]:v})),[]);
  const [incForm,setIncForm]=useState({date:'',amount:'',source:'direct',concept:'',currency:'USD',nights:''});const uif=useCallback((k,v)=>setIncForm(x=>({...x,[k]:v})),[]);
  const [taskForm,setTaskForm]=useState({title:'',dueDate:'',priority:'medium',status:'pending',notes:'',amount:'',frequency:'annual',payer:'owner',reminderDays:'30'});const ut=useCallback((k,v)=>setTaskForm(x=>({...x,[k]:v})),[]);
  const [settingsForm,setSettingsForm]=useState(null);
  const [editPartners,setEditPartners]=useState(null);
  const [mortConfig,setMortConfig]=useState({bal:'',rate:'',term:'30',pay:'',start:'',includesTaxes:false,includesInsurance:false});const [savingMort,setSavingMort]=useState(false);
  const umc=useCallback((k,v)=>setMortConfig(x=>({...x,[k]:v})),[]);
  const partners=prop.partners||[];const mort=prop.mortgage||{};
  const [expenseForm,setExpenseForm]=useState({date:'',concept:'',amount:'',paidBy:partners[0]?.id||'',category:'otros',type:'additional',frequency:'once',expCurrency:''});const [editId,setEditId]=useState(null);
  const [nf,setNf]=useState({date:'',month:'',grossAmount:''});
  const [contribForm,setContribForm]=useState({date:'',concept:'',amount:'',paidBy:partners[0]?.id||'',purpose:'operations'});
  const [stmtForm,setStmtForm]=useState({year:new Date().getFullYear(),month:1,revenue:'',net:'',commission:'',duke:'',water:'',hoa:'',maintenance:'',vendor:'',nights:'',reservations:''});
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
  const catMap={'Hipoteca':'mortgage_pay','Taxes':'taxes','Impuesto Predial':'predial','Insurance':'insurance','Insurances':'insurance','Contabilidad':'contabilidad','HOA':'hoa','Administración':'hoa','Personal de Servicio':'personal','Prestaciones Sociales':'prestaciones','Jardinería':'jardineria'};
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
  const saveMortgage=async()=>{setSavingMort(true);try{const data={balance:parseFloat(mortConfig.bal)||0,rate:parseFloat(mortConfig.rate)||0,termYears:parseInt(mortConfig.term)||30,monthlyPayment:parseFloat(mortConfig.pay)||0,startDate:mortConfig.start||'',includesTaxes:!!mortConfig.includesTaxes,includesInsurance:!!mortConfig.includesInsurance};const p=window.__mortParsed;if(p?.parsed){data.principalAndInterest=p.principalAndInterest||0;data.principal=p.principal||0;data.interest=p.interest||0;data.taxEscrow=p.taxEscrow||0;data.insuranceEscrow=p.insuranceEscrow||0;data.taxAndInsuranceCombined=p.taxAndInsuranceCombined||0;data.otherEscrow=p.otherEscrow||0;data.servicer=p.servicer||'';window.__mortParsed=null;}await updateDoc(doc(db,'properties',propertyId),{mortgage:data})}catch(e){notify('Error: '+e.message,'error')}setSavingMort(false)};

  // PDF Upload handler — with robust duplicate detection
  const handlePDFs=async(files)=>{
    const fileArr=Array.from(files);
    if(fileArr.length>15){notify(`Máximo 15 PDFs. Seleccionaste ${fileArr.length}`,'error');return;}
    const log=[];
    let existingPeriods=new Set();
    try{
      const freshSnap=await getDocs(collection(db,'properties',propertyId,'statements'));
      existingPeriods=new Set(freshSnap.docs.map(d=>{const s=d.data();return s.year+'-'+s.month}));
    }catch(e){/* ignore */}

    const allParsed=[];

    for(let fi=0; fi<fileArr.length; fi++){
      const f=fileArr[fi];
      if(!f.name.toLowerCase().endsWith('.pdf')){log.push({file:f.name,status:'error',msg:'No es un archivo PDF'});setUploadLog([...log]);continue;}
      log.push({file:f.name,status:'processing',msg:`Procesando... (${fi+1}/${fileArr.length})`});setUploadLog([...log]);
      try{
        const {parsePDF:pPDF}=await loadParsers();const rawResult=await pPDF(f);
        if(rawResult.error){log[log.length-1]={file:f.name,status:'error',msg:rawResult.error};setUploadLog([...log]);continue;}
        const results=Array.isArray(rawResult)?rawResult:[rawResult];
        const fmt=results[0]?.format||'Unknown';
        results.forEach(r=>{
          const key=r.year+'-'+r.month;
          const isDup=existingPeriods.has(key);
          allParsed.push({...r,_file:f.name,_format:fmt,_dup:isDup,_include:!isDup&&(r.revenue>0||r.net>0)});
        });
        log[log.length-1]={file:f.name,status:'ok',msg:`[${fmt}] ${results.length} ${results.length>1?'meses encontrados':'mes encontrado'}`};
        setUploadLog([...log]);
      }catch(e){log[log.length-1]={file:f.name,status:'error',msg:'Error: '+(e.message||String(e))};setUploadLog([...log]);}
    }

    if(allParsed.length>0){
      setParsedPreview({results:allParsed,existingPeriods});
      setModal('reviewParsed');
    }
  };

  const saveParsedResults=async()=>{
    if(!parsedPreview)return;
    const toSave=parsedPreview.results.filter(r=>r._include);
    let saved=0;
    for(const r of toSave){
      const {_file,_format,_dup,_include,...stmtData}=r;
      try{await addDoc(collection(db,'properties',propertyId,'statements'),{...stmtData,createdAt:serverTimestamp()});saved++;}catch(e){/* skip */}
    }
    notify(lang==='es'?`${saved} statements guardados`:`${saved} statements saved`,'success');
    setParsedPreview(null);setModal(null);
  };

  // ═══ CALCULATIONS ═══
  // Effective frequency: "Fijo" without explicit frequency = monthly (permanent)
  const eFreq=(e)=>{if(!e)return 'once';return e.frequency||(e.type==='fixed'?'monthly':'once')};
  const isRecurring=(e)=>{if(!e)return false;const f=eFreq(e);return f==='monthly'||f==='annual';};
  const pt=useMemo(()=>{const r={};partners.forEach(p=>{r[p.id]={name:p.name,color:p.color,own:p.ownership,cont:0,exp:0,inc:0}});contribs.forEach(c=>{if(r[c.paidBy])r[c.paidBy].cont+=c.amount||0});expenses.forEach(e=>{if(r[e.paidBy])r[e.paidBy].exp+=e.amount||0});const tn=income.reduce((s,i)=>s+(i.netAmount||0),0);partners.forEach(p=>{r[p.id].inc=tn*(p.ownership/100)});return r},[partners,contribs,expenses,income]);

  const propCountry=prop.country||'US';
  const propCurrency=prop.currency||'USD';
  const fmP=v=>fmCurrency(v,propCurrency);
  const propCats=getCats(propCountry,lang);
  const propTerms=getTerms(propCountry);

  // Global display formatter — respects currency toggle everywhere
  const gXr=prop.exchangeRate||(liveTRM&&liveTRM.COP?liveTRM.COP:1);
  const gVc=viewCur||propCurrency;
  const gConv=(v)=>{if(gVc===propCurrency||gXr<=1)return v;if(gVc==='USD'&&propCurrency!=='USD')return v/gXr;if(gVc!=='USD'&&propCurrency==='USD')return v*gXr;return v};
  const gFm=(v)=>fmCurrency(gConv(v),gVc);
  // Statement formatter: statements are always stored in USD — convert to view currency
  const sConv=(v)=>{
    if(!v)return 0;
    const inPC=propCurrency!=='USD'&&gXr>1?v*gXr:v;
    return gConv(inPC);
  };
  const sFm=(v)=>fmCurrency(sConv(v),gVc);
  const CurToggle=()=>gXr>1?<div className="flex gap-1 shrink-0">{[propCurrency,...(propCurrency==='USD'?['COP']:['USD'])].map(c=><button key={c} onClick={()=>setViewCur(c===propCurrency?null:c)} className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition ${(viewCur||propCurrency)===c?'bg-blue-600 text-white':'bg-white border border-blue-200 text-blue-500 hover:bg-blue-50'}`}>{c}</button>)}</div>:null;

  const xr=gXr;const toPropCur=(amt,cur)=>{if(!cur||cur===propCurrency)return amt;if(cur==='USD'&&propCurrency!=='USD')return amt*xr;if(cur!=='USD'&&propCurrency==='USD')return amt/xr;return amt;};
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
  // Cash-on-Cash = Annual Cash Flow / Capital Invested Invested
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

  const fixedExp=useMemo(()=>expenses.filter(e=>{const c=propCats.find(x=>x.v===e.category);return c?.fixed||e.type==='fixed'}),[expenses,propCats,lang]);
  const additionalExp=useMemo(()=>expenses.filter(e=>{const c=propCats.find(x=>x.v===e.category);return !c?.fixed&&e.type!=='fixed'}),[expenses,propCats,lang]);
  const expByCat=useMemo(()=>{const r={};const escrowCats=[];if(mort.includesTaxes){escrowCats.push('taxes','predial')};if(mort.includesInsurance){escrowCats.push('insurance')};expenses.filter(e=>e.category!=='mortgage_pay'&&!escrowCats.includes(e.category)&&!/hipoteca|mortgage|debt.service/i.test(e.concept||'')).forEach(e=>{const c=propCats.find(x=>x.v===e.category);const k=(!c||e.category==='otros'||!e.category)?'_other':e.category;if(!r[k])r[k]={name:c?c.l:(lang==='es'?'Otros':'Other'),value:0,monthly:0};const amt=toPropCur(e.amount||0,e.expCurrency);const f=eFreq(e);const mo=f==='annual'?amt/12:f==='monthly'?amt:amt;r[k].value+=amt;r[k].monthly+=(f==='annual'?amt/12:f==='monthly'?amt:0)});return Object.values(r).sort((a,b)=>b.monthly-a.monthly||b.value-a.value)},[expenses,propCats,lang,mort]);

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
  const nav=[{id:'dashboard',icon:<Home size={18}/>,l:t('dashboard')},...(allProperties.length>1?[{id:'portfolio',icon:<Layers size={18}/>,l:lang==='es'?'Portafolio':'Portfolio'}]:[]),{id:'partners',icon:<Users size={18}/>,l:t('partnersCapital')},{id:'statements',icon:<ClipboardList size={18}/>,l:t('statements')},{id:'expenses',icon:<Receipt size={18}/>,l:t('expenses')},{id:'income',icon:<DollarSign size={18}/>,l:t('income')},{id:'mortgage',icon:<Landmark size={18}/>,l:t('mortgageNav')},{id:'repairs',icon:<Wrench size={18}/>,l:t('repairs')},{id:'valuation',icon:<TrendingUp size={18}/>,l:t('appreciationNav')},{id:'pipeline',icon:<Clock size={18}/>,l:t('obligations')},{id:'reports',icon:<Target size={18}/>,l:t('reports')},{id:'support',icon:<MessageSquare size={18}/>,l:t('support')},{id:'settings',icon:<Settings size={18}/>,l:t('settings')}];

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
          <div className="flex items-center gap-3"><div className="w-10 h-10 bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 rounded-xl flex items-center justify-center shadow-md shadow-blue-600/20"><span className="text-xs font-black text-white tracking-tighter">OD</span></div><div className="min-w-0"><div className="text-sm font-extrabold text-slate-800 truncate">Owner<span className="text-blue-600">Desk</span></div><div className="text-[10px] text-slate-400 truncate">{userEmail}</div>{isAdmin?<div className="text-[9px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full inline-block mt-1">OWNER · PRO ∞</div>:isVIP?<div className="text-[9px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full inline-block mt-1">⭐ VIP · PRO</div>:isTrial?<div className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full inline-block mt-1">🎁 PRO TRIAL · {trialDays}d</div>:<div className={`text-[9px] font-bold px-2 py-0.5 rounded-full inline-block mt-1 ${plan==='pro'?'text-purple-600 bg-purple-50':plan==='starter'?'text-blue-600 bg-blue-50':'text-slate-500 bg-slate-100'}`}>{plan==='pro'?'PRO':plan==='starter'?'STARTER':'FREE'}</div>}</div></div>
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

    <div className="flex-1 overflow-auto overflow-x-hidden" role="main"><div className="p-3 md:p-6 pt-[72px] md:pt-6 max-w-[1200px] lg:mx-auto">
    {liveTRM&&liveTRM.COP&&<div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/30 rounded-xl px-3 py-1.5 mb-3 border border-blue-100 dark:border-blue-800">
      <div className="flex items-center gap-2 text-[11px]"><span className="font-bold text-blue-700 dark:text-blue-300">TRM</span><span className="text-blue-600 dark:text-blue-400">1 USD = <b>{liveTRM.COP.toLocaleString('es',{maximumFractionDigits:2})}</b> COP</span><span className="text-blue-300 dark:text-blue-500">· {liveTRM.updated}</span></div>
      {propCurrency!=='USD'&&Math.abs((liveTRM[propCurrency]||0)-(prop.exchangeRate||0))>10&&<button onClick={async()=>{try{await updateDoc(doc(db,'properties',propertyId),{exchangeRate:liveTRM[propCurrency]});notify(`Tasa actualizada: 1 USD = ${liveTRM[propCurrency].toLocaleString('es')} ${propCurrency}`)}catch(e){notify('Error: '+e.message,'error')}}} className="text-[10px] font-bold text-blue-600 dark:text-blue-300 bg-blue-100 dark:bg-blue-800 px-2 py-1 rounded-lg hover:bg-blue-200 transition shrink-0">Actualizar tasa ↗</button>}
    </div>}
    {/* Trial banner */}
    {isTrial&&!isAdmin&&!isVIP&&<div className={`${trialDays<=3?'bg-gradient-to-r from-amber-500 to-rose-500':'bg-gradient-to-r from-emerald-500 to-blue-500'} rounded-2xl p-3 mb-4 flex items-center justify-between no-print`}>
      <div className="flex items-center gap-2"><span className="text-lg">{trialDays<=3?'⏰':'🎁'}</span><div><div className="text-white text-xs font-bold">{trialDays<=3?(lang==='es'?`¡Tu trial termina en ${trialDays} día${trialDays>1?'s':''}!`:`Your trial ends in ${trialDays} day${trialDays>1?'s':''}!`):(lang==='es'?`Trial Pro — ${trialDays} días restantes`:`Pro Trial — ${trialDays} days left`)}</div><div className="text-white/70 text-[10px]">{trialDays<=3?(lang==='es'?'Elige un plan para no perder acceso a tus datos y funciones.':'Choose a plan to keep access to your data and features.'):(lang==='es'?'Acceso completo a todas las funciones. Sin tarjeta de crédito.':'Full access to all features. No credit card.')}</div></div></div>
      <button onClick={()=>{const el=document.getElementById('pricing');if(el)el.scrollIntoView({behavior:'smooth'});else window.open('https://ownerdesk.web.app/#pricing','_blank')}} className="px-4 py-2 bg-white text-blue-600 text-[11px] font-bold rounded-xl hover:bg-blue-50 transition shrink-0">{lang==='es'?'Ver planes':'See plans'}</button>
    </div>}

    <ViewGuard>

    {/* ═══ DASHBOARD VIEW ═══ */}
    {view==='dashboard'&&(()=>{try{
      const isOwnerManaged=prop.managedBy==='owner';
      const fy=dashYear==='all'?null:annual.find(y=>y.year===dashYear);
      const fStmts=dashYear==='all'?stmts:stmts.filter(s=>s.year===dashYear);
      const n=fy?fy.n:(stmts.length||0);

      // Exchange rate and conversion helpers
      const xRate=prop.exchangeRate||(liveTRM&&liveTRM.COP?liveTRM.COP:1);

      // Convert statement values (always USD) to property currency
      const stmtToPC=(v)=>propCurrency!=='USD'&&xRate>1?v*xRate:v;

      // Raw statement values (in USD from Airbnb/PM)
      const rawRev=fy?fy.revenue:(revenue||0);
      const rawNet=fy?fy.net:((stmtNet||totNet)||0);
      const rawComm=fy?(fy.commission||0):(stmtComm||0);
      const rawDuke=fy?(fy.duke||0):(stmtDuke||0);
      const rawHoa=fy?(fy.hoa||0):(stmtHoa||0);
      const rawMaint=fy?(fy.maintenance||0):(stmtMaint||0);
      const rawWater=fy?(fy.water||0):(stmtWater||0);
      const rawVendor=fy?(fy.vendor||0):(stmtVendor||0);

      // Direct booking income (from income collection)
      const fIncomeEntries=dashYear==='all'?income:income.filter(i=>{const d=i.date||'';const yr=parseInt(d.split('-')[0]);return yr===dashYear});
      const directIncomePC=fIncomeEntries.reduce((s,i)=>{const amt=i.amount||0;const cur=i.currency||'USD';if(cur===propCurrency)return s+amt;if(cur==='USD'&&propCurrency!=='USD')return s+amt*xRate;if(cur!=='USD'&&propCurrency==='USD')return s+amt/xRate;return s+amt},0);

      // Everything in PROPERTY CURRENCY for calculations
      const fRev=stmtToPC(rawRev)+directIncomePC;
      const fNet=stmtToPC(rawNet);
      const fComm=stmtToPC(rawComm);
      const fDuke=stmtToPC(rawDuke);
      const fHoa=stmtToPC(rawHoa);
      const fMaint=stmtToPC(rawMaint);
      const fWater=stmtToPC(rawWater);
      const fVendor=stmtToPC(rawVendor);
      const fOpEx=fComm+fDuke+fHoa+fMaint+fWater+fVendor;

      // Display currency toggle (converts from property currency to view currency)
      const vc=viewCur||propCurrency;
      const dConv=(v)=>{if(vc===propCurrency||xRate<=1)return v;if(vc==='USD'&&propCurrency!=='USD')return v/xRate;if(vc!=='USD'&&propCurrency==='USD')return v*xRate;return v};
      const dFm=(v)=>fmCurrency(dConv(v),vc);

      // Convert expense amounts to property currency
      const toPC=(amt,cur)=>{
        if(!cur||cur===propCurrency)return amt;
        if(cur==='USD'&&propCurrency!=='USD')return amt*xRate;
        if(cur!=='USD'&&propCurrency==='USD')return amt/xRate;
        return amt;
      };

      // ═══ P&L — SIMPLE AND CORRECT ═══
      // 
      // Gross Revenue                    (from statements/platform)
      // (-) PM Operating Expenses        (from statements: commission, utilities, HOA, etc.)
      // (-) Owner Operating Expenses     (from Gastos: personal, energía, predial, etc.)
      // = NOI (Net Operating Income)
      // (-) Debt Service                 (mortgage payments)
      // = Cash Flow
      //

      // 1. Owner expenses from Gastos section (recurring apply to ALL periods)
      const recurringExp=expenses.filter(e=>isRecurring(e));
      const oneTimeExp=dashYear==='all'?expenses.filter(e=>!isRecurring(e)):expenses.filter(e=>!isRecurring(e)&&(e.date||'').startsWith(String(dashYear)));
      const yearExpenses=[...recurringExp,...oneTimeExp];
      // Exclude from OpEx: mortgage expenses + escrow-covered categories
      const isMortgageExp=(e)=>e.category==='mortgage_pay'||/hipoteca|mortgage|debt.service/i.test(e.concept||'');
      const isEscrowCovered=(e)=>{
        if(mort.includesTaxes&&(e.category==='taxes'||e.category==='predial'))return true;
        if(mort.includesInsurance&&e.category==='insurance')return true;
        return false;
      };
      const isExcludedFromOpEx=(e)=>isMortgageExp(e)||isEscrowCovered(e);
      const ownerExpTotal=yearExpenses.filter(e=>!isExcludedFromOpEx(e)).reduce((s,e)=>{
        const amt=toPC(e.amount||0,e.expCurrency);
        const f=eFreq(e);
        if(f==='annual')return s+amt/12*(n||1);
        if(f==='monthly')return s+amt*(n||1);
        return s+amt;
      },0);

      // 2. Total OpEx = PM expenses (from statements) + Owner expenses (from Gastos)
      const totalOpEx=fOpEx+ownerExpTotal;

      // 3. NOI = Revenue - ALL operating expenses
      const fNoi=fRev-totalOpEx;

      // 4. Debt Service
      // Debt Service: use configured mortgage, OR fall back to mortgage_pay expenses
      const mMort=mort.monthlyPayment||0;
      const mortFromExpenses=yearExpenses.filter(e=>isMortgageExp(e)).reduce((s,e)=>{
        const amt=toPC(e.amount||0,e.expCurrency);
        const f=eFreq(e);
        if(f==='annual')return s+amt/12*(n||1);
        if(f==='monthly')return s+amt*(n||1);
        return s+amt;
      },0);
      const fMortP=mMort>0?(mMort*n):mortFromExpenses;

      // 5. Cash Flow = NOI - Mortgage
      const fCF=fNoi-fMortP;
      const fCFmo=n>0?fCF/n:0;
      const partial=n>0&&n<12;
      const proyAnual=partial&&n>0?(fCF/n)*12:fCF;
      const fMargin=fRev>0?(fNoi/fRev*100):0;
      const noiAnual=partial&&n>0?fNoi/n*12:fNoi;
      const fCapR=marketValue>0?(noiAnual/marketValue*100):0;
      const fCoc=totCont>0?(proyAnual/totCont*100):0;
      const fDscr=mMort>0?(noiAnual/(mMort*12)):0;
      const directNights=fIncomeEntries.reduce((s,i)=>s+(i.nights||0),0);
      const fNights=(fy?(fy.nights||0):fStmts.reduce((s,x)=>s+(x.nights||0),0))+directNights;
      const fRes=(fy?(fy.reservations||0):fStmts.reduce((s,x)=>s+(x.reservations||0),0))+fIncomeEntries.length;
      const availNights=dashYear==='all'?(stmts.length>0?Math.round((stmts.length/12)*365):0):Math.round(n>=12?365:n*30.44);
      const occupancy=availNights>0&&fNights>0?Math.min(100,fNights/availNights*100):0;
      const adr=fNights>0?fRev/fNights:(n>0?fRev/(n*30):0);
      const revpar=availNights>0?fRev/availNights:0;
      const prevYr=dashYear!=='all'?annual.find(y=>y.year===dashYear-1):null;
      const revChg=prevYr&&prevYr.revenue?((fRev-prevYr.revenue)/prevYr.revenue*100):null;
      const chartColors=['#E11D48','#F59E0B','#06B6D4','#8B5CF6','#10B981','#64748B','#DB2777','#EA580C'];
      const expData=isOwnerManaged?
        (()=>{const cp={};yearExpenses.filter(e=>!isExcludedFromOpEx(e)).forEach(e=>{const c=propCats.find(x=>x.v===e.category);const ck=(!c||e.category==='otros'||!e.category)?'_other':e.category;if(!cp[ck])cp[ck]={name:c?c.l:(lang==='es'?'Otros':'Other'),value:0};const amt=toPC(e.amount||0,e.expCurrency);const ef=eFreq(e);if(ef==='annual')cp[ck].value+=amt/12*(n||1);else if(ef==='monthly')cp[ck].value+=amt*(n||1);else cp[ck].value+=amt});return Object.values(cp).sort((a,b)=>b.value-a.value).filter(c=>c.value>0).map((c,i)=>({name:c.name,value:c.value,fill:chartColors[i%chartColors.length]}))})():
        [['Commission',fComm,'#E11D48'],[t('electricity'),fDuke,'#F59E0B'],[t('water'),fWater,'#06B6D4'],['HOA',fHoa,'#8B5CF6'],[t('maintenance'),fMaint,'#10B981'],['Other',fVendor,'#64748B']].filter(([_,v])=>v>0).map(([name,value,fill])=>({name,value,fill}));
      const ownerMonthly=n>0?ownerExpTotal/n:0;
      const mChart=[...fStmts].sort((a,b)=>a.year*100+a.month-b.year*100-b.month).map(s=>{const rev=stmtToPC(s.revenue||0);const directForMonth=income.filter(i=>{const d=i.date||'';const [iy,im]=d.split('-').map(Number);return iy===s.year&&im===s.month}).reduce((sum,i)=>{const amt=i.amount||0;const cur=i.currency||'USD';if(cur===propCurrency)return sum+amt;if(cur==='USD'&&propCurrency!=='USD')return sum+amt*xRate;return sum+amt},0);const totalRev=rev+directForMonth;const pmExp=stmtToPC((s.commission||0)+(s.duke||0)+(s.water||0)+(s.hoa||0)+(s.maintenance||0)+(s.vendor||0));const exp=pmExp+ownerMonthly;const cf=totalRev-exp-(mMort>0?mMort:(mortFromExpenses/Math.max(n,1)));return{m:M[s.month-1]+(dashYear==='all'?'\''+String(s.year).slice(2):''),rev:totalRev,exp,cf}});

      return <>
      <div className="hidden print-header"><div style={{display:'flex',justifyContent:'space-between'}}><div><h1 style={{fontSize:'18px',fontWeight:800,margin:0}}>{prop.name}</h1><p style={{fontSize:'9px',color:'#64748B',margin:'3px 0'}}>{prop.address}, {prop.city} {prop.state} · {new Date().toLocaleDateString('es',{day:'2-digit',month:'long',year:'numeric'})}</p></div><div style={{fontSize:'18px',fontWeight:900,color:'#1E3A5F'}}>OD</div></div></div>

      <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-3 mb-4 no-print">
        <div className="hidden md:block"><h1 className="text-lg md:text-xl font-extrabold text-slate-800">{prop.name}</h1><p className="text-xs text-slate-400 mt-0.5">{prop.address}, {prop.city} {prop.state}</p></div>
        <div className="flex gap-2">
          <button onClick={()=>window.print()} aria-label="Imprimir" className="hidden md:flex px-3 py-2 bg-slate-100 text-slate-500 text-xs rounded-xl font-bold hover:bg-slate-200 items-center gap-1.5"><Printer size={13}/></button>
          <button onClick={()=>setModal('recordWhat')} className="flex-1 md:flex-none px-4 py-3 md:py-2 bg-slate-700 text-white text-xs rounded-xl font-bold hover:bg-slate-800 active:bg-slate-900 flex items-center justify-center gap-1.5 shadow-sm"><Plus size={14}/> {lang==='es'?'Registrar':'Record'}</button>
          <button onClick={()=>{setUploadLog([]);setModal('upload')}} className="flex-1 md:flex-none px-4 py-3 md:py-2 bg-blue-600 text-white text-xs rounded-xl font-bold hover:bg-blue-700 active:bg-blue-800 flex items-center justify-center gap-1.5 shadow-sm"><Upload size={14}/> Statements</button>
        </div>
      </div>

      {annual.length>0&&<div className="flex items-center gap-1.5 mb-4 no-print overflow-x-auto pb-1">
        <button onClick={()=>setDashYear('all')} className={`px-3.5 py-2 rounded-xl text-xs font-bold transition ${dashYear==='all'?'bg-slate-800 text-white':'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'}`}>{t('allTime')}</button>
        {annual.map(y=><button key={y.year} onClick={()=>setDashYear(y.year)} className={`px-3.5 py-2 rounded-xl text-xs font-bold transition ${dashYear===y.year?'bg-slate-800 text-white':'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'}`}>{y.year}{y.n<12?` (${y.n}m)`:''}</button>)}
        {(xRate>1||liveTRM)&&<div className="ml-auto flex gap-1 shrink-0">{[propCurrency,...(propCurrency==='USD'?['COP']:['USD'])].map(c=><button key={c} onClick={()=>setViewCur(c===propCurrency?null:c)} className={`px-3 py-2 rounded-xl text-[10px] font-bold transition ${(viewCur||propCurrency)===c?'bg-blue-600 text-white':'bg-white border border-blue-200 text-blue-500 hover:bg-blue-50'}`}>{c}</button>)}</div>}
        <button onClick={toggleLang} className="px-3 py-2 rounded-xl text-[10px] font-bold bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 transition shrink-0" title={t('language')}>{lang==='en'?'🇺🇸 EN':'🇪🇸 ES'}</button>
      </div>}

      {fRev>0?<>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 md:gap-3 mb-5">
        <div className="bg-white rounded-2xl p-3 md:p-4 border-l-4 border-l-blue-500 border border-slate-200 shadow-sm">
          <div className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">{t('grossRevenue')}</div>
          <div className="text-[9px] text-slate-400 -mt-0.5">{t('subRevenue')}</div>
          <div className="text-base md:text-[22px] font-extrabold text-slate-800 mt-0.5">{dFm(fRev)}</div>
          <div className="text-[10px] text-slate-400">{n} {t('months')}{revChg!==null?` · ${revChg>=0?'+':''}${revChg.toFixed(0)}% YoY`:''}</div>
        </div>
        <div className={`bg-white rounded-2xl p-3 md:p-4 border-l-4 border border-slate-200 shadow-sm ${fNoi>=0?'border-l-amber-500':'border-l-rose-500'}`}>
          <div className={`text-[10px] font-bold uppercase tracking-widest ${fNoi>=0?'text-amber-600':'text-rose-500'}`}>{t('noi')}</div>
          <div className="text-[9px] text-slate-400 -mt-0.5">{t('subNoi')}</div>
          <div className={`text-base md:text-[22px] font-extrabold mt-0.5 ${fNoi>=0?'text-amber-700':'text-rose-600'}`}>{dFm(fNoi)}</div>
          <div className="text-[10px] text-slate-400">{t('margin')} {fMargin.toFixed(0)}%</div>
        </div>
        <div className={`bg-white rounded-2xl p-3 md:p-4 border-l-4 border border-slate-200 shadow-sm ${fCF>=0?'border-l-emerald-500':'border-l-rose-500'}`}>
          <div className={`text-[10px] font-bold uppercase tracking-widest ${fCF>=0?'text-emerald-600':'text-rose-500'}`}>{t('cashFlow')}</div>
          <div className="text-[9px] text-slate-400 -mt-0.5">{fMortP?t('subCashFlow'):t('subCashFlowNoMort')}</div>
          <div className={`text-base md:text-[22px] font-extrabold mt-0.5 ${fCF>=0?'text-emerald-700':'text-rose-600'}`}>{dFm(fCF)}</div>
          <div className={`text-[10px] ${fCF>=0?'text-emerald-500':'text-rose-400'}`}>{dFm(fCFmo)}/{t('mo')}{!fMortP&&` · = NOI`}</div>
        </div>
        <div className="bg-white rounded-2xl p-3 md:p-4 border-l-4 border-l-cyan-500 border border-slate-200 shadow-sm">
          <div className="text-[10px] font-bold text-cyan-600 uppercase tracking-widest">{t('occupancy')}</div>
          <div className="text-[9px] text-slate-400 -mt-0.5">{t('subOccupancy')}</div>
          <div className="text-base md:text-[22px] font-extrabold text-slate-800 mt-0.5">{occupancy>0?occupancy.toFixed(0)+'%':'0%'}</div>
          <div className="text-[10px] text-slate-400">{fNights>0?`${fNights} ${t('nights')} · ADR ${dFm(adr)}`:`0 ${t('nights')}`}</div>
        </div>
        <div className="bg-white rounded-2xl p-3 md:p-4 border-l-4 border-l-purple-500 border border-slate-200 shadow-sm">
          <div className="text-[10px] font-bold text-purple-600 uppercase tracking-widest">{t('cashOnCash')}{partial?' (ann.)':''}</div>
          <div className="text-[9px] text-slate-400 -mt-0.5">{t('subCoC')}</div>
          <div className={`text-base md:text-[22px] font-extrabold mt-0.5 ${fCoc>8?'text-emerald-700':fCoc>4?'text-amber-600':'text-rose-600'}`}>{fCoc.toFixed(1)}%</div>
          <div className="text-[10px] text-slate-400">{t('capital')}: {dFm(totCont)}</div>
        </div>
      </div>


      {/* ── ROW 2: Visual P&L Cascade + Metrics ── */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-4">
        <div className="col-span-1 md:col-span-7 bg-white rounded-2xl p-3 md:p-5 border border-slate-200 shadow-sm overflow-hidden">
          <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-4">{t('plWaterfall')}{partial?` (${n} months)`:''} <span className="text-[9px] font-normal text-slate-400 normal-case cursor-help" title={t("tipNoi")}>ⓘ</span></h3>
          <div className="space-y-1.5">
            <div className="rounded-lg relative overflow-hidden" style={{height:"34px"}}><div className="absolute inset-0 bg-blue-500"/><div className="absolute inset-0 flex items-center justify-between px-2 md:px-4 overflow-hidden"><span className="text-[10px] md:text-[11px] font-bold text-white truncate">{t("grossRevenue")}</span><span className="text-[12px] font-extrabold text-white">{dFm(fRev)}</span></div></div>

            {isOwnerManaged?<>
              <div className="pl-2 text-[9px] font-bold text-slate-300 uppercase tracking-widest py-0.5">{t('operatingExpenses')}</div>
              {fComm>0&&<div className="rounded-lg bg-slate-50 relative overflow-hidden" style={{height:'28px'}}><div className="absolute inset-y-0 left-0 bg-rose-400 opacity-75" style={{width:Math.max(2,fComm/fRev*100)+'%'}}/><div className="absolute inset-0 flex items-center justify-between px-2 md:px-4 overflow-hidden"><span className="text-[9px] md:text-[10px] text-slate-600 truncate">{t('platformFees')}</span><span className="text-[9px] md:text-[10px] font-bold text-slate-700 whitespace-nowrap">{dFm(fComm)} <span className="text-slate-400">({(fComm/fRev*100).toFixed(0)}%)</span></span></div></div>}
              {(()=>{
                const cats={};
                yearExpenses.filter(e=>!isExcludedFromOpEx(e)).forEach(e=>{
                  const c=propCats.find(x=>x.v===e.category);
                  const isOther=!c||e.category==='otros'||!e.category;
                  const catKey=isOther?'_other':(c?e.category:'_other');
                  const catName=isOther?(lang==='es'?'Otros':'Other'):(c?c.l:'Other');
                  if(!cats[catKey])cats[catKey]={name:catName,value:0};
                  const amt=toPC(e.amount||0,e.expCurrency);
                  const ef2=eFreq(e);if(ef2==='annual')cats[catKey].value+=amt/12*(n||1);
                  else if(ef2==='monthly')cats[catKey].value+=amt*(n||1);
                  else cats[catKey].value+=amt;
                });
                return Object.values(cats).sort((a,b)=>b.value-a.value).filter(c=>c.value>0).map(c=>
                  <div key={c.name} className="rounded-lg bg-slate-50 relative overflow-hidden" style={{height:'28px'}}><div className="absolute inset-y-0 left-0 bg-orange-400 opacity-75" style={{width:Math.max(2,(c.value||0)/fRev*100)+'%'}}/><div className="absolute inset-0 flex items-center justify-between px-2 md:px-4 overflow-hidden"><span className="text-[9px] md:text-[10px] text-slate-600 truncate">{c.name}</span><span className="text-[9px] md:text-[10px] font-bold text-slate-700 whitespace-nowrap">{dFm(c.value)} <span className="text-slate-400">({(c.value/fRev*100).toFixed(0)}%)</span></span></div></div>
                );
              })()}
            </>:<>
              <div className="pl-2 text-[9px] font-bold text-slate-300 uppercase tracking-widest py-0.5">{t('operatingExpenses')}</div>
              {[[`${t('pmCommission')} (${prop.managerCommission||15}%)`,fComm,'bg-rose-400'],[t('electricity'),fDuke,'bg-amber-400'],[t('water'),fWater,'bg-cyan-400'],[propTerms.hoa,fHoa,'bg-purple-400'],[t('maintenance'),fMaint,'bg-teal-400'],[t('vendorOther'),fVendor,'bg-slate-400']].filter(([_,v])=>v>0).map(([l,v,bg])=>
                <div key={l} className="rounded-lg bg-slate-50 relative overflow-hidden" style={{height:'28px'}}><div className={`absolute inset-y-0 left-0 ${bg} opacity-75`} style={{width:Math.max(2,v/fRev*100)+'%'}}/><div className="absolute inset-0 flex items-center justify-between px-2 md:px-4 overflow-hidden"><span className="text-[9px] md:text-[10px] text-slate-600 truncate">{l}</span><span className="text-[9px] md:text-[10px] font-bold text-slate-700 whitespace-nowrap">{dFm(v)} <span className="text-slate-400">({(v/fRev*100).toFixed(0)}%)</span></span></div></div>
              )}
              {ownerExpTotal>0&&<>
                {(()=>{
                  const cats={};
                  yearExpenses.filter(e=>!isExcludedFromOpEx(e)).forEach(e=>{
                    const c=propCats.find(x=>x.v===e.category);
                    // Consolidate: 'otros', '', undefined, unmatched → all become '_other'
                    const isOther=!c||e.category==='otros'||!e.category;
                    const catKey=isOther?'_other':(c?e.category:'_other');
                    const catName=isOther?(lang==='es'?'Otros':'Other'):(c?c.l:'Other');
                    const isFixed=isOther?false:(c?.fixed||e.type==='fixed');
                    if(!cats[catKey])cats[catKey]={name:catName,fixed:isFixed,value:0};
                    const amt=toPC(e.amount||0,e.expCurrency);
                    const f=eFreq(e);
                    if(f==='annual')cats[catKey].value+=amt/12*(n||1);
                    else if(f==='monthly')cats[catKey].value+=amt*(n||1);
                    else cats[catKey].value+=amt;
                  });
                  const sorted=Object.values(cats).filter(c=>c.value>0).sort((a,b)=>b.value-a.value);
                  const fixed=sorted.filter(c=>c.fixed);
                  const additional=sorted.filter(c=>!c.fixed);
                  return<>
                    {fixed.length>0&&<>
                      <div className="pl-2 text-[9px] font-bold text-slate-300 uppercase tracking-widest py-0.5 mt-1">{t('operatingExpenses')} ({lang==='es'?'Propietario':'Owner'})</div>
                      {fixed.map(c=><div key={c.name} className="rounded-lg bg-slate-50 relative overflow-hidden" style={{height:'28px'}}><div className="absolute inset-y-0 left-0 bg-orange-400 opacity-75" style={{width:Math.max(2,c.value/fRev*100)+'%'}}/><div className="absolute inset-0 flex items-center justify-between px-2 md:px-4 overflow-hidden"><span className="text-[9px] md:text-[10px] text-slate-600 truncate">{c.name}</span><span className="text-[9px] md:text-[10px] font-bold text-slate-700 whitespace-nowrap">{dFm(c.value)} <span className="text-slate-400">({(c.value/fRev*100).toFixed(0)}%)</span></span></div></div>)}
                    </>}
                    {additional.length>0&&<>
                      <div className="pl-2 text-[9px] font-bold text-slate-300 uppercase tracking-widest py-0.5 mt-1">{lang==='es'?'Gastos Adicionales':'Additional Expenses'}</div>
                      {additional.map(c=><div key={c.name} className="rounded-lg bg-slate-50 relative overflow-hidden" style={{height:'28px'}}><div className="absolute inset-y-0 left-0 bg-yellow-400 opacity-75" style={{width:Math.max(2,c.value/fRev*100)+'%'}}/><div className="absolute inset-0 flex items-center justify-between px-2 md:px-4 overflow-hidden"><span className="text-[9px] md:text-[10px] text-slate-600 truncate">{c.name}</span><span className="text-[9px] md:text-[10px] font-bold text-slate-700 whitespace-nowrap">{dFm(c.value)} <span className="text-slate-400">({(c.value/fRev*100).toFixed(0)}%)</span></span></div></div>)}
                    </>}
                  </>;
                })()}
              </>}
            </>}

            {/* NOI = Revenue - Operating Expenses */}
            <div className={`rounded-lg relative overflow-hidden mt-1 ${fNoi>=0?'bg-emerald-600':'bg-rose-600'}`} style={{height:'38px'}}><div className="absolute inset-0 flex items-center justify-between px-2 md:px-4 overflow-hidden"><div><span className="text-[11px] font-bold text-white">{`= ${t('noi')}`}</span><span className="text-[9px] text-white/60 ml-2">{t('revMinusOpex')}</span></div><span className="text-[12px] font-extrabold text-white">{dFm(fNoi)} <span className="text-white/70 text-[10px]">{fMargin.toFixed(0)}%</span></span></div></div>

            {/* Debt Service = Mortgage */}
            {fMortP>0&&<>
              <div className="pl-2 text-[9px] font-bold text-slate-300 uppercase tracking-widest py-0.5 mt-1">{t('debtService')}</div>
              <div className="rounded-lg bg-slate-50 relative overflow-hidden" style={{height:'28px'}}><div className="absolute inset-y-0 left-0 bg-red-400 opacity-75" style={{width:Math.max(2,Math.abs(fMortP)/fRev*100)+'%'}}/><div className="absolute inset-0 flex items-center justify-between px-2 md:px-4 overflow-hidden"><span className="text-[9px] md:text-[10px] text-slate-600 truncate">{t('mortgage')}{mMort>0?` (${dFm(mMort)}/${t('mo')} × ${n}m)`:''}{(mort.includesTaxes||mort.includesInsurance)&&<span className="text-[8px] text-blue-500 ml-1">{lang==='es'?'incl.':'incl.'} {[mort.includesTaxes&&'Tax',mort.includesInsurance&&(lang==='es'?'Seguro':'Ins.')].filter(Boolean).join(' + ')}</span>}</span><span className="text-[10px] font-bold text-slate-700">{dFm(fMortP)} <span className="text-slate-400">({(Math.abs(fMortP)/fRev*100).toFixed(0)}%)</span></span></div></div>
            </>}

            {/* Cash Flow = NOI - Debt Service */}
            <div className={`rounded-lg relative overflow-hidden border-2 mt-2 ${fCF>=0?'border-emerald-400 bg-emerald-600':'border-rose-400 bg-rose-600'}`} style={{height:'44px'}}>
              <div className="absolute inset-0 flex items-center justify-between px-2 md:px-4 overflow-hidden">
                <div><span className="text-[12px] font-extrabold text-white">{`= ${t('cashFlow')}`}</span>{fMortP>0&&<span className="text-[9px] text-white/60 ml-2">{t('noiMinusDebt')}</span>}</div>
                <div className="text-right"><span className="text-[14px] font-black text-white">{dFm(fCF)}</span><div className="text-[10px] text-white/70">{dFm(fCFmo)}/{t('mo')}</div></div>
              </div>
            </div>

            {/* Monthly comparison: Does the property cover the mortgage? */}
            {fMortP>0&&n>0&&<div className={`rounded-xl p-3 mt-3 border ${fCF>=0?'bg-emerald-50 border-emerald-200':'bg-rose-50 border-rose-200'}`}>
              <div className="space-y-1.5">
                <div className="flex justify-between"><span className="text-[11px] text-slate-500">{t('propertyGenerates')}</span><span className="text-[11px] font-bold text-slate-700">{dFm(fNoi/n)}/mo <span className="text-slate-400">(NOI)</span></span></div>
                <div className="flex justify-between"><span className="text-[11px] text-slate-500">{t('mortgageCosts')}</span><span className="text-[11px] font-bold text-red-500">-{dFm(mMort>0?mMort:fMortP/n)}/{t('mo')}</span></div>
                <div className="border-t border-slate-200 my-1"/>
                <div className="flex justify-between items-center">
                  <span className={`text-[12px] font-extrabold ${fCF>=0?'text-emerald-700':'text-rose-700'}`}>{fCF>=0?t('surplus'):t('deficit')}</span>
                  <span className={`text-[12px] font-extrabold ${fCF>=0?'text-emerald-700':'text-rose-700'}`}>{dFm(fCFmo)}/{t('mo')}</span>
                </div>
                <div className={`text-[10px] ${fDscr>=1.25?'text-emerald-600':fDscr>=1?'text-amber-600':'text-rose-500'}`}>
                  DSCR: {fDscr.toFixed(2)}x — {fDscr>=1.25?t('coversComfortably'):fDscr>=1?t('coversTight'):t('doesNotCover')}
                </div>
              </div>
            </div>}
            {partial&&<div className="text-center text-[10px] text-slate-400 bg-slate-50 rounded py-1.5 mt-1">{t('partialPeriod')} ({n} months) · {t('annualizedProjection')}: <b>{dFm(proyAnual)}</b></div>}
          </div>
        </div>

        {/* Right: Property + Metrics + Health */}
        <div className="col-span-1 md:col-span-5 space-y-3">
          <div className="bg-white rounded-2xl p-3 md:p-4 border border-slate-200 shadow-sm overflow-hidden">
            <h3 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2.5" title="Valor actual, apreciación, equity y deuda de tu propiedad">{t('propertyEquity')}</h3>
            <div className="space-y-2">
              <div className="flex justify-between"><span className="text-[11px] text-slate-400">{t('marketValue')}</span><span className="text-[11px] font-extrabold text-slate-800">{dFm(marketValue)}</span></div>
              <div className="flex justify-between"><span className="text-[11px] text-slate-400">{t('purchasePrice')}</span><span className="text-[11px] font-bold text-slate-500">{dFm(prop.purchasePrice)}</span></div>
              {appreciation!==0&&<div className="flex justify-between"><span className="text-[11px] text-slate-400">{t('appreciation')}</span><span className={`text-[11px] font-bold ${appreciation>0?'text-emerald-600':'text-rose-500'}`}>{appreciation>0?'+':''}{appreciation.toFixed(1)}% ({dFm(marketValue-prop.purchasePrice)})</span></div>}
              <div className="border-t border-slate-100 my-0.5"/>
              <div className="flex justify-between"><span className="text-[11px] text-slate-400 cursor-help" title="Net equity = Market Value - Mortgage Balance">{t('equity')}</span><span className="text-[11px] font-extrabold text-emerald-600">{dFm(realEquity)}</span></div>
              {mort.balance>0&&<div className="flex justify-between"><span className="text-[11px] text-slate-400">{t('mortgageBalance')}</span><span className="text-[11px] font-bold text-slate-500">{dFm(mort.balance)} <span className="text-slate-400">· <span class="cursor-help" title="Loan-to-Value — % of property owned by lender. Target: <70%">LTV</span> {realLTV.toFixed(0)}%</span></span></div>}
            </div>
          </div>
          <div className="bg-white rounded-2xl p-3 md:p-4 border border-slate-200 shadow-sm overflow-hidden">
            <h3 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2.5">{t('strPerformance')}{partial?' (proy.)':''}</h3>
            <div className="space-y-2">
              {fNights>0&&<div className="flex justify-between"><span className="text-[11px] text-slate-400 truncate" title="Nights your property was booked vs available">{t('nightsBooked')}</span><span className="text-[11px] font-bold text-slate-700">{fNights} de {availNights} <span className="text-slate-400">({occupancy.toFixed(0)}%)</span></span></div>}
              {fNights>0&&<div className="flex justify-between"><span className="text-[11px] text-slate-400 cursor-help" title="Average Daily Rate — Average rate per booked night. Revenue ÷ Nights booked">ADR <span className="text-[9px] text-slate-300">{`(${t('ratePerNight')})`}</span></span><span className="text-[11px] font-bold text-blue-600">{dFm(adr)}</span></div>}
              {fNights>0&&<div className="flex justify-between"><span className="text-[11px] text-slate-400 cursor-help" title="Revenue per available night. Measures how well you monetize total inventory. Revenue ÷ Available nights">RevPAR <span className="text-[9px] text-slate-300">{`(${t('revPerAvailNight')})`}</span></span><span className={`text-[11px] font-bold ${revpar>100?'text-emerald-600':'text-amber-500'}`}>{dFm(revpar)}</span></div>}
              {fRes>0&&<div className="flex justify-between"><span className="text-[11px] text-slate-400">{t('reservations')}</span><span className="text-[11px] font-bold text-slate-700">{fRes} <span className="text-slate-400">({(fNights/fRes).toFixed(1)} {t('avgNights')})</span></span></div>}
              <div className="border-t border-slate-100 my-0.5"/>
              <div className="flex justify-between"><span className="text-[11px] text-slate-400 cursor-help" title="Cap Rate — Annualized NOI ÷ Market Value. Measures operating return without leverage. STR target: >6%">{t('capRate')}</span><span className={`text-[11px] font-bold ${fCapR>6?'text-emerald-600':fCapR>4?'text-amber-500':'text-rose-500'}`}>{fCapR.toFixed(2)}%</span></div>
              <div className="flex justify-between"><span className="text-[11px] text-slate-400 cursor-help" title="Cash-on-Cash Return — Cash flow anual ÷ Capital que invertiste. Mide el retorno real sobre TU dinero. Meta: >8%">{t('cocReturn')}</span><span className={`text-[11px] font-bold ${fCoc>8?'text-emerald-600':fCoc>4?'text-amber-500':'text-rose-500'}`}>{fCoc.toFixed(1)}%</span></div>
              {fDscr>0&&<div className="flex justify-between"><span className="text-[11px] text-slate-400 cursor-help" title="DSCR — NOI ÷ Annual mortgage payments. ≥1.25x comfortable, <1x doesn't cover mortgage">DSCR <span className="text-[9px] text-slate-300">{`(${t('debtCoverage')})`}</span></span><span className={`text-[11px] font-bold ${fDscr>1.25?'text-emerald-600':fDscr>1?'text-amber-500':'text-rose-500'}`}>{fDscr.toFixed(2)}x</span></div>}
              <div className="flex justify-between"><span className="text-[11px] text-slate-400 cursor-help" title="Expense Ratio — Qué porcentaje of revenue se va en gastos operativos. Ideal: <50%">{t('expenseRatio')}</span><span className={`text-[11px] font-bold ${fOpEx/fRev<0.5?'text-emerald-600':fOpEx/fRev<0.6?'text-amber-500':'text-rose-500'}`}>{(fOpEx/fRev*100).toFixed(0)}%</span></div>
              <div className="flex justify-between"><span className="text-[11px] text-slate-400" title="Total de capital invertido por los socios en esta propiedad">{t('capitalInvested')}</span><span className="text-[11px] font-bold text-slate-700">{dFm(totCont)}</span></div>
            </div>
          </div>
          {/* Health indicator */}
          <div className={`rounded-2xl p-3 border ${fCF>=0&&fNoi/fRev>0.4?'bg-emerald-50 border-emerald-200':fCF<0?'bg-rose-50 border-rose-200':'bg-amber-50 border-amber-200'}`}>
            <div className="flex items-center gap-2 mb-1.5">
              {fCF>=0&&fNoi/fRev>0.4?<CheckCircle size={15} className="text-emerald-500"/>:<AlertTriangle size={15} className={fCF<0?'text-rose-500':'text-amber-500'}/>}
              <span className={`text-[10px] font-bold uppercase ${fCF>=0&&fNoi/fRev>0.4?'text-emerald-700':fCF<0?'text-rose-700':'text-amber-700'}`}>{fCF>=0&&fNoi/fRev>0.4?t('healthyInvestment'):fCF<0?t('needsAttention'):t('underReview')}</span>
            </div>
            <div className="space-y-1 text-[10px] text-slate-600">
              {occupancy>0&&<div className="flex items-center gap-1.5"><div className={`w-1.5 h-1.5 rounded-full ${occupancy>70?'bg-emerald-500':occupancy>50?'bg-amber-500':'bg-rose-500'}`}/>{occupancy.toFixed(0)}% occupancy ({fNights} nights)</div>}
              <div className="flex items-center gap-1.5"><div className={`w-1.5 h-1.5 rounded-full ${fNoi/fRev>0.5?'bg-emerald-500':fNoi/fRev>0.4?'bg-amber-500':'bg-rose-500'}`}/>{(fNoi/fRev*100).toFixed(0)}% {t('operatingMargin')}</div>
              {fDscr>0&&<div className="flex items-center gap-1.5"><div className={`w-1.5 h-1.5 rounded-full ${fDscr>1.25?'bg-emerald-500':fDscr>1?'bg-amber-500':'bg-rose-500'}`}/>{fDscr.toFixed(2)}x debt coverage</div>}
              {revChg!==null&&<div className="flex items-center gap-1.5"><div className={`w-1.5 h-1.5 rounded-full ${revChg>=0?'bg-emerald-500':'bg-rose-500'}`}/>{revChg>=0?'+':''}{revChg.toFixed(0)}% revenue vs prior year</div>}
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
            <div className={`text-xs font-bold ${a.level==='overdue'?'text-rose-700':'text-amber-700'}`}>{a.title}{a.amount?' · '+dFm(parseFloat(a.amount)):''}</div>
            <div className={`text-[10px] ${a.level==='overdue'?'text-rose-500':'text-amber-500'}`}>{a.days<0?`Vencido hace ${Math.abs(a.days)} día${Math.abs(a.days)>1?'s':''}`:`Vence en ${a.days} día${a.days>1?'s':''}`} · {fmDate(a.dueDate)}</div>
          </div>
          <button onClick={e=>{e.stopPropagation();markPaid(a)}} className={`px-3 py-1.5 rounded-xl text-[11px] font-bold shrink-0 transition ${a.level==='overdue'?'bg-rose-200 text-rose-700 hover:bg-rose-300':'bg-amber-200 text-amber-700 hover:bg-amber-300'}`}>Pagado ✓</button>
        </div>)}</div>;
      })()}

      {/* ── ROW 3: INSIGHTS — What the data tells you ── */}      {n>=2&&(canUse('insights')?<div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-4">
        {/* Smart Insights */}
        <div className="col-span-1 md:col-span-8 bg-white rounded-2xl p-3 md:p-5 border border-slate-200 shadow-sm overflow-hidden">
          <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">{t('insightsRec')}</h3>
          <div className="space-y-2">
            {(()=>{
              const insights=[];
              const avgRevMo=n>0?fRev/n:0;
              const avgNetMo=n>0?fNet/n:0;
              const breakEvenNights=adr>0?Math.ceil(totalOpEx/Math.max(n,1)/adr):0;
              const monthlyMort=mMort;
              const monthlyMortCost=fMortP/Math.max(n,1);
              const monthlyOpEx=fOpEx/Math.max(n,1);
              const avgNightsMo=fNights>0?Math.round(fNights/n):0;
              
              // Break-even
              if(adr>0&&breakEvenNights>0) insights.push({
                type:breakEvenNights>25?'danger':breakEvenNights>20?'warn':'good',
                icon:breakEvenNights>25?'🚨':breakEvenNights>20?'⚠️':'✅',
                title:`Break-even: ${breakEvenNights} nights/mo`,
                desc:breakEvenNights>avgNightsMo?`Need ${breakEvenNights} nights to cover costs but averaging ${avgNightsMo}. Deficit of ${breakEvenNights-avgNightsMo} nights.`:`Costs covered with ${breakEvenNights} nights, averaging ${avgNightsMo}. Margin of ${avgNightsMo-breakEvenNights} nights.`
              });

              // Cash Flow health
              if(fCF<0) insights.push({type:'danger',icon:'🔴',title:`Negative cash flow: ${dFm(fCF)}`,desc:`La propiedad does not cover costs. La hipoteca (${dFm(fMortP)}) consumes ${fRev>0?(fMortP/fRev*100).toFixed(0):0}% of gross revenue. ${monthlyMort>avgNetMo?'Monthly mortgage exceeds PM deposits.':'Consider refinancing or raising rates.'}`});
              else if(fCF>0&&fCFmo<500) insights.push({type:'warn',icon:'🟡',title:`Cash flow ajustado: ${dFm(fCFmo)}/mo`,desc:'Cualquier reparación mayor o mes de baja occupancy puede dejarte en negativo. Considera construir una reserva de emergencia.'});
              else if(fCFmo>1000) insights.push({type:'good',icon:'🟢',title:`Cash flow saludable: ${dFm(fCFmo)}/mo`,desc:'La propiedad genera excedente consistente después de todos los costos.'});

              // Occupancy
              if(fNights>0){
                if(occupancy>=80) insights.push({type:'good',icon:'📈',title:`Ocupación excelente: ${occupancy.toFixed(0)}%`,desc:`Con ${occupancy.toFixed(0)}% de occupancy, puedes considerar subir tarifas. Un aumento de $20/noche generaría ~${dFm(fNights/n*20*12)} adicionales al año.`});
                else if(occupancy>=60) insights.push({type:'warn',icon:'📊',title:`Acceptable occupancy: ${occupancy.toFixed(0)}%`,desc:`Room for ${Math.round(availNights-fNights)} more nights. If you book ${Math.round((availNights-fNights)*0.5)} additional nights at current ADR (${dFm(adr)}), you'd generate ${dFm(Math.round((availNights-fNights)*0.5)*adr)} extra.`});
                else insights.push({type:'danger',icon:'📉',title:`Low occupancy: ${occupancy.toFixed(0)}%`,desc:`Only ${fNights} de ${availNights} nights booked. Review pricing, listing photos, and local competition.`});
              }

              // ADR vs market
              if(adr>0){
                if(adr>300) insights.push({type:'good',icon:'💎',title:`ADR premium: ${dFm(adr)}/noche`,desc:`Tu tarifa está por encima del promedio del mercado${prop.city?' de '+prop.city:''}. Asegúrate de que las reseñas y amenities justifiquen el premium.`});
                else if(adr<150) insights.push({type:'warn',icon:'💰',title:`ADR below market: ${dFm(adr)}/noche`,desc:'Consider improving amenities to raise rates. Each $25 increase = ~'+dFm(fNights/n*25*12)+'/year extra.'});
              }

              // Mortgage burden
              if(mMort>0&&fRev>0){
                const mortPct=fMortP/fRev*100;
                if(mortPct>60) insights.push({type:'danger',icon:'🏦',title:`Mortgage consumes ${mortPct.toFixed(0)}% of revenue`,desc:`Debt service is too high relative to revenue. DSCR ${fDscr.toFixed(2)}x. ${fDscr<1.25?'Consider refinancing at a lower rate or extending the term.':'DSCR is acceptable but margin is tight.'}`});
              }

              // Expense efficiency
              if(fRev>0){
                const opExPct=fOpEx/fRev*100;
                if(opExPct>55) insights.push({type:'warn',icon:'📋',title:`Ratio de gastos alto: ${opExPct.toFixed(0)}%`,desc:`Los gastos operativos consumesn más de la mitad of revenue. Los principales: PM Commission ${dFm(fComm)} (${(fComm/fRev*100).toFixed(0)}%), Electricity ${dFm(fDuke)} (${(fDuke/fRev*100).toFixed(0)}%), HOA ${dFm(fHoa)} (${(fHoa/fRev*100).toFixed(0)}%).`});
              }

              // Electricity trend
              if(fDuke>0&&fRev>0){
                const dukePct=fDuke/fRev*100;
                if(dukePct>15) insights.push({type:'warn',icon:'⚡',title:`Electricity alta: ${(dukePct).toFixed(0)}% of revenue`,desc:`Electricidad ${dFm(fDuke)} (${dFm(fDuke/n)}/mo). Para una propiedad STR${prop.city?' en '+prop.city:''}, lo típico es 8-12% del revenue. Revisa termostato, equipos de alto consumo y eficiencia del A/C.`});
              }

              // YoY comparison
              if(prevYr&&prevYr.revenue>0&&dashYear!=='all'){
                const revDiff=fRev-prevYr.revenue*(n/prevYr.n);
                const netDiff=fNet-prevYr.net*(n/prevYr.n);
                if(revDiff<0) insights.push({type:'warn',icon:'📉',title:`Revenue ${((revDiff/(prevYr.revenue*(n/prevYr.n)))*100).toFixed(0)}% vs ${prevYr.year} (mismos months)`,desc:`Period-adjusted, generating ${dFm(Math.abs(revDiff))} less than last year. Check if competition increased or rates need adjustment.`});
                else if(revDiff>0) insights.push({type:'good',icon:'📈',title:`Revenue +${((revDiff/(prevYr.revenue*(n/prevYr.n)))*100).toFixed(0)}% vs ${prevYr.year}`,desc:`Growth of ${dFm(revDiff)} vs same period last year. Good momentum.`});
              }

              // Appreciation
              if(appreciation>20) insights.push({type:'good',icon:'🏠',title:`Appreciation +${appreciation.toFixed(0)}% (${dFm(marketValue-prop.purchasePrice)})`,desc:'Excelente apreciación. Tu equity es '+dFm(realEquity)+'. Podrías hacer un HELOC para adquirir otra propiedad.'});

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
            <h3 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">{t('monthlyAverages')}</h3>
            <div className="space-y-2">
              <div className="flex justify-between"><span className="text-[11px] text-slate-400">{t("grossRevenue")}</span><span className="text-[11px] font-bold text-blue-600">{dFm(n>0?fRev/n:0)}/{t('mo')}</span></div>
              <div className="flex justify-between"><span className="text-[11px] text-slate-400">{t('operatingExpenses')}</span><span className="text-[11px] font-bold text-rose-500">-{dFm(n>0?totalOpEx/n:0)}/{t('mo')}</span></div>
              {fMortP>0&&<><div className="flex justify-between"><span className="text-[11px] text-slate-400">{t("noi")}</span><span className="text-[11px] font-bold text-amber-600">{dFm(n>0?fNoi/n:0)}/{t('mo')}</span></div>
              <div className="flex justify-between"><span className="text-[11px] text-slate-400">{t('debtService')}</span><span className="text-[11px] font-bold text-red-500">-{dFm(mMort)}/{t('mo')}</span></div></>}
              <div className="border-t border-slate-100 my-0.5"/>
              <div className="flex justify-between"><span className="text-[11px] font-bold text-slate-600">{t("cashFlow")}</span><span className={`text-[11px] font-extrabold ${fCFmo>=0?'text-emerald-600':'text-rose-600'}`}>{dFm(fCFmo)}/{t('mo')}</span></div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-3 md:p-4 border border-slate-200 shadow-sm overflow-hidden">
            <h3 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">{t('breakEven')}</h3>
            {(()=>{
              const beMo=n>0?(totalOpEx/n+mMort):0;
              const beNights=adr>0?Math.ceil(beMo/adr):0;
              const avgNMo=fNights>0?Math.round(fNights/n):0;
              const surplus=avgNMo-beNights;
              return <div className="text-center">
                <div className="text-3xl font-black text-slate-800">{beNights}</div>
                <div className="text-[10px] text-slate-400">{t('nightsPerMo')}</div>
                <div className="text-xs text-slate-500 mt-1">{lang==='es'?'Costos mensuales totales:':'Total monthly costs:'} {dFm(beMo)}</div>
                <div className="text-xs text-slate-500">ADR {lang==='es'?'actual':'actual'}: {dFm(adr)}/{lang==='es'?'noche':'night'}</div>
                {avgNMo>0&&<div className={`text-xs font-bold mt-2 px-3 py-1 rounded-full inline-block ${surplus>=0?'bg-emerald-100 text-emerald-700':'bg-rose-100 text-rose-700'}`}>{surplus>=0?'+':''}{surplus>=0?surplus:Math.abs(surplus)} {surplus>=0?t('nightsSurplus'):t('nightsDeficit')}</div>}
              </div>;
            })()}
          </div>
        </div>
      </div>:<div className="mb-4"><UpgradeBanner plan={plan} feature="insights"/></div>)}

      {/* ── ROW 4: Monthly Chart + Property + Seasonality ── */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-4">
        <div className="col-span-1 md:col-span-7 bg-white rounded-2xl p-3 md:p-5 border border-slate-200 shadow-sm overflow-hidden">
          <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">{t('monthlyPerformance')}</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={mChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9"/>
              <XAxis dataKey="m" tick={{fontSize:9,fill:'#94a3b8'}} interval={mChart.length>18?2:0}/>
              <YAxis tick={{fontSize:9,fill:'#94a3b8'}} tickFormatter={v=>dFm(v)}/>
              <Tooltip content={<Tip fmt={dFm}/>}/><Legend wrapperStyle={{fontSize:10}}/>
              <Bar dataKey="rev" name={t("grossRevenue")} fill="#93C5FD" radius={[3,3,0,0]}/>
              <Bar dataKey="exp" name={t("expenses")} fill="#FCA5A5" radius={[3,3,0,0]}/>
              <Bar dataKey="cf" name={t("cashFlow")} fill="#6EE7B7" radius={[3,3,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="col-span-1 md:col-span-5 space-y-3">
          {/* Property & Equity */}
          <div className="bg-white rounded-2xl p-3 md:p-4 border border-slate-200 shadow-sm overflow-hidden">
            <h3 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2" title="Valor actual, apreciación, equity y deuda de tu propiedad">{t('propertyEquity')}</h3>
            <div className="space-y-1.5">
              <div className="flex justify-between"><span className="text-[11px] text-slate-400 truncate">{t('marketValue')}</span><span className="text-[11px] font-extrabold text-slate-800">{dFm(marketValue)}</span></div>
              <div className="flex justify-between"><span className="text-[11px] text-slate-400 truncate">{t('purchasePrice')}</span><span className="text-[11px] font-bold text-slate-500">{dFm(prop.purchasePrice)}</span></div>
              {appreciation!==0&&<div className="flex justify-between"><span className="text-[11px] text-slate-400">{t('appreciation')}</span><span className={`text-[11px] font-bold ${appreciation>0?'text-emerald-600':'text-rose-500'}`}>{appreciation>0?'+':''}{appreciation.toFixed(1)}% ({dFm(marketValue-prop.purchasePrice)})</span></div>}
              <div className="border-t border-slate-100 my-0.5"/>
              <div className="flex justify-between"><span className="text-[11px] text-slate-400 cursor-help" title="Net equity = Market Value - Mortgage Balance">{t('equity')}</span><span className="text-[11px] font-extrabold text-emerald-600">{dFm(realEquity)}</span></div>
              {realLTV>0&&<div className="flex justify-between"><span className="text-[11px] text-slate-400">LTV</span><span className={`text-[11px] font-bold ${realLTV>80?'text-rose-500':realLTV>60?'text-amber-500':'text-emerald-500'}`}>{realLTV.toFixed(0)}%</span></div>}
            </div>
          </div>
          {/* Mortgage Progress */}
          {mort.balance>0&&<div className="bg-white rounded-2xl p-3 md:p-4 border border-slate-200 shadow-sm overflow-hidden">
            <h3 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">Mortgage</h3>
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
                  <div><div className="text-lg font-extrabold text-slate-800">{dFm(mort.balance)}</div><div className="text-[10px] text-slate-400">{lang==='es'?'Balance actual':'Current balance'}</div></div>
                  <div className="text-right"><div className="text-sm font-bold text-emerald-600">{dFm(mMort)}/{t('mo')}</div><div className="text-[10px] text-slate-400">{mort.rate}% · {mort.termYears} {lang==='es'?'años':'years'}</div></div>
                </div>
                {(mort.includesTaxes||mort.includesInsurance)&&<div className="flex gap-1 flex-wrap">{mort.includesTaxes&&<span className="text-[9px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">🏛️ {lang==='es'?'Incl. Taxes':'Incl. Taxes'}</span>}{mort.includesInsurance&&<span className="text-[9px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">🛡️ {lang==='es'?'Incl. Seguro':'Incl. Insurance'}</span>}</div>}
                {/* Progress bar */}
                <div>
                  <div className="flex justify-between text-[9px] text-slate-400 mb-1"><span>Pagado {pctPaid.toFixed(0)}%</span><span>Restante {(100-pctPaid).toFixed(0)}%</span></div>
                  <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden"><div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all" style={{width:Math.max(2,pctPaid)+'%'}}/></div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center mt-1">
                  <div className="bg-emerald-50 rounded-lg p-1.5"><div className="text-[9px] text-emerald-600 font-bold">PAGADO</div><div className="text-xs font-extrabold text-emerald-700">{dFm(paidPrincipal)}</div></div>
                  <div className="bg-slate-50 rounded-lg p-1.5"><div className="text-[9px] text-slate-500 font-bold">RESTANTE</div><div className="text-xs font-extrabold text-slate-700">{dFm(mort.balance)}</div></div>
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
              <div className="bg-emerald-50 rounded-xl p-2 text-center"><div className="text-[8px] text-emerald-600 font-bold">MEJOR MES</div><div className="text-sm font-extrabold text-emerald-700">{monthRank[0].month}</div><div className="text-[10px] text-emerald-500">{dFm(monthRank[0].avg)} prom</div></div>
              <div className="bg-rose-50 rounded-xl p-2 text-center"><div className="text-[8px] text-rose-600 font-bold">PEOR MES</div><div className="text-sm font-extrabold text-rose-700">{monthRank[monthRank.length-1].month}</div><div className="text-[10px] text-rose-500">{dFm(monthRank[monthRank.length-1].avg)} prom</div></div>
            </div>
          </div>}
        </div>
      </div>

      {/* ── ROW: Year-over-Year Performance Comparison ── */}
      {stmts.length>0&&<div className="bg-white rounded-2xl p-3 md:p-5 border border-slate-200 shadow-sm overflow-hidden mb-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">{lang==='es'?'Rendimiento Año vs Año':'Year-over-Year Performance'}</h3>
          <div className="text-[10px] text-slate-400">{lang==='es'?'Revenue mensual por año':'Monthly revenue by year'}</div>
        </div>
        {(()=>{
          const years=[...new Set(stmts.map(s=>s.year))].sort();
          const curYear=new Date().getFullYear();
          const colors=['#DC2626','#F59E0B','#059669','#8B5CF6','#EC4899','#0EA5E9'];
          // Build data: [{month:'Ene', 2023: 4983, 2024: 7006, 2025: 3795, 2026: 7600}, ...]
          const data=M.map((mName,mi)=>{
            const row={month:mName.slice(0,3)};
            years.forEach(y=>{
              const s=stmts.find(st=>st.year===y&&st.month===mi+1);
              const directForMonth=income.filter(inc=>{const d=inc.date||'';const [iy,im]=d.split('-').map(Number);return iy===y&&im===mi+1}).reduce((sum,inc)=>sum+(inc.amount||0),0);
              row[y]=stmtToPC((s?.revenue||0)+directForMonth);
            });
            return row;
          }).filter(row=>years.some(y=>row[y]>0));
          return<ResponsiveContainer width="100%" height={220}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9"/>
              <XAxis dataKey="month" tick={{fontSize:10,fill:'#94a3b8'}}/>
              <YAxis tick={{fontSize:9,fill:'#94a3b8'}} tickFormatter={v=>dFm(v)}/>
              <Tooltip content={<Tip fmt={dFm}/>}/>
              <Legend wrapperStyle={{fontSize:11}}/>
              {years.map((y,i)=><Line key={y} dataKey={String(y)} name={String(y)} stroke={y===curYear?'#2563EB':colors[i%colors.length]} strokeWidth={y===curYear?3.5:2} dot={{r:y===curYear?5:3,strokeWidth:y===curYear?2:0,fill:y===curYear?'#2563EB':colors[i%colors.length]}} opacity={1}/>)}
            </LineChart>
          </ResponsiveContainer>;
        })()}
      </div>}

      {/* ── ROW 4: Year comparison + Partners ── */}
      {(annual.length>1||partners.length>1)&&<div className={`grid ${annual.length>1&&partners.length>1?'grid-cols-2':'grid-cols-1'} gap-4`}>
        {annual.length>1&&<div className="bg-white rounded-2xl p-3 md:p-5 border border-slate-200 shadow-sm overflow-hidden">
          <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">Comparativo Anual</h3>
          <ResponsiveContainer width="100%" height={160}>
            <ComposedChart data={annual.map(y=>({...y,revenue:stmtToPC(y.revenue),net:stmtToPC(y.net),commission:stmtToPC(y.commission)}))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9"/>
              <XAxis dataKey="year" tick={{fontSize:11,fill:'#64748b'}}/>
              <YAxis tick={{fontSize:9,fill:'#94a3b8'}} tickFormatter={v=>dFm(v)}/>
              <Tooltip content={<Tip fmt={dFm}/>}/><Legend wrapperStyle={{fontSize:10}}/>
              <Bar dataKey="revenue" name={t("grossRevenue")} fill="#93C5FD" radius={[4,4,0,0]}/>
              <Bar dataKey="net" name="Neto Depositado" fill="#6EE7B7" radius={[4,4,0,0]}/>
              <Line dataKey="hoa" name="HOA" stroke="#8B5CF6" strokeWidth={2} dot={{r:3}}/>
            </ComposedChart>
          </ResponsiveContainer>
        </div>}
        {partners.length>1&&<div className="bg-white rounded-2xl p-3 md:p-5 border border-slate-200 shadow-sm overflow-hidden">
          <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">{t('partnersCapital')}</h3>
          <div className="space-y-3">{partners.map(p=>{const t=pt[p.id]||{};return<div key={p.id} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0" style={{background:p.color}}>{p.name.charAt(0)}</div>
            <div className="flex-1 min-w-0"><div className="text-sm font-bold text-slate-700 truncate">{p.name} <span className="text-xs text-slate-400 font-normal">{p.ownership}%</span></div>
              <div className="flex gap-3 text-[10px] mt-0.5"><span className="text-emerald-600">Aportó {dFm(t.cont)}</span><span className="text-rose-500">Gastó {dFm(t.exp)}</span><span className="text-blue-600">Le toca {dFm(fNet*(p.ownership/100))}</span></div>
            </div>
          </div>})}</div>
        </div>}
      </div>}

      </>:<div className="max-w-xl mx-auto py-8">
        {/* Welcome header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/20"><span className="text-2xl">📊</span></div>
          <h2 className="text-xl font-extrabold text-slate-800 mb-2">{lang==='es'?'¡Bienvenido a OwnerDesk!':'Welcome to OwnerDesk!'}</h2>
          <p className="text-sm text-slate-400">{lang==='es'?'Configura tu propiedad en 3 minutos y ve tu rentabilidad real.':'Set up your property in 3 minutes and see your real profitability.'}</p>
          {isTrial&&<div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold px-3 py-1 rounded-full mt-3">🎁 {lang==='es'?`Trial Pro — ${trialDays} días de acceso completo`:`Pro Trial — ${trialDays} days full access`}</div>}
        </div>

        {/* Preview of what they'll see */}
        <div className="bg-gradient-to-b from-slate-50 to-white rounded-2xl border border-slate-200 p-4 mb-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white/90 z-10 pointer-events-none"/>
          <div className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mb-3">{lang==='es'?'Así se verá tu dashboard:':'Your dashboard will look like this:'}</div>
          <div className="grid grid-cols-5 gap-2 opacity-60">
            {[['Revenue','$5,100','text-blue-400'],['NOI','$2,800','text-amber-500'],['Cash Flow','-$286','text-rose-400'],['Ocupación','74%','text-cyan-400'],['CoC','8.2%','text-purple-400']].map(([l,v,c])=>
              <div key={l} className="bg-white rounded-xl p-2 border border-slate-100 text-center">
                <div className="text-[8px] text-slate-300 font-bold uppercase">{l}</div>
                <div className={`text-sm font-extrabold ${c} mt-0.5`}>{v}</div>
              </div>
            )}
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-3">
          {[
            {done:stmts.length>0, step:'1', title:lang==='es'?'Sube tus statements':'Upload your statements', desc:lang==='es'?'Arrastra los PDFs de tu property manager (IHM, Vacasa, Airbnb, Host U)':'Drag your PM PDFs (IHM, Vacasa, Airbnb, Host U)', action:lang==='es'?'Subir PDFs':'Upload PDFs', onClick:()=>{setUploadLog([]);setModal('upload')}, color:'blue', highlight:true},
            {done:!!(mort.balance||mort.monthlyPayment), step:'2', title:lang==='es'?'Configura tu hipoteca':'Configure your mortgage', desc:lang==='es'?'Balance, tasa y pago mensual para calcular cash flow real':'Balance, rate, and payment for accurate cash flow', action:lang==='es'?'Configurar':'Configure', onClick:()=>setView('mortgage'), color:'indigo'},
            {done:expenses.filter(e=>e.category==='insurance'||e.category==='taxes').length>0, step:'3', title:lang==='es'?'Agrega seguro e impuestos':'Add insurance & taxes', desc:lang==='es'?'Estos costos fijos completan tu P&L':'These fixed costs complete your P&L', action:lang==='es'?'Agregar':'Add', onClick:()=>{setExpenseForm({date:'',concept:'',amount:'',paidBy:partners[0]?.id||'',category:'insurance',type:'fixed',frequency:'monthly',expCurrency:''});setModal('expense')}, color:'emerald'},
            {done:valuations.length>0, step:'4', title:lang==='es'?'Valor de mercado':'Market value', desc:lang==='es'?'Para calcular equity, apreciación y Cap Rate':'For equity, appreciation and Cap Rate', action:lang==='es'?'Registrar':'Register', onClick:()=>setView('valuation'), color:'purple'},
          ].map(s=><button key={s.step} onClick={s.onClick} className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all text-left ${s.done?'bg-slate-50 border-slate-100':s.highlight?'bg-blue-50 border-blue-200 hover:border-blue-400 shadow-sm':'bg-white border-slate-200 hover:border-blue-300 hover:shadow-sm'}`}>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${s.done?'bg-emerald-100':'bg-'+s.color+'-50'}`}>{s.done?<CheckCircle size={18} className="text-emerald-500"/>:<span className={`text-sm font-extrabold text-${s.color}-500`}>{s.step}</span>}</div>
            <div className="flex-1 min-w-0"><div className={`text-sm font-bold ${s.done?'text-slate-400 line-through':'text-slate-700'}`}>{s.title}</div><div className="text-xs text-slate-400 mt-0.5">{s.done?(lang==='es'?'✓ Completado':'✓ Done'):s.desc}</div></div>
            {!s.done&&<span className={`text-xs font-bold ${s.highlight?'text-white bg-blue-600 px-3 py-1.5 rounded-xl':'text-blue-600'} shrink-0`}>{s.action} →</span>}
          </button>)}
        </div>
        <div className="mt-6 p-4 bg-blue-50 rounded-2xl border border-blue-100"><div className="flex items-start gap-3"><AlertTriangle size={16} className="text-blue-500 shrink-0 mt-0.5"/><div><div className="text-xs font-bold text-blue-700">Tip</div><div className="text-xs text-blue-600 mt-0.5">{lang==='es'?'Solo el paso 1 es obligatorio. Con los statements ya ves revenue, ocupación y gastos. Los demás mejoran el análisis.':'Only step 1 is required. With statements you can see revenue, occupancy and expenses. The rest improve the analysis.'}</div></div></div></div>
      </div>}
      <div className="hidden print-footer">OwnerDesk · {prop.name} · {new Date().toLocaleDateString('es',{day:'2-digit',month:'long',year:'numeric'})}</div>
    </>}catch(e){console.error('Dashboard error:',e);return<div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 m-6"><h3 className="font-bold text-rose-700 mb-2">Error en el dashboard</h3><p className="text-sm text-rose-600 mb-3">{e.message}</p><p className="text-xs text-slate-400 mb-3">Stmts: {stmts.length} · Revenue: {revenue} · Annual: {annual.length}</p><button onClick={()=>setView('statements')} className="px-4 py-2 bg-rose-600 text-white rounded-xl text-sm font-bold">Ir a Statements</button></div>}})()}
    {/* ═══ PORTFOLIO ═══ */}
    {view==='portfolio'&&(()=>{
      const loadPortfolio=async()=>{
        setPortLoading(true);
        const data=[];
        for(const p of allProperties){
          try{
            const snap=await getDocs(collection(db,'properties',p.id,'statements'));
            const stmts=snap.docs.map(d=>({...d.data(),id:d.id}));
            const curYear=new Date().getFullYear();
            const ytd=stmts.filter(s=>s.year===curYear);
            const allRev=stmts.reduce((s,x)=>s+(x.revenue||0),0);
            const allNet=stmts.reduce((s,x)=>s+(x.net||0),0);
            const ytdRev=ytd.reduce((s,x)=>s+(x.revenue||0),0);
            const ytdNet=ytd.reduce((s,x)=>s+(x.net||0),0);
            const mort=p.mortgage||{};
            const mortMonthly=mort.monthlyPayment||0;
            const equity=(p.purchasePrice||0)-(mort.balance||0);
            data.push({id:p.id,name:p.name||'Sin nombre',city:p.city||'',country:p.country||'US',currency:p.currency||'USD',totalStmts:stmts.length,allRev,allNet,ytdRev,ytdNet,ytdMonths:ytd.length,mortMonthly,balance:mort.balance||0,equity,purchasePrice:p.purchasePrice||0,rate:mort.rate||0});
          }catch(e){data.push({id:p.id,name:p.name||'Sin nombre',city:p.city||'',error:e.message})}
        }
        setPortData(data);setPortLoading(false);
      };
      if(!portData&&!portLoading)loadPortfolio();
      const totals=portData?{rev:portData.reduce((s,p)=>s+(p.allRev||0),0),net:portData.reduce((s,p)=>s+(p.allNet||0),0),ytdRev:portData.reduce((s,p)=>s+(p.ytdRev||0),0),ytdNet:portData.reduce((s,p)=>s+(p.ytdNet||0),0),equity:portData.reduce((s,p)=>s+(p.equity||0),0),mort:portData.reduce((s,p)=>s+(p.mortMonthly||0),0),debt:portData.reduce((s,p)=>s+(p.balance||0),0)}:null;
      return <>
      <h1 className="text-[22px] font-extrabold text-slate-800 mb-2">🏘️ {lang==='es'?'Portafolio Consolidado':'Consolidated Portfolio'}</h1>
      <p className="text-sm text-slate-400 mb-5">{lang==='es'?`${allProperties.length} propiedades · Vista general de todo tu patrimonio inmobiliario`:`${allProperties.length} properties · Overview of your entire real estate portfolio`}</p>

      {portLoading&&<div className="flex items-center gap-3 py-12 justify-center"><Loader2 size={20} className="animate-spin text-blue-500"/><span className="text-sm text-slate-400">{lang==='es'?'Cargando datos del portafolio...':'Loading portfolio data...'}</span></div>}

      {portData&&totals&&<>
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
          <KPI label={lang==='es'?'Revenue Total':'Total Revenue'} value={fm(totals.rev)} sub={`${portData.reduce((s,p)=>s+(p.totalStmts||0),0)} months`} color="blue"/>
          <KPI label={lang==='es'?'Neto Total':'Total Net'} value={fm(totals.net)} sub={totals.rev>0?`${(totals.net/totals.rev*100).toFixed(0)}% margin`:''} color="green"/>
          <KPI label={`YTD ${new Date().getFullYear()}`} value={fm(totals.ytdRev)} sub={fm(totals.ytdNet)+' net'} color="cyan"/>
          <KPI label={lang==='es'?'Equity Total':'Total Equity'} value={fm(totals.equity)} color="emerald"/>
          <KPI label={lang==='es'?'Deuda Total':'Total Debt'} value={fm(totals.debt)} sub={fm(totals.mort)+'/mo'} color="red"/>
        </div>

        {/* Property comparison table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-5">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-500 uppercase">{lang==='es'?'Propiedad':'Property'}</th>
                <th className="text-right px-3 py-3 text-[10px] font-bold text-slate-500 uppercase">Revenue</th>
                <th className="text-right px-3 py-3 text-[10px] font-bold text-slate-500 uppercase">Net</th>
                <th className="text-right px-3 py-3 text-[10px] font-bold text-slate-500 uppercase">{lang==='es'?'Margen':'Margin'}</th>
                <th className="text-right px-3 py-3 text-[10px] font-bold text-slate-500 uppercase">YTD Rev</th>
                <th className="text-right px-3 py-3 text-[10px] font-bold text-slate-500 uppercase">{lang==='es'?'Hipoteca':'Mortgage'}</th>
                <th className="text-right px-3 py-3 text-[10px] font-bold text-slate-500 uppercase">Equity</th>
                <th className="px-3 py-3"></th>
              </tr></thead>
              <tbody>{portData.map(p=>{const margin=p.allRev>0?(p.allNet/p.allRev*100):0;return<tr key={p.id} className={`border-b border-slate-50 hover:bg-blue-50/50 transition cursor-pointer ${p.id===propertyId?'bg-blue-50':''}`} onClick={()=>{onSwitchProperty(p.id);setView('dashboard')}}>
                <td className="px-4 py-3"><div className="font-bold text-slate-800">{p.name}</div><div className="text-[10px] text-slate-400">{p.city}{p.country?` · ${p.country}`:''} · {p.totalStmts||0}m</div></td>
                <td className="text-right px-3 py-3 font-semibold text-blue-600">{fm(p.allRev)}</td>
                <td className="text-right px-3 py-3 font-semibold text-emerald-600">{fm(p.allNet)}</td>
                <td className="text-right px-3 py-3"><span className={`text-xs font-bold px-2 py-0.5 rounded-full ${margin>=50?'bg-emerald-100 text-emerald-700':margin>=30?'bg-amber-100 text-amber-700':'bg-rose-100 text-rose-700'}`}>{margin.toFixed(0)}%</span></td>
                <td className="text-right px-3 py-3 font-semibold text-cyan-600">{fm(p.ytdRev)}</td>
                <td className="text-right px-3 py-3 text-slate-500">{p.mortMonthly?fm(p.mortMonthly)+'/mo':'—'}</td>
                <td className="text-right px-3 py-3 font-bold text-emerald-600">{p.equity>0?fm(p.equity):'—'}</td>
                <td className="px-3 py-3"><span className="text-[10px] text-blue-500 font-bold">→</span></td>
              </tr>})}
              <tr className="bg-slate-800 text-white">
                <td className="px-4 py-3 font-bold text-sm">TOTAL</td>
                <td className="text-right px-3 py-3 font-bold">{fm(totals.rev)}</td>
                <td className="text-right px-3 py-3 font-bold">{fm(totals.net)}</td>
                <td className="text-right px-3 py-3"><span className="text-xs font-bold">{totals.rev>0?(totals.net/totals.rev*100).toFixed(0):0}%</span></td>
                <td className="text-right px-3 py-3 font-bold">{fm(totals.ytdRev)}</td>
                <td className="text-right px-3 py-3 font-bold">{fm(totals.mort)}/mo</td>
                <td className="text-right px-3 py-3 font-bold">{fm(totals.equity)}</td>
                <td className="px-3"></td>
              </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Revenue distribution */}
        {portData.length>1&&<div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-5">
          <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">{lang==='es'?'Distribución de Revenue':'Revenue Distribution'}</h3>
          <div className="h-8 rounded-lg overflow-hidden flex mb-3">
            {portData.filter(p=>p.allRev>0).map((p,i)=>{const pct=totals.rev>0?(p.allRev/totals.rev*100):0;return<div key={p.id} className="relative" style={{width:pct+'%',background:C[i%C.length]}}><div className="absolute inset-0 flex items-center justify-center"><span className="text-[8px] font-bold text-white truncate px-1">{pct.toFixed(0)}%</span></div></div>})}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {portData.filter(p=>p.allRev>0).map((p,i)=><div key={p.id} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm shrink-0" style={{background:C[i%C.length]}}/>
              <span className="text-[11px] text-slate-600 truncate">{p.name}</span>
              <span className="text-[11px] font-bold text-slate-800 ml-auto">{fm(p.allRev)}</span>
            </div>)}
          </div>
        </div>}
      </>}
    </>})()}

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
      <div className="flex justify-between items-center mb-4"><h1 className="text-lg md:text-[22px] font-extrabold text-slate-800">👥 {t('partnersCapital')} <span className="text-[10px] font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full">{gVc}</span> <CurToggle/></h1><button onClick={()=>{setContribForm({date:new Date().toISOString().split('T')[0],concept:'',amount:'',paidBy:partners[0]?.id||'',purpose:'operations'});setModal('contribution')}} className="px-4 py-2.5 bg-purple-600 text-white text-xs rounded-xl font-bold hover:bg-purple-700 flex items-center gap-1.5 shadow-sm"><Plus size={14}/> {t('capital')}</button></div>

      {/* Instructional card — how capital vs expenses work */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-5">
        <div className="flex items-start gap-3">
          <div className="text-lg">💡</div>
          <div className="text-[11px] text-blue-800 space-y-1.5">
            <div className="font-bold text-[12px]">{lang==='es'?'¿Cuándo registrar un Aporte vs un Gasto?':'When to register a Contribution vs an Expense?'}</div>
            <div>{lang==='es'
              ?'Un Aporte es dinero que un socio pone para cubrir la operación de la propiedad (hipoteca, déficit mensual, compras). NO es un gasto — es capital de los socios.'
              :'A Contribution is money a partner puts in to cover property operations (mortgage, monthly deficit, purchases). It is NOT an expense — it\'s partner equity.'}</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
              <div className="bg-white rounded-xl p-2.5 border border-blue-100">
                <div className="font-bold text-emerald-700 text-[10px] uppercase mb-1">✅ {lang==='es'?'Registrar como Aporte':'Register as Contribution'}</div>
                <div className="text-[10px] text-slate-600">{lang==='es'
                  ?'"Transferí $2,000 para cubrir hipoteca y gastos del mes"'
                  :'"I transferred $2,000 to cover mortgage and monthly costs"'}</div>
              </div>
              <div className="bg-white rounded-xl p-2.5 border border-rose-100">
                <div className="font-bold text-rose-600 text-[10px] uppercase mb-1">❌ {lang==='es'?'NO registrar como Gasto':'Do NOT register as Expense'}</div>
                <div className="text-[10px] text-slate-600">{lang==='es'
                  ?'Si el seguro ya está en Gastos, no registres otro gasto "Aporte para seguro" — se contaría doble.'
                  :'If insurance is already in Expenses, don\'t add another expense "Capital for insurance" — it would double-count.'}</div>
              </div>
            </div>
            <div className="text-[10px] text-blue-600 mt-1">{lang==='es'
              ?'Regla: Los gastos (seguro, hipoteca, servicios) se registran UNA vez en Gastos. Los aportes de socios van aquí en Capital.'
              :'Rule: Costs (insurance, mortgage, utilities) are registered ONCE in Expenses. Partner contributions go here in Capital.'}</div>
          </div>
        </div>
      </div>

      {/* Partner cards */}
      <div className="grid gap-4 mb-5" style={{gridTemplateColumns:`repeat(${Math.min(partners.length,3)},1fr)`}}>{partnerBalances.map(p=>{
        return<div key={p.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-center gap-3 mb-4"><div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white text-lg font-black shadow-md" style={{background:`linear-gradient(135deg,${p.color},${p.color}cc)`}}>{p.name.charAt(0)}</div><div><div className="font-bold text-slate-800">{p.name}</div><div className="text-xs text-slate-400">{p.ownership}%</div></div></div>
        <div className="grid grid-cols-3 gap-2 text-center mb-3">
          <div className="bg-emerald-50 rounded-xl p-2.5"><div className="text-[9px] text-emerald-600 font-bold uppercase">{lang==='es'?'Aportó':'Contributed'}</div><div className="text-base font-extrabold text-emerald-700">{gFm(p.t.cont)}</div></div>
          <div className="bg-rose-50 rounded-xl p-2.5"><div className="text-[9px] text-rose-500 font-bold uppercase">Expenses</div><div className="text-base font-extrabold text-rose-600">{gFm(p.t.exp)}</div></div>
          <div className="bg-blue-50 rounded-xl p-2.5"><div className="text-[9px] text-blue-500 font-bold uppercase">Total</div><div className="text-base font-extrabold text-blue-700">{gFm(p.put)}</div></div>
        </div>
        <div className="bg-slate-50 rounded-xl p-3 border text-center space-y-1">
          <div className="flex justify-between text-[11px]"><span className="text-slate-400">{lang==='es'?'Le corresponde':'Corresponds'} ({p.ownership}%)</span><span className="font-bold text-slate-600">{gFm(p.fairShare)}</span></div>
          <div className="flex justify-between text-[11px]"><span className="text-slate-400">{lang==='es'?'Ha puesto':'Put in'}</span><span className="font-bold text-slate-600">{gFm(p.put)}</span></div>
          <div className={`flex justify-between text-[11px] pt-1 border-t border-slate-200`}><span className="font-bold text-slate-500">Balance</span><span className={`font-extrabold ${p.diff>0?'text-emerald-600':p.diff<0?'text-rose-500':'text-slate-600'}`}>{p.diff>0?(lang==='es'?'A favor: +':'Surplus: +'):p.diff<0?(lang==='es'?'Debe: ':'Owes: '):''}{gFm(Math.abs(p.diff))}</span></div>
        </div>
      </div>})}</div>

      {/* Debts between partners */}
      {debts.length>0&&<div className="bg-white rounded-2xl border border-amber-200 p-5 shadow-sm mb-5">
        <h3 className="text-xs font-bold text-amber-700 uppercase tracking-widest mb-3 flex items-center gap-2"><AlertTriangle size={14}/> {lang==='es'?'Cuentas Pendientes':'Pending Balances'}</h3>
        <div className="space-y-2">{debts.map((d,i)=><div key={i} className="flex items-center gap-3 py-3 px-4 bg-amber-50 rounded-xl border border-amber-100">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{background:d.fromColor}}>{d.from.charAt(0)}</div>
          <div className="flex-1"><span className="text-sm font-bold text-slate-700">{d.from}</span><span className="text-sm text-slate-400 mx-2">le debe a</span><span className="text-sm font-bold text-slate-700">{d.to}</span></div>
          <div className="text-lg font-extrabold text-amber-700">{gFm(d.amount)}</div>
        </div>)}</div>
      </div>}

      {/* All balanced */}
      {partners.length>1&&debts.length===0&&totalPutAll>0&&<div className="bg-emerald-50 rounded-2xl border border-emerald-200 p-4 mb-5 flex items-center gap-3">
        <CheckCircle size={18} className="text-emerald-500"/>
        <span className="text-sm font-bold text-emerald-700">Cuentas al día — todos los socios han aportado proporcionalmente a su participación.</span>
      </div>}

      {/* Contribution history */}
      {contribs.length>0&&<><h3 className="text-sm font-bold text-slate-700 mb-3">Historial de Movimientos</h3>
        <Tbl cols={[{label:'Fecha',render:r=><span className="text-slate-500">{fmDate(r.date)}</span>},{label:'Socio',render:r=><span className="font-semibold" style={{color:pCl(r.paidBy)}}>{pN(r.paidBy)}</span>},{label:'Concepto',key:'concept',cls:'text-slate-600'},{label:'Monto',r:true,render:r=><span className="font-bold text-emerald-600">{gFm(r.amount)}</span>}]} rows={contribs} onDel={del} dc="contributions" onEdit={r=>{setContribForm({date:r.date||'',concept:r.concept||'',amount:String(r.amount||''),paidBy:r.paidBy||partners[0]?.id||'',purpose:r.purpose||'operations'});setEditId(r.id);setModal('contribution')}}/>
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
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4"><h1 className="text-lg md:text-[22px] font-extrabold text-slate-800">📋 Statements <span className="text-[10px] font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full">{gVc}</span> <CurToggle/> <span className="text-sm font-semibold text-slate-400 ml-1">({stmts.length})</span></h1><div className="flex gap-2">
        {stmts.length>0&&<button onClick={async()=>{if(!confirm(`¿Eliminar los ${stmts.length} statements?`))return;for(const s of stmts)await deleteDoc(doc(db,'properties',propertyId,'statements',s.id))}} className="px-3 py-2.5 bg-rose-100 text-rose-600 text-xs rounded-xl font-bold hover:bg-rose-200 active:bg-rose-300 flex items-center gap-1.5"><Trash2 size={13}/></button>}
        <button onClick={()=>{setUploadLog([]);setModal('upload')}} className="flex-1 sm:flex-none px-4 py-2.5 bg-blue-600 text-white text-xs rounded-xl font-bold flex items-center justify-center gap-1.5 shadow-sm active:bg-blue-700"><Upload size={14}/> PDFs</button><button onClick={()=>setModal('addStmt')} className="flex-1 sm:flex-none px-4 py-2.5 bg-slate-700 text-white text-xs rounded-xl font-bold flex items-center justify-center gap-1.5 shadow-sm active:bg-slate-800"><Plus size={14}/> Manual</button></div></div>

      {stmts.some(s=>(s.format||'').includes('Annual')&&!s.nights)&&<div className="bg-blue-50 border border-blue-100 rounded-xl p-3 mb-3 flex items-start gap-2 text-[11px] text-blue-700"><span>ℹ️</span><span>{lang==='es'?'Algunos meses provienen de un reporte anual. Es posible que datos como noches o reservaciones no estén disponibles para todos los meses. Puedes editarlos manualmente.':'Some months come from an annual report. Data like nights or reservations may not be available for all months. You can edit them manually.'}</span></div>}

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
          {label:t('grossRevenue'),r:true,render:r=><span className="text-blue-600 font-semibold">{sFm(r.revenue)}</span>},
          {label:t('nights'),r:true,render:r=>r.nights?<span className="text-slate-600">{r.nights} <span className="text-[9px] text-slate-400">({r.reservations||'—'}res)</span></span>:<span className="text-slate-300">—</span>},
          {label:t('pmCommission'),r:true,render:r=><span className="text-rose-400">{sFm(r.commission)}</span>},
          {label:t('electricity'),r:true,render:r=><span className="text-slate-500">{sFm(r.duke)}</span>},
          {label:'HOA',r:true,render:r=><span className="text-slate-500">{sFm(r.hoa)}</span>},
          {label:t('water'),r:true,render:r=><span className="text-slate-500">{sFm(r.water)}</span>},
          {label:'Manten.',r:true,render:r=><span className="text-slate-500">{sFm(r.maintenance)}</span>},
          {label:t('operatingExpenses'),r:true,render:r=>{const tc=(r.commission||0)+(r.duke||0)+(r.water||0)+(r.hoa||0)+(r.maintenance||0)+(r.vendor||0);return<span className="font-semibold text-rose-500">{sFm(tc)}</span>}},
          {label:'Neto',r:true,render:r=><span className="font-extrabold text-emerald-700">{sFm(r.net)}</span>},
          {label:'Margen',r:true,render:r=>{const m=r.revenue?(r.net/r.revenue*100):0;return<span className={`font-bold text-xs ${m<40?'text-rose-500':m<50?'text-amber-500':'text-emerald-500'}`}>{m.toFixed(0)}%</span>}},
        ]} rows={paged} onDel={del} dc="statements" onEdit={r=>{setStmtForm({year:r.year,month:r.month,revenue:String(r.revenue||''),net:String(r.net||''),commission:String(r.commission||''),duke:String(r.duke||''),water:String(r.water||''),hoa:String(r.hoa||''),maintenance:String(r.maintenance||''),vendor:String(r.vendor||''),nights:String(r.nights||''),reservations:String(r.reservations||'')});setEditId(r.id);setModal('addStmt')}}/>

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
          <span className="text-slate-400 font-semibold">{stmtYearFilter==='all'?'Total':'Total '+stmtYearFilter} ({filtered.length} months):</span>
          <div className="flex gap-5">
            <span>Gross Revenue: <b className="text-blue-600">{sFm(filtered.reduce((s,x)=>s+(x.revenue||0),0))}</b></span>
            <span>OpEx: <b className="text-rose-500">{sFm(filtered.reduce((s,x)=>s+(x.revenue||0)-(x.net||0),0))}</b></span>
            <span>Neto al Owner: <b className="text-emerald-600">{sFm(filtered.reduce((s,x)=>s+(x.net||0),0))}</b></span>
            <span>Margen: <b className="text-slate-700">{(()=>{const r=filtered.reduce((s,x)=>s+(x.revenue||0),0),n=filtered.reduce((s,x)=>s+(x.net||0),0);return r?((n/r)*100).toFixed(1)+'%':'—'})()}</b></span>
          </div>
        </div>
      </>:<Empty icon={ClipboardList} title="Sin statements" desc="Sube PDFs o ingrésalos manualmente." action="Cargar" onAction={()=>{setUploadLog([]);setModal('upload')}}/>}
    </>})()}


    {/* ═══ EXPENSES ═══ */}
    {view==='expenses'&&<>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6"><div className="flex items-center gap-2"><h1 className="text-lg md:text-[22px] font-extrabold text-slate-800">🧾 {t('expenses')}</h1><span className="text-[10px] font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full">{gVc}</span><CurToggle/></div><button onClick={()=>{setExpenseForm({date:'',concept:'',amount:'',paidBy:partners[0]?.id||'',category:'otros',type:'additional',frequency:'once',expCurrency:''});setModal('expense')}} className="px-4 py-2.5 bg-rose-500 text-white text-xs rounded-xl font-bold hover:bg-rose-600 active:bg-rose-700 flex items-center justify-center gap-1.5 shadow-sm"><Plus size={14}/> {t('addExpense')}</button></div>
      {expenses.length>0&&(()=>{
        const monthlyRecurring=expenses.filter(e=>eFreq(e)==='monthly').reduce((s,e)=>s+toPropCur(e.amount||0,e.expCurrency),0);
        const annualRecurring=expenses.filter(e=>eFreq(e)==='annual').reduce((s,e)=>s+toPropCur(e.amount||0,e.expCurrency),0);
        const oneTime=expenses.filter(e=>!isRecurring(e)).reduce((s,e)=>s+toPropCur(e.amount||0,e.expCurrency),0);
        const monthlyEquiv=monthlyRecurring+(annualRecurring/12);
        return <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 mb-5">
          <KPI label={`Costo Mensual`} value={gFm(monthlyEquiv)} sub="Fijos + anuales/12" color="blue"/>
          <KPI label="Mensuales" value={gFm(monthlyRecurring)} sub={expenses.filter(e=>eFreq(e)==='monthly').length+' gastos'} color="amber"/>
          <KPI label="Anuales" value={gFm(annualRecurring)} sub={gFm(annualRecurring/12)+'/mo equiv.'} color="purple"/>
          <KPI label="Compras" value={gFm(oneTime)} sub={expenses.filter(e=>!isRecurring(e)).length+' gastos'} color="red"/>
        </div>
      })()}
      {expByCat.length>0&&<div className="bg-white rounded-2xl p-3 md:p-5 border border-slate-200 shadow-sm overflow-hidden mb-4"><h3 className="text-sm font-bold text-slate-700 mb-3">Costo Mensual por Categoría <span className="text-[10px] text-slate-400 font-normal">(anuales ÷ 12)</span></h3><ResponsiveContainer width="100%" height={Math.max(150,expByCat.length*35)}><BarChart data={expByCat.map(c=>({...c,mensual:c.monthly||c.value}))} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0"/><XAxis type="number" tickFormatter={v=>gFm(v)} tick={{fontSize:10,fill:'#94a3b8'}}/><YAxis type="category" dataKey="name" tick={{fontSize:10,fill:'#64748b'}} width={120}/><Tooltip content={<Tip fmt={gFm}/>}/><Bar dataKey="mensual" name={t('monthly')} fill="#DC2626" radius={[0,6,6,0]}/></BarChart></ResponsiveContainer></div>}

      {/* Grouped by month */}
      {expenses.length>0&&(()=>{
        const sorted=[...expenses].sort((a,b)=>{const da=a.date||'0000';const db=b.date||'0000';return db.localeCompare(da)});
        const groups={};sorted.forEach(e=>{const d=e.date||'';const key=d?d.slice(0,7):'sin-fecha';if(!groups[key])groups[key]={label:d?M[parseInt(d.slice(5,7))-1]+' '+d.slice(0,4):'Sin fecha',items:[],total:0};groups[key].items.push(e);groups[key].total+=toPropCur(e.amount||0,e.expCurrency)});
        return Object.entries(groups).map(([key,g])=><div key={key} className="mb-4">
          <div className="flex justify-between items-center mb-2 px-1"><h3 className="text-sm font-bold text-slate-600">{g.label}</h3><span className="text-sm font-extrabold text-rose-500">{gFm(g.total)} <span className="text-[9px] text-slate-400">{gVc}</span></span></div>
          <Tbl cols={[
            {label:'Fecha',render:r=><span className="text-slate-500 text-xs">{r.date?r.date.slice(8):''}</span>},
            {label:'Concepto',key:'concept',cls:'text-slate-700 font-medium'},
            {label:'Categoría',render:r=>{const c=propCats.find(x=>x.v===r.category);return<span className="text-xs">{c?c.i+' '+c.l:r.category}</span>}},
            {label:'Tipo',render:r=>{const ef=eFreq(r);return<div className="flex gap-1 flex-wrap"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${r.type==='fixed'?'bg-amber-100 text-amber-700':'bg-slate-100 text-slate-600'}`}>{r.type==='fixed'?'Fijo':'Compra'}</span>{ef!=='once'&&<span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ef==='annual'?'bg-purple-100 text-purple-700':'bg-blue-100 text-blue-700'}`}>{ef==='annual'?'Anual':'Mensual'}</span>}</div>}},
            {label:'Pagó',render:r=><span style={{color:pCl(r.paidBy)}} className="text-xs font-semibold">{pN(r.paidBy)}</span>},
            {label:'Monto',r:true,render:r=>{const cv=toPropCur(r.amount||0,r.expCurrency);return<div className="text-right"><span className="font-bold text-rose-500">{gFm(cv)}</span>{r.expCurrency&&r.expCurrency!==propCurrency&&<div className="text-[9px] text-slate-400">({fmCurrency(r.amount,r.expCurrency)} {r.expCurrency})</div>}{eFreq(r)==='annual'&&<div className="text-[9px] text-slate-400">{gFm(cv/12)}/{t('mo')}</div>}</div>}}
          ]} rows={g.items} onDel={del} dc="expenses" onEdit={r=>{setExpenseForm({date:r.date||'',concept:r.concept||'',amount:String(r.amount||''),paidBy:r.paidBy||partners[0]?.id||'',category:r.category||'otros',type:r.type||'additional',frequency:r.frequency||'once',expCurrency:r.expCurrency||''});setEditId(r.id);setModal('expense')}}/>
        </div>)
      })()}
      {!expenses.length&&<Empty icon={Receipt} title="Sin gastos" desc="Registra gastos fijos y adicionales." action="Registrar" onAction={()=>{setExpenseForm({date:'',concept:'',amount:'',paidBy:partners[0]?.id||'',category:'otros',type:'additional',frequency:'once',expCurrency:''});setModal('expense')}}/>}
    </>}

    {/* ═══ INCOME (powered by statements) ═══ */}
    {view==='income'&&<>
      <div className="flex justify-between items-center mb-6"><h1 className="text-[22px] font-extrabold text-slate-800">💰 {t('income')} <span className="text-[10px] font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full">{gVc}</span> <CurToggle/></h1><button onClick={()=>{setIncForm({date:new Date().toISOString().split('T')[0],amount:'',source:'direct',concept:'',currency:'USD',nights:''});setEditId(null);setModal('addIncome')}} className="px-4 py-2.5 bg-emerald-600 text-white text-xs rounded-xl font-bold hover:bg-emerald-700 flex items-center gap-1.5 shadow-sm"><Plus size={14}/> {lang==='es'?'Reserva Directa':'Direct Booking'}</button></div>

      {/* Direct bookings */}
      {income.length>0&&<div className="bg-white rounded-2xl p-3 md:p-5 border border-slate-200 shadow-sm overflow-hidden mb-5">
        <h3 className="text-sm font-bold text-slate-700 mb-3">{lang==='es'?'Reservas Directas & Ingresos Adicionales':'Direct Bookings & Additional Income'} <span className="text-[10px] text-slate-400 font-normal">({income.length})</span></h3>
        <Tbl cols={[
          {label:lang==='es'?'Fecha':'Date',render:r=><span className="font-bold text-slate-700">{fmDate(r.date)}</span>},
          {label:lang==='es'?'Fuente':'Source',render:r=><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${r.source==='direct'?'bg-emerald-100 text-emerald-700':r.source==='booking'?'bg-blue-100 text-blue-700':r.source==='vrbo'?'bg-purple-100 text-purple-700':'bg-slate-100 text-slate-600'}`}>{r.source==='direct'?(lang==='es'?'Directa':'Direct'):r.source==='booking'?'Booking.com':r.source==='vrbo'?'VRBO':r.source||'Other'}</span>},
          {label:lang==='es'?'Concepto':'Concept',key:'concept',cls:'text-slate-600'},
          {label:lang==='es'?'Monto':'Amount',r:true,render:r=><span className="font-bold text-emerald-600">{gFm(r.amount)} <span className="text-[9px] text-slate-400">{r.currency||'USD'}</span></span>},
          {label:lang==='es'?'Noches':'Nights',r:true,render:r=>r.nights?<span className="text-slate-600">{r.nights}</span>:<span className="text-slate-300">—</span>},
        ]} rows={[...income].sort((a,b)=>(b.date||'').localeCompare(a.date||''))} onDel={del} dc="income" onEdit={r=>{setIncForm({date:r.date||'',amount:String(r.amount||''),source:r.source||'direct',concept:r.concept||'',currency:r.currency||'USD',nights:String(r.nights||'')});setEditId(r.id);setModal('addIncome')}}/>
        <div className="bg-emerald-50 rounded-xl p-3 mt-3 flex justify-between items-center text-xs border border-emerald-100">
          <span className="text-emerald-600 font-semibold">{lang==='es'?'Total Ingresos Directos':'Total Direct Income'}</span>
          <div className="flex gap-4"><span className="font-bold text-emerald-700">{gFm(income.reduce((s,i)=>s+(i.amount||0),0))}</span><span className="text-slate-500">{income.reduce((s,i)=>s+(i.nights||0),0)} {lang==='es'?'noches':'nights'}</span></div>
        </div>
      </div>}

      {/* Instructional card */}
      {income.length===0&&<div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 mb-5">
        <div className="flex items-start gap-3">
          <div className="text-lg">💡</div>
          <div className="text-[11px] text-emerald-800">
            <div className="font-bold text-[12px] mb-1">{lang==='es'?'¿Tienes reservas que no pasan por tu PM?':'Have bookings that don\'t go through your PM?'}</div>
            <div>{lang==='es'
              ?'Reservas directas, Booking.com, VRBO, o cualquier ingreso que no aparece en los statements del property manager. Regístralos aquí y se suman automáticamente al revenue del dashboard.'
              :'Direct bookings, Booking.com, VRBO, or any income not in your PM statements. Register them here and they auto-add to dashboard revenue.'}</div>
          </div>
        </div>
      </div>}

      {stmts.length>0?(()=>{
        const sorted=[...stmts].sort((a,b)=>b.year*100+b.month-a.year*100-a.month);
        const totR=stmts.reduce((s,x)=>s+(x.revenue||0),0);
        const totC=stmts.reduce((s,x)=>s+(x.commission||0),0);
        const totN=stmts.reduce((s,x)=>s+(x.net||0),0);
        const avgMonth=stmts.length>0?totR/stmts.length:0;
        const avgNet=stmts.length>0?totN/stmts.length:0;
        return <>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
          <KPI label="Revenue Bruto (USD)" value={sFm(totR)} sub={stmts.length+' months'} color="blue"/>
          <KPI label="Comisiones PM (USD)" value={sFm(totC)} sub={totR>0?((totC/totR)*100).toFixed(1)+'% del revenue':''} color="red"/>
          <KPI label="Net al Owner" value={sFm(totN)} sub={totR>0?((totN/totR)*100).toFixed(1)+'% margen':''} color="green"/>
          <KPI label="Promedio/Mes" value={sFm(avgMonth)} sub="revenue bruto" color="cyan"/>
          <KPI label="Net Promedio/Mes" value={sFm(avgNet)} sub="net al owner" color="green"/>
        </div>

        {/* Revenue by year */}
        {annual.length>0&&<div className="bg-white rounded-2xl p-3 md:p-5 border border-slate-200 shadow-sm overflow-hidden mb-4"><h3 className="text-sm font-bold text-slate-700 mb-3">Revenue por Año</h3>
          <div className="grid gap-2">{annual.map(y=>{const m=y.revenue?(y.net/y.revenue*100):0;return<div key={y.year} className="flex items-center gap-3 py-3 px-4 bg-slate-50 rounded-xl">
            <span className="font-extrabold text-slate-800 w-12">{y.year}</span>
            <div className="flex-1 bg-slate-200 rounded-full h-2.5 overflow-hidden"><div className="h-full bg-blue-500 rounded-full" style={{width:Math.min(100,(y.revenue/Math.max(...annual.map(a=>a.revenue))*100))+'%'}}/></div>
            <span className="text-sm font-bold text-blue-600 w-24 text-right">{sFm(y.revenue)}</span>
            <span className="text-sm font-bold text-emerald-600 w-24 text-right">{sFm(y.net)}</span>
            <span className={`text-xs font-bold w-14 text-right ${m<40?'text-rose-500':m<50?'text-amber-600':'text-emerald-600'}`}>{m.toFixed(0)}%</span>
            <span className="text-[10px] text-slate-400 w-8">{y.n}m</span>
          </div>})}</div>
        </div>}

        {/* Monthly detail table */}
        <div className="bg-white rounded-2xl p-3 md:p-5 border border-slate-200 shadow-sm overflow-hidden"><h3 className="text-sm font-bold text-slate-700 mb-3">Detalle Mensual</h3>
          <Tbl cols={[
            {label:'Periodo',render:r=><span className="font-bold text-slate-700">{M[r.month-1]} {r.year}</span>},
            {label:t('grossRevenue'),r:true,render:r=><span className="text-blue-600 font-semibold">{sFm(r.revenue)}</span>},
            {label:t('pmCommission'),r:true,render:r=><span className="text-rose-500">{sFm(r.commission)}</span>},
            {label:t('operatingExpenses'),r:true,render:r=><span className="text-rose-400">{sFm((r.duke||0)+(r.water||0)+(r.hoa||0)+(r.maintenance||0)+(r.vendor||0))}</span>},
            {label:'Neto',r:true,render:r=><span className="font-bold text-emerald-600">{sFm(r.net)}</span>},
            {label:'Margen',r:true,render:r=>{const m=r.revenue?(r.net/r.revenue*100):0;return<span className={`font-bold ${m<40?'text-rose-500':m<50?'text-amber-600':'text-emerald-600'}`}>{m.toFixed(0)}%</span>}},
            ...(partners.length>1?partners.map(p=>({label:p.name.split(' ')[0]+' ('+p.ownership+'%)',r:true,render:r=><span className="text-sm" style={{color:p.color}}>{sFm((r.net||0)*(p.ownership/100))}</span>})):[]),
          ]} rows={sorted}/>
        </div>
      </>})():<Empty icon={DollarSign} title="Sin ingresos" desc="Los ingresos se alimentan de los Statements. Ve a Statements y carga los PDFs de tu property manager." action="Ir a Statements" onAction={()=>setView('statements')}/>}
    </>}

    {/* ═══ MORTGAGE ═══ */}
    {view==='mortgage'&&<>
      <h1 className="text-[22px] font-extrabold text-slate-800 mb-6">🏦 {t('mortgageNav')} <span className="text-[10px] font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full">{gVc}</span> <CurToggle/></h1>

      {/* Upload mortgage statement */}
      <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl border border-blue-200 p-4 mb-5">
        <div className="flex items-center gap-3 mb-2">
          <Upload size={20} className="text-blue-600"/>
          <div>
            <div className="font-bold text-slate-800 text-sm">{lang==='es'?'Subir Statement de Hipoteca (PDF)':'Upload Mortgage Statement (PDF)'}</div>
            <div className="text-[11px] text-slate-500">{lang==='es'?'Extrae automáticamente: P&I, Tax Escrow, Insurance Escrow, Balance, Tasa':'Auto-extracts: P&I, Tax Escrow, Insurance Escrow, Balance, Rate'}</div>
          </div>
        </div>
        <label className="flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 text-white rounded-xl font-bold text-xs cursor-pointer hover:bg-blue-700 transition w-full sm:w-auto">
          <Upload size={14}/> {lang==='es'?'Seleccionar PDF':'Select PDF'}
          <input type="file" accept=".pdf" className="hidden" onChange={async(e)=>{
            const file=e.target.files?.[0];if(!file)return;
            notify(lang==='es'?'Analizando statement...':'Analyzing statement...','info');
            try{
              const {parseMortgageStatement:pMort}=await loadParsers();const r=await pMort(file);
              if(r.error){notify(r.error,'error');return;}
              setMortConfig({
                bal:r.balance?String(r.balance):(mortConfig.bal||''),
                rate:r.rate?String(r.rate):(mortConfig.rate||''),
                term:mortConfig.term||'30',
                pay:r.monthlyPayment?String(r.monthlyPayment):(mortConfig.pay||''),
                start:mortConfig.start||'',
                includesTaxes:r.includesTaxes||false,
                includesInsurance:r.includesInsurance||false,
              });
              const parts=[];
              if(r.principalAndInterest)parts.push(`P&I: $${r.principalAndInterest.toLocaleString()}`);
              if(r.taxEscrow)parts.push(`Tax: $${r.taxEscrow.toLocaleString()}`);
              if(r.insuranceEscrow)parts.push(`Ins: $${r.insuranceEscrow.toLocaleString()}`);
              if(r.otherEscrow)parts.push(`Other: $${r.otherEscrow.toLocaleString()}`);
              notify(`✅ ${r.servicer?r.servicer+' — ':''}${lang==='es'?'Datos extraídos':'Data extracted'}: ${parts.join(' · ')||'$'+r.monthlyPayment?.toLocaleString()+'/mo'}`,'success');
              // Show breakdown modal
              setModal('mortgageParsed');
              window.__mortParsed=r;
            }catch(err){notify('Error: '+err.message,'error')}
            e.target.value='';
          }}/>
        </label>
        <div className="text-[9px] text-slate-400 mt-2">{lang==='es'?'Compatible con: Mr. Cooper, Wells Fargo, Chase, NewRez, PennyMac, Flagstar, Freedom Mortgage y más':'Compatible with: Mr. Cooper, Wells Fargo, Chase, NewRez, PennyMac, Flagstar, Freedom Mortgage and more'}</div>
      </div>
      {mort.balance>0?<>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5"><KPI label="Balance" value={gFm(mort.balance)} color="red"/><KPI label={lang==='es'?'Tasa':'Rate'} value={mort.rate+'%'} sub={mort.termYears+` ${lang==='es'?'años':'years'}`} color="amber"/><KPI label="Equity" value={gFm(equity)} sub={'LTV: '+ltv.toFixed(0)+'%'} color="green"/><KPI label={lang==='es'?'Total Intereses':'Total Interest'} value={sNE.length>0?fm(sNE[sNE.length-1].ti):'$0'} sub={lang==='es'?'vida del préstamo':'life of loan'} color="purple"/></div>

        {/* Payment Breakdown — where every dollar goes */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm mb-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-bold text-slate-700">{lang==='es'?'¿A dónde va tu pago mensual?':'Where does your monthly payment go?'} {mort.servicer&&<span className="text-[10px] text-blue-500 font-normal">· {mort.servicer}</span>}</h3>
            <div className="text-right"><div className="text-lg font-black text-slate-800">{gFm(mort.monthlyPayment)}<span className="text-[10px] text-slate-400 font-normal">/{t('mo')}</span></div></div>
          </div>

          {(()=>{
            const total=mort.monthlyPayment||0;
            if(total<=0) return <div className="text-[11px] text-slate-400 text-center py-4">{lang==='es'?'Configura el pago mensual para ver el desglose.':'Set the monthly payment to see the breakdown.'}</div>;

            // Get breakdown from saved data
            let p=mort.principal||0;
            let i=mort.interest||0;
            let pi=mort.principalAndInterest||0;
            let tiCombined=mort.taxAndInsuranceCombined||0;
            let tax=mort.taxEscrow||0;
            let ins=mort.insuranceEscrow||0;
            const other=mort.otherEscrow||0;

            // Calculate P&I from loan terms if not saved
            if(!pi && mort.balance>0 && mort.rate>0) {
              const mr=mort.rate/100/12;
              const nm=(mort.termYears||30)*12;
              pi=mort.balance*(mr*Math.pow(1+mr,nm))/(Math.pow(1+mr,nm)-1);
              pi=Math.round(pi*100)/100;
              i=Math.round(mort.balance*mr*100)/100;
              p=Math.round((pi-i)*100)/100;
            }

            // Calculate escrow from total minus P&I
            if(pi>0 && !tiCombined && !tax && !ins) {
              const escrow=Math.round((total-pi-other)*100)/100;
              if(escrow>50) {
                if(mort.includesTaxes&&mort.includesInsurance) {
                  tiCombined=escrow;
                } else if(mort.includesTaxes) { tax=escrow; }
                else if(mort.includesInsurance) { ins=escrow; }
                else { tiCombined=escrow; } // assume escrow if there's a gap
              }
            }

            const items=[];
            if(p>0) items.push({label:'Principal',value:p,color:'bg-emerald-500',desc:lang==='es'?'Reduce tu deuda — construye equity':'Reduces your debt — builds equity'});
            if(i>0) items.push({label:lang==='es'?'Interés':'Interest',value:i,color:'bg-rose-400',desc:lang==='es'?'Costo del préstamo — no recuperable':'Cost of borrowing — non-recoverable'});
            if(!p&&!i&&pi>0) items.push({label:'P&I',value:pi,color:'bg-slate-500',desc:'Principal + Interest'});
            if(tiCombined>0) items.push({label:'Tax + Insurance',value:tiCombined,color:'bg-blue-500',desc:lang==='es'?'Escrow — impuestos + seguro':'Escrow — taxes + insurance'});
            if(!tiCombined&&tax>0) items.push({label:lang==='es'?'Impuestos':'Taxes',value:tax,color:'bg-blue-500',desc:'Property Tax via escrow'});
            if(!tiCombined&&ins>0) items.push({label:lang==='es'?'Seguro':'Insurance',value:ins,color:'bg-cyan-500',desc:lang==='es'?'Seguro via escrow':'Insurance via escrow'});
            if(other>0) items.push({label:'PMI / Other',value:other,color:'bg-amber-400',desc:lang==='es'?'Seguro hipotecario':'Mortgage insurance'});

            // Fallback: if no breakdown available, show what we know
            if(items.length===0) {
              if(mort.includesTaxes||mort.includesInsurance) {
                // We know escrow is included but can't calculate — show simple split
                items.push({label:'P&I',value:total*0.7,color:'bg-slate-500',desc:lang==='es'?'Estimado — sube statement para datos exactos':'Estimated — upload statement for exact data'});
                items.push({label:'Tax + Insurance',value:total*0.3,color:'bg-blue-500',desc:lang==='es'?'Estimado — sube statement para datos exactos':'Estimated — upload statement for exact data'});
              } else {
                items.push({label:lang==='es'?'Pago Mensual':'Monthly Payment',value:total,color:'bg-slate-500',desc:lang==='es'?'Sube el statement de tu banco para ver el desglose completo':'Upload your bank statement to see the full breakdown'});
              }
            }

            const sumParts=items.reduce((s,x)=>s+x.value,0);
            const barTotal=sumParts>0?sumParts:total;

            return<div className="space-y-2.5">
              <div className="h-8 rounded-lg overflow-hidden flex">
                {items.map((it,idx)=><div key={idx} className={`${it.color} relative`} style={{width:Math.max(3,it.value/barTotal*100)+'%'}}><div className="absolute inset-0 flex items-center justify-center"><span className="text-[8px] font-bold text-white truncate px-1">{(it.value/barTotal*100).toFixed(0)}%</span></div></div>)}
              </div>
              {items.map((it,idx)=><div key={idx} className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-sm ${it.color} shrink-0`}/>
                <div className="flex-1">
                  <div className="text-[11px] font-semibold text-slate-700">{it.label}</div>
                  <div className="text-[9px] text-slate-400">{it.desc}</div>
                </div>
                <div className="text-right">
                  <div className="text-[12px] font-bold text-slate-800">{gFm(it.value)}</div>
                  <div className="text-[9px] text-slate-400">{(it.value/barTotal*100).toFixed(1)}%</div>
                </div>
              </div>)}
              <div className="border-t border-slate-100 pt-2 mt-1 grid grid-cols-2 gap-2 text-center">
                <div className="bg-slate-50 rounded-lg p-2"><div className="text-[9px] text-slate-400 uppercase">{lang==='es'?'Pagas al año':'Annual payment'}</div><div className="text-sm font-extrabold text-slate-700">{gFm(total*12)}</div></div>
                {p>0&&<div className="bg-emerald-50 rounded-lg p-2"><div className="text-[9px] text-emerald-500 uppercase">{lang==='es'?'Equity ganado/año':'Equity gained/yr'}</div><div className="text-sm font-extrabold text-emerald-700">{gFm(p*12)}</div></div>}
              </div>
            </div>;
          })()}

          {(mort.includesTaxes||mort.includesInsurance)&&<div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 mt-3 text-[10px] text-emerald-700">✅ {lang==='es'?'Tax e Insurance incluidos en tu pago — excluidos automáticamente de Operating Expenses en el P&L.':'Tax and Insurance included in your payment — auto-excluded from Operating Expenses in the P&L.'}</div>}
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm mb-4"><h3 className="text-base font-extrabold text-slate-800 mb-1">💰 Simulador de Pagos Anticipados</h3><p className="text-xs text-slate-400 mb-5">¿Cuánto extra al principal cada mes?</p>
          <div className="max-w-md mb-6"><div className="grid grid-cols-1 md:grid-cols-2 gap-3"><Inp label="Extra MENSUAL al principal" value={extraP} onChange={setExtraP} prefix="$" type="number" placeholder="Ej: 200"/><Inp label="Extra ANUAL al principal" value={extraPA} onChange={setExtraPA} prefix="$" type="number" placeholder="Ej: 5,000"/></div><p className="text-[10px] text-slate-400 mt-2">El pago mensual extra se aplica cada mes. El pago anual se aplica una vez al año al final de cada año.</p></div>
          {sE.length>0&&sNE.length>0&&<><div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-emerald-50 rounded-2xl p-5 text-center border border-emerald-100"><div className="text-[10px] text-emerald-600 font-bold uppercase">Se paga en</div><div className="text-3xl font-extrabold text-emerald-700 mt-1">{Math.ceil(sE[sE.length-1].mo/12)} años</div><div className="text-xs text-emerald-500">vs {Math.ceil(sNE[sNE.length-1].mo/12)} sin extra</div></div>
            <div className="bg-blue-50 rounded-2xl p-5 text-center border border-blue-100"><div className="text-[10px] text-blue-600 font-bold uppercase">Ahorro</div><div className="text-3xl font-extrabold text-blue-700 mt-1">{gFm(sNE[sNE.length-1].ti-sE[sE.length-1].ti)}</div></div>
            <div className="bg-amber-50 rounded-2xl p-5 text-center border border-amber-100"><div className="text-[10px] text-amber-600 font-bold uppercase">Meses Menos</div><div className="text-3xl font-extrabold text-amber-700 mt-1">{sNE[sNE.length-1].mo-sE[sE.length-1].mo}</div></div>
          </div><ResponsiveContainer width="100%" height={260}><AreaChart data={sNE.map((d,i)=>({yr:'Año '+d.yr,sin:d.bal,con:sE[i]?.bal||0}))}><CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0"/><XAxis dataKey="yr" tick={{fontSize:9,fill:'#94a3b8'}} interval={4}/><YAxis tick={{fontSize:10,fill:'#94a3b8'}} tickFormatter={v=>gFm(v)}/><Tooltip content={<Tip fmt={gFm}/>}/><Legend wrapperStyle={{fontSize:11}}/><Area dataKey="sin" name="Sin extra" stroke="#DC2626" fill="rgba(220,38,38,.05)"/><Area dataKey="con" name={`$${extraP||0}/mo${extraPA?` + $${extraPA}/año`:''} extra`} stroke="#059669" fill="rgba(5,150,105,.05)"/></AreaChart></ResponsiveContainer></>}
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={()=>{setMortConfig({bal:String(mort.balance||''),rate:String(mort.rate||''),term:String(mort.termYears||30),pay:String(mort.monthlyPayment||''),start:mort.startDate||'',includesTaxes:!!mort.includesTaxes,includesInsurance:!!mort.includesInsurance});setModal('editMort')}} className="text-sm text-blue-600 font-semibold hover:text-blue-800 flex items-center gap-1.5 px-3 py-2 rounded-xl hover:bg-blue-50 transition"><Settings size={15}/> {lang==='es'?'Editar hipoteca':'Edit mortgage'}</button>
          <button onClick={async()=>{if(!confirm(lang==='es'?'¿Borrar los datos de hipoteca de esta propiedad?':'Delete mortgage data for this property?'))return;try{await updateDoc(doc(db,'properties',propertyId),{mortgage:{balance:0,rate:0,termYears:0,monthlyPayment:0,startDate:'',includesTaxes:false,includesInsurance:false,principalAndInterest:0,taxEscrow:0,insuranceEscrow:0,otherEscrow:0,servicer:''}});notify(lang==='es'?'Hipoteca eliminada':'Mortgage deleted','success')}catch(e){notify('Error: '+e.message,'error')}}} className="text-sm text-rose-500 font-semibold hover:text-rose-700 flex items-center gap-1.5 px-3 py-2 rounded-xl hover:bg-rose-50 transition"><Trash2 size={15}/> {lang==='es'?'Borrar hipoteca':'Delete mortgage'}</button>
        </div>
      </>:<div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm max-w-lg">
        <div className="flex items-center gap-3 mb-5"><div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center"><Landmark size={24} className="text-blue-600"/></div><div><h3 className="text-base font-extrabold text-slate-800">Configure Mortgage</h3><p className="text-xs text-slate-400">Enter your mortgage details.</p></div></div>
        <div className="space-y-3"><div className="grid grid-cols-1 md:grid-cols-2 gap-3"><Inp label="Balance" value={mortConfig.bal} onChange={v=>umc('bal',v)} prefix="$" type="number" placeholder="285,000"/><Inp label="Tasa (%)" value={mortConfig.rate} onChange={v=>umc('rate',v)} type="number" placeholder="7.25"/></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3"><Inp label={lang==='es'?'Plazo (años)':'Term (years)'} value={mortConfig.term} onChange={v=>umc('term',v)} type="number" placeholder="30"/><Inp label={lang==='es'?'Pago Mensual Total':'Total Monthly Payment'} value={mortConfig.pay} onChange={v=>umc('pay',v)} prefix="$" type="number" placeholder="1,945"/><Inp label={lang==='es'?'Inicio':'Start'} value={mortConfig.start} onChange={v=>umc('start',v)} type="date"/></div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
          <div className="text-[11px] font-bold text-blue-700 mb-2">{lang==='es'?'¿Qué incluye tu pago mensual? (Escrow)':'What does your monthly payment include? (Escrow)'}</div>
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={!!mortConfig.includesTaxes} onChange={e=>umc('includesTaxes',e.target.checked)} className="w-4 h-4 rounded border-blue-300 text-blue-600"/><span className="text-[11px] text-slate-700">{lang==='es'?'🏛️ Incluye Property Taxes':'🏛️ Includes Property Taxes'}</span></label>
            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={!!mortConfig.includesInsurance} onChange={e=>umc('includesInsurance',e.target.checked)} className="w-4 h-4 rounded border-blue-300 text-blue-600"/><span className="text-[11px] text-slate-700">{lang==='es'?'🛡️ Incluye Homeowner\'s Insurance':'🛡️ Includes Homeowner\'s Insurance'}</span></label>
          </div>
        </div></div>
        <button onClick={saveMortgage} disabled={!mortConfig.bal||!mortConfig.rate||!mortConfig.pay||savingMort} className="w-full mt-5 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 disabled:opacity-30 transition shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2">{savingMort&&<Loader2 size={16} className="animate-spin"/>}💾 Save Mortgage</button>
      </div>}
    </>}

    {/* ═══ REPAIRS & CAPEX ═══ */}
    {view==='repairs'&&<>
      <div className="flex justify-between items-center mb-6"><h1 className="text-[22px] font-extrabold text-slate-800">🔧 Repairs & CapEx <span className="text-[10px] font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full">{gVc}</span> <CurToggle/></h1><button onClick={()=>{setRepairForm({date:new Date().toISOString().split('T')[0],title:'',description:'',amount:'',vendor:'',category:'repair',status:'pending',paidBy:partners[0]?.id||''});setEditId(null);setModal('repair')}} className="px-4 py-2.5 bg-amber-600 text-white text-xs rounded-xl font-bold hover:bg-amber-700 flex items-center gap-1.5 shadow-sm"><Plus size={14}/> Nuevo Ticket</button></div>

      {repairs.length>0&&<div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <KPI label="Total Repairs" value={gFm(repairs.reduce((s,r)=>s+(parseFloat(r.amount)||0),0))} sub={repairs.length+' tickets'} color="amber"/>
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
        {label:'Monto',r:true,render:r=><span className="font-bold text-amber-600">{gFm(r.amount)}</span>},
      ]} rows={repairs} onDel={del} dc="repairs" onEdit={r=>{setRepairForm({date:r.date||'',title:r.title||'',description:r.description||'',amount:String(r.amount||''),vendor:r.vendor||'',category:r.category||'repair',status:r.status||'pending',paidBy:r.paidBy||''});setEditId(r.id);setModal('repair')}}/>
      :<Empty icon={Wrench} title="Sin reparaciones" desc="Registra mantenimientos, reparaciones y mejoras de capital (CapEx) de tu propiedad." action="Crear Ticket" onAction={()=>{setRepairForm({date:new Date().toISOString().split('T')[0],title:'',description:'',amount:'',vendor:'',category:'repair',status:'pending',paidBy:partners[0]?.id||''});setModal('repair')}}/>}
    </>}

    {/* ═══ VALUATION & EQUITY ═══ */}
    {view==='valuation'&&<>
      <div className="flex justify-between items-center mb-6"><h1 className="text-[22px] font-extrabold text-slate-800">📈 Appreciation & Equity <span className="text-[10px] font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full">{gVc}</span> <CurToggle/></h1><button onClick={()=>{setValForm({date:new Date().toISOString().split('T')[0],value:'',source:'manual',notes:''});setEditId(null);setModal('valuation')}} className="px-4 py-2.5 bg-blue-600 text-white text-xs rounded-xl font-bold hover:bg-blue-700 flex items-center gap-1.5 shadow-sm"><Plus size={14}/> Registrar Valor</button></div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <KPI label="Precio de Purchase Price" value={gFm(prop.purchasePrice)} color="blue"/>
        <KPI label="Market Value" value={gFm(marketValue)} sub={latestVal?'Actualizado '+fmDate(latestVal.date):'Purchase Price'} color={appreciation>=0?'green':'red'}/>
        <KPI label="Equity" value={gFm(realEquity)} sub={mort.balance>0?'Value - Mortgage':'No mortgage'} color="green" alert={realEquity>0?'green':'red'}/>
        <KPI label="Apreciación" value={appreciation.toFixed(1)+'%'} sub={appreciation>=0?gFm(marketValue-prop.purchasePrice)+' ganancia':gFm(prop.purchasePrice-marketValue)+' pérdida'} color={appreciation>=0?'green':'red'} trend={{dir:appreciation>=0?'up':'down',text:gFm(Math.abs(marketValue-prop.purchasePrice))}}/>
      </div>

      {mort.balance>0&&<div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
        <KPI label="LTV Real" value={realLTV.toFixed(1)+'%'} sub={realLTV>80?'Alto apalancamiento':realLTV>60?'Moderado':'Conservador'} color={realLTV>80?'red':realLTV>60?'amber':'green'}/>
        <KPI label="Mortgage Balance" value={gFm(mort.balance)} color="red"/>
        <KPI label="Valor Total Invertido" value={gFm(totCont)} sub="Capital de todos los socios" color="purple"/>
      </div>}

      {/* Equity waterfall */}
      <div className="bg-white rounded-2xl p-3 md:p-5 border border-slate-200 shadow-sm overflow-hidden mb-4">
        <h3 className="text-sm font-bold text-slate-700 mb-4">Composición del Equity</h3>
        <div className="space-y-3">
          <div className="flex justify-between py-3 px-4 bg-blue-50 rounded-xl border border-blue-100"><span className="font-bold text-blue-700">{t('marketValue')}</span><span className="font-extrabold text-blue-700 text-lg">{gFm(marketValue)}</span></div>
          {mort.balance>0&&<div className="pl-6"><div className="flex justify-between py-2 text-sm"><span className="text-rose-500">(-) Balance Mortgage Balance</span><span className="font-semibold text-rose-500">{gFm(mort.balance)}</span></div></div>}
          <div className={`flex justify-between py-3 px-4 rounded-xl border ${realEquity>=0?'bg-emerald-50 border-emerald-100':'bg-rose-50 border-rose-100'}`}><span className={`font-bold ${realEquity>=0?'text-emerald-700':'text-rose-700'}`}>= Equity Neto</span><span className={`font-extrabold text-lg ${realEquity>=0?'text-emerald-700':'text-rose-700'}`}>{gFm(realEquity)}</span></div>
          {prop.purchasePrice>0&&<div className="pl-6 space-y-1">
            <div className="flex justify-between py-2 text-sm"><span className="text-slate-500">Capital aportado (down payment + extras)</span><span className="font-semibold">{gFm(totCont)}</span></div>
            <div className="flex justify-between py-2 text-sm"><span className="text-slate-500">Apreciación / Depreciación</span><span className={`font-semibold ${appreciation>=0?'text-emerald-600':'text-rose-500'}`}>{gFm(marketValue-prop.purchasePrice)}</span></div>
            {mort.balance>0&&<div className="flex justify-between py-2 text-sm"><span className="text-slate-500">Principal pagado (equity por amortización)</span><span className="font-semibold text-blue-600">{gFm(prop.purchasePrice-mort.balance-totCont)}</span></div>}
          </div>}
        </div>
      </div>

      {/* Valuation History */}
      {valuations.length>0&&<>
        <div className="bg-white rounded-2xl p-3 md:p-5 border border-slate-200 shadow-sm overflow-hidden mb-4"><h3 className="text-sm font-bold text-slate-700 mb-4">Historial de Appreciation</h3>
          <ResponsiveContainer width="100%" height={160}><AreaChart data={[{date:fmDate(prop.purchaseDate),value:prop.purchasePrice},...[...valuations].sort((a,b)=>(a.date||'').localeCompare(b.date||'')).map(v=>({date:fmDate(v.date),value:parseFloat(v.value)||0}))]}><CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0"/><XAxis dataKey="date" tick={{fontSize:9,fill:'#94a3b8'}}/><YAxis tick={{fontSize:10,fill:'#94a3b8'}} tickFormatter={v=>gFm(v)}/><Tooltip content={<Tip fmt={gFm}/>}/><Area dataKey="value" name="Valor" stroke="#059669" fill="rgba(5,150,105,.1)" strokeWidth={2.5}/></AreaChart></ResponsiveContainer>
        </div>
        <Tbl cols={[{label:'Fecha',render:r=><span className="text-slate-500 font-medium">{fmDate(r.date)}</span>},{label:'Valor Estimado',r:true,render:r=><span className="font-bold text-emerald-600">{gFm(r.value)}</span>},{label:'Fuente',render:r=><span className="text-xs text-slate-400">{r.source==='zillow'?'Zillow':r.source==='redfin'?'Redfin':r.source==='appraisal'?'Avalúo':r.source==='broker'?'Broker':'Manual'}</span>},{label:'Notas',key:'notes',cls:'text-xs text-slate-400'}]} rows={[...valuations].sort((a,b)=>(b.date||'').localeCompare(a.date||''))} onDel={del} dc="valuations" onEdit={r=>{setValForm({date:r.date||'',value:String(r.value||''),source:r.source||'manual',notes:r.notes||''});setEditId(r.id);setModal('valuation')}}/>
      </>}
      {!valuations.length&&<div className="bg-white rounded-2xl p-3 md:p-5 border border-slate-200 shadow-sm overflow-hidden"><p className="text-sm text-slate-400 text-center py-4">Registra el valor actual de tu propiedad para trackear apreciación y equity real. Puedes usar Zillow, Redfin, un avalúo o tu propia estimación.</p></div>}
    </>}

    {/* ═══ PIPELINE ═══ */}
    {view==='pipeline'&&<>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
        <div><h1 className="text-lg md:text-[22px] font-extrabold text-slate-800">📋 Obligaciones <span className="text-[10px] font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full">{gVc}</span> <CurToggle/></h1><p className="text-xs text-slate-400 mt-1">Registra aquí tus pagos recurrentes. Al marcar "Pagado" el gasto se registra automáticamente.</p></div>
        <button onClick={()=>{setTaskForm({title:'',dueDate:'',priority:'medium',status:'pending',notes:'',amount:'',frequency:'annual',payer:'owner',reminderDays:'30'});setEditId(null);setModal('task')}} className="px-4 py-2.5 bg-indigo-600 text-white text-xs rounded-xl font-bold hover:bg-indigo-700 active:bg-indigo-800 flex items-center justify-center gap-1.5 shadow-sm"><Plus size={14}/> Agregar</button>
      </div>

      {/* Smart suggestions based on statements */}
      {(()=>{
        const pmCovers={commission:stmts.some(s=>(s.commission||0)>0),electricity:stmts.some(s=>(s.duke||0)>0),water:stmts.some(s=>(s.water||0)>0),hoa:stmts.some(s=>(s.hoa||0)>0),maintenance:stmts.some(s=>(s.maintenance||0)>0)};
        const pmTasks=tasks.filter(t=>t.payer==='pm');
        const usObligations=[
          {title:'Mortgage',icon:'🏦',freq:'monthly'},
          {title:'Taxes',icon:'🏛️',freq:'annual'},
          {title:'Insurance',icon:'🛡️',freq:'annual'},
          {title:'Contabilidad',icon:'📊',freq:'monthly'},
          ...(!pmCovers.hoa?[{title:'HOA',icon:'🏢',freq:'monthly'}]:[]),
        ];
        const coObligations=[
          {title:'Personal de Servicio',icon:'👷',freq:'monthly'},
          {title:'Prestaciones Sociales',icon:'📋',freq:'monthly'},
          {title:'Jardinería',icon:'🌿',freq:'monthly'},
          {title:'Impuesto Predial',icon:'🏛️',freq:'annual'},
          {title:'Insurances',icon:'🛡️',freq:'annual'},
          {title:'Contabilidad',icon:'📊',freq:'monthly'},
          {title:'Mortgage',icon:'🏦',freq:'monthly'},
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
            <div className="flex flex-wrap gap-1.5">{pmCovers.commission&&<span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-semibold">💼 Commission</span>}{pmCovers.electricity&&<span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-semibold">⚡ Electricity</span>}{pmCovers.water&&<span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-semibold">💧 Water</span>}{pmCovers.hoa&&<span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-semibold">🏢 HOA</span>}{pmCovers.maintenance&&<span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-semibold">🔧 Maintenance</span>}{pmTasks.map(t=><span key={t.id} className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-semibold">{t.title}</span>)}</div>
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
          <KPI label="Costo Propietario/Mes" value={gFm(monthly)} sub={totalAnnual>0?fm(totalAnnual)+'/año':''} color="blue"/>
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
          const icons={'Mortgage':'🏦','Taxes':'🏛️','Insurance':'🛡️','Accounting':'📊','HOA':'🏢'};
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
                {t.amount&&<span className="font-semibold text-slate-600">{gFm(parseFloat(t.amount)||0)}{t.frequency==='monthly'?'/mo':'/año'}</span>}
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
      <div className="flex justify-between items-center mb-2 no-print"><h1 className="text-[22px] font-extrabold text-slate-800">📄 Reportes Financieros <span className="text-[10px] font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full">{gVc}</span> <CurToggle/></h1><button onClick={()=>window.print()} className="px-4 py-2.5 bg-slate-100 text-slate-600 text-xs rounded-xl font-bold hover:bg-slate-200 flex items-center gap-1.5 transition"><Printer size={13}/> Imprimir PDF</button></div>
      <p className="text-sm text-slate-400 mb-5 no-print">Reportes profesionales de tu propiedad. Selecciona un reporte y dale Imprimir PDF.</p>

      {/* Report tabs */}
      <div className="flex gap-1 bg-white rounded-2xl p-1.5 border border-slate-200 shadow-sm mb-5 overflow-x-auto no-print">
        {[['performance','📊 Performance'],['pnl','📋 Detailed P&L'],['partners','👥 Partners'],['cashflow','💰 Cash Flow'],['mortgage_rpt','🏦 Mortgage'],['expenses_rpt',`🧾 ${t('expenses')}`]].map(([k,l])=>
          <button key={k} onClick={()=>setRptTab(k)} className={`px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${rptTab===k?'bg-blue-600 text-white shadow-md':'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}>{l}</button>
        )}
      </div>

      {/* PERFORMANCE REPORT */}
      {rptTab==='performance'&&<div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 print:shadow-none print:border-none">
        <div className="border-b-2 border-blue-600 pb-3 mb-5"><h2 className="text-lg font-extrabold text-slate-800">{prop.name} — Reporte de Rendimiento</h2><p className="text-xs text-slate-400">{prop.address}, {prop.city}, {prop.state} · Generated: {new Date().toLocaleDateString('es')}</p></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-blue-50 rounded-xl p-3 text-center border border-blue-100"><div className="text-[10px] text-blue-600 font-bold uppercase">Revenue Total</div><div className="text-xl font-extrabold text-blue-700">{gFm(revenue)}</div></div>
          <div className="bg-emerald-50 rounded-xl p-3 text-center border border-emerald-100"><div className="text-[10px] text-emerald-600 font-bold uppercase">{t("noi")}</div><div className="text-xl font-extrabold text-emerald-700">{gFm(noi)}</div></div>
          <div className={`rounded-xl p-3 text-center border ${cashFlow>=0?'bg-emerald-50 border-emerald-100':'bg-rose-50 border-rose-100'}`}><div className={`text-[10px] font-bold uppercase ${cashFlow>=0?'text-emerald-600':'text-rose-600'}`}>{t("cashFlow")}</div><div className={`text-xl font-extrabold ${cashFlow>=0?'text-emerald-700':'text-rose-700'}`}>{gFm(cashFlow)}</div></div>
          <div className="bg-purple-50 rounded-xl p-3 text-center border border-purple-100"><div className="text-[10px] text-purple-600 font-bold uppercase">Retorno CoC</div><div className="text-xl font-extrabold text-purple-700">{coc.toFixed(1)}%</div></div>
        </div>
        <div className="grid grid-cols-6 gap-2 mb-6">
          <div className="bg-slate-50 rounded-lg p-2.5 text-center"><div className="text-[9px] text-slate-500 font-semibold uppercase">Margen</div><div className="text-sm font-extrabold text-slate-800">{margin.toFixed(1)}%</div></div>
          <div className="bg-slate-50 rounded-lg p-2.5 text-center"><div className="text-[9px] text-slate-500 font-semibold uppercase">{t('capRate')}</div><div className="text-sm font-extrabold text-slate-800">{capRate.toFixed(2)}%</div></div>
          <div className="bg-slate-50 rounded-lg p-2.5 text-center"><div className="text-[9px] text-slate-500 font-semibold uppercase">{t('expenseRatio')}</div><div className="text-sm font-extrabold text-slate-800">{expRatio.toFixed(1)}%</div></div>
          <div className="bg-slate-50 rounded-lg p-2.5 text-center"><div className="text-[9px] text-slate-500 font-semibold uppercase">{t('equity')}</div><div className="text-sm font-extrabold text-slate-800">{gFm(equity)}</div></div>
          <div className="bg-slate-50 rounded-lg p-2.5 text-center"><div className="text-[9px] text-slate-500 font-semibold uppercase">LTV</div><div className="text-sm font-extrabold text-slate-800">{ltv.toFixed(0)}%</div></div>
          <div className="bg-slate-50 rounded-lg p-2.5 text-center"><div className="text-[9px] text-slate-500 font-semibold uppercase">Capital</div><div className="text-sm font-extrabold text-slate-800">{gFm(totCont)}</div></div>
        </div>
        {relAnnual.length>0&&<><h3 className="text-sm font-bold text-slate-700 mb-3">Evolución Anual</h3>
          <ResponsiveContainer width="100%" height={220}><ComposedChart data={relAnnual}><CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0"/><XAxis dataKey="year" tick={{fontSize:11,fill:'#94a3b8'}}/><YAxis tick={{fontSize:10,fill:'#94a3b8'}} tickFormatter={v=>sFm(v)}/><Tooltip content={<Tip fmt={sFm}/>}/><Legend wrapperStyle={{fontSize:11}}/><Bar dataKey="revenue" name={t("grossRevenue")} fill="#2563EB" radius={[4,4,0,0]}/><Bar dataKey="net" name="Net" fill="#059669" radius={[4,4,0,0]}/><Line dataKey="commission" name={t("pmCommission")} stroke="#DC2626" strokeWidth={2} dot={{r:3}}/></ComposedChart></ResponsiveContainer>
        </>}
        {monthRank.length>0&&<><h3 className="text-sm font-bold text-slate-700 mt-5 mb-3">Estacionalidad — Mejores y Peores Meses</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">{monthRank.slice(0,4).map((r,i)=><div key={r.month} className="bg-emerald-50 rounded-xl p-3 text-center border border-emerald-100"><div className="text-[10px] text-emerald-600 font-bold">#{i+1} MEJOR</div><div className="text-base font-extrabold text-emerald-700">{r.month}</div><div className="text-xs text-emerald-500">{gFm(r.avg)} avg</div></div>)}
          {monthRank.slice(-3).reverse().map((r,i)=><div key={r.month} className="bg-rose-50 rounded-xl p-3 text-center border border-rose-100"><div className="text-[10px] text-rose-600 font-bold">PEOR</div><div className="text-base font-extrabold text-rose-700">{r.month}</div><div className="text-xs text-rose-500">{gFm(r.avg)} avg</div></div>)}</div>
        </>}
      </div>}

      {/* P&L REPORT */}
      {rptTab==='pnl'&&<div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="border-b-2 border-blue-600 pb-3 mb-5"><h2 className="text-lg font-extrabold text-slate-800">Estado de Resultados (P&L)</h2><p className="text-xs text-slate-400">{prop.name} · {annual.length>0?annual[0].year+' — '+annual[annual.length-1].year:t('noData')}</p></div>
        {annual.length>0?<>
          <Tbl cols={[{label:'Concepto',render:r=><span className={`${r.bold?'font-extrabold':'font-medium'} ${r.color||'text-slate-700'}`}>{r.concept}</span>},...annual.map(y=>({label:y.year+(y.n<12?` (${y.n}m)`:''),r:true,render:r=>{const v=r.values[y.year];return<span className={`${r.bold?'font-extrabold':'font-medium'} ${r.color||''}`}>{v!==undefined?gFm(v):'—'}</span>}}))]}
            rows={[
              {concept:'Revenue (Gross)',bold:true,color:'text-blue-600',values:Object.fromEntries(annual.map(y=>[y.year,y.revenue]))},
              {concept:'(-) PM Commission',color:'text-rose-500',values:Object.fromEntries(annual.map(y=>[y.year,y.commission]))},
              {concept:'(-) Electricity',values:Object.fromEntries(annual.map(y=>[y.year,y.duke]))},
              {concept:'(-) HOA',values:Object.fromEntries(annual.map(y=>[y.year,y.hoa]))},
              {concept:'(-) Maintenance',values:Object.fromEntries(annual.map(y=>[y.year,y.maintenance]))},
              {concept:'(-) Water',values:Object.fromEntries(annual.map(y=>[y.year,y.water]))},
              {concept:'(-) Vendor/Other',values:Object.fromEntries(annual.map(y=>[y.year,y.vendor]))},
              {concept:'Net al Owner',bold:true,color:'text-emerald-600',values:Object.fromEntries(annual.map(y=>[y.year,y.net]))},
              {concept:'Margen',bold:true,color:null,values:Object.fromEntries(annual.map(y=>[y.year,y.revenue?(y.net/y.revenue*100):0])),render:null},
            ].map(r=>({...r,values:r.values||{}}))}
          />
          <div className="mt-4 bg-slate-50 rounded-xl p-4 border border-slate-100">
            <h4 className="text-xs font-bold text-slate-600 mb-2">Totales All Times</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center text-xs">
              <div><span className="text-slate-400">Revenue Total</span><div className="font-extrabold text-blue-600 text-base">{sFm(stmtRev)}</div></div>
              <div><span className="text-slate-400">Total Expenses</span><div className="font-extrabold text-rose-500 text-base">{sFm(stmtRev-stmtNet)}</div></div>
              <div><span className="text-slate-400">Net Total</span><div className="font-extrabold text-emerald-600 text-base">{sFm(stmtNet)}</div></div>
              <div><span className="text-slate-400">Margen Promedio</span><div className="font-extrabold text-slate-800 text-base">{stmtRev?((stmtNet/stmtRev)*100).toFixed(1)+'%':'—'}</div></div>
            </div>
          </div>
        </>:<p className="text-sm text-slate-400 text-center py-8">Carga statements para generar el P&L.</p>}
      </div>}

      {/* PARTNERS REPORT */}
      {rptTab==='partners'&&<div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="border-b-2 border-purple-600 pb-3 mb-5"><h2 className="text-lg font-extrabold text-slate-800">Reporte de Socios — Capital & Balance</h2><p className="text-xs text-slate-400">{prop.name} · {partners.length} socio(s) · Generated: {new Date().toLocaleDateString('es')}</p></div>
        <div className="grid gap-4 mb-5" style={{gridTemplateColumns:`repeat(${Math.min(partners.length,3)},1fr)`}}>
          {partners.map(p=>{const t=pt[p.id]||{};const totalPut=(t.cont||0)+(t.exp||0);const shareOfRev=revenue*(p.ownership/100);const shareOfNet=(stmtNet||totNet)*(p.ownership/100);const roi=totalPut>0?((shareOfNet/totalPut)*100).toFixed(1):0;
            return<div key={p.id} className="rounded-2xl border-2 p-5" style={{borderColor:p.color+'30',borderLeftColor:p.color,borderLeftWidth:4}}>
              <div className="flex items-center gap-3 mb-4"><div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold" style={{background:p.color}}>{p.name.charAt(0)}</div><div><div className="font-bold text-slate-800">{p.name}</div><div className="text-xs text-slate-400">{p.ownership}% participación</div></div></div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-1.5 border-b border-slate-100"><span className="text-slate-500">Capital aportado</span><span className="font-bold text-emerald-600">{gFm(t.cont)}</span></div>
                <div className="flex justify-between py-1.5 border-b border-slate-100"><span className="text-slate-500">Expenses paid</span><span className="font-bold text-rose-500">{gFm(t.exp)}</span></div>
                <div className="flex justify-between py-1.5 border-b border-slate-100"><span className="text-slate-500">Total invertido</span><span className="font-extrabold text-slate-800">{gFm(totalPut)}</span></div>
                <div className="flex justify-between py-1.5 border-b border-slate-100"><span className="text-slate-500">Revenue ({p.ownership}%)</span><span className="font-bold text-blue-600">{gFm(shareOfRev)}</span></div>
                <div className="flex justify-between py-1.5 border-b border-slate-100"><span className="text-slate-500">Net ({p.ownership}%)</span><span className="font-bold text-emerald-600">{gFm(shareOfNet)}</span></div>
                <div className="flex justify-between py-2 bg-slate-50 rounded-lg px-3 mt-2"><span className="text-slate-600 font-semibold">ROI Personal</span><span className={`font-extrabold ${parseFloat(roi)>0?'text-emerald-600':'text-rose-500'}`}>{roi}%</span></div>
              </div>
            </div>})}
        </div>
        {contribs.length>0&&<><h3 className="text-sm font-bold text-slate-700 mb-3">Historial de Movimientos</h3>
          <Tbl cols={[{label:'Fecha',render:r=><span className="text-slate-500">{fmDate(r.date)}</span>},{label:'Socio',render:r=><span className="font-semibold" style={{color:pCl(r.paidBy)}}>{pN(r.paidBy)}</span>},{label:'Tipo',render:r=><span className="text-xs">{r.type==='contribution'?'📥 Aporte':'📤 Distribución'}</span>},{label:'Concepto',key:'concept',cls:'text-slate-600'},{label:'Monto',r:true,render:r=><span className="font-bold text-emerald-600">{gFm(r.amount)}</span>}]} rows={contribs}/>
        </>}
      </div>}

      {/* CASH FLOW REPORT */}
      {rptTab==='cashflow'&&<div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="border-b-2 border-emerald-600 pb-3 mb-5"><h2 className="text-lg font-extrabold text-slate-800">Estado de Cash Flow</h2><p className="text-xs text-slate-400">{prop.name} · Generated: {new Date().toLocaleDateString('es')}</p></div>
        <div className="space-y-3">
          <div className="flex justify-between py-3 px-4 bg-blue-50 rounded-xl border border-blue-100"><span className="font-bold text-blue-700">Revenue Total</span><span className="font-extrabold text-blue-700 text-lg">{gFm(revenue)}</span></div>
          <div className="pl-6 space-y-1">
            <div className="flex justify-between py-2 text-sm"><span className="text-rose-500">(-) PM Commission</span><span className="font-semibold text-rose-500">{sFm(stmtComm)}</span></div>
            <div className="flex justify-between py-2 text-sm"><span className="text-rose-500">(-) Electricity</span><span className="font-semibold text-rose-500">{sFm(stmtDuke)}</span></div>
            <div className="flex justify-between py-2 text-sm"><span className="text-rose-500">(-) HOA</span><span className="font-semibold text-rose-500">{sFm(stmtHoa)}</span></div>
            <div className="flex justify-between py-2 text-sm"><span className="text-rose-500">(-) Maintenance</span><span className="font-semibold text-rose-500">{sFm(stmtMaint)}</span></div>
            <div className="flex justify-between py-2 text-sm"><span className="text-rose-500">(-) Water</span><span className="font-semibold text-rose-500">{sFm(stmtWater)}</span></div>
            <div className="flex justify-between py-2 text-sm"><span className="text-rose-500">(-) Vendor/Other</span><span className="font-semibold text-rose-500">{sFm(stmtVendor)}</span></div>
            {totExp>0&&<div className="flex justify-between py-2 text-sm"><span className="text-rose-500">(-) Additional Expenses</span><span className="font-semibold text-rose-500">{gFm(totExp)}</span></div>}
          </div>
          <div className="flex justify-between py-3 px-4 bg-emerald-50 rounded-xl border border-emerald-100"><span className="font-bold text-emerald-700">= NOI (Net Operating Income)</span><span className="font-extrabold text-emerald-700 text-lg">{gFm(noi)}</span></div>
          {mort.balance>0&&<><div className="pl-6"><div className="flex justify-between py-2 text-sm"><span className="text-amber-600">(-) Debt Service (annual)</span><span className="font-semibold text-amber-600">{gFm(annualMortgage)}</span></div></div>
          <div className={`flex justify-between py-3 px-4 rounded-xl border ${cashFlow>=0?'bg-emerald-50 border-emerald-100':'bg-rose-50 border-rose-100'}`}><span className={`font-bold ${cashFlow>=0?'text-emerald-700':'text-rose-700'}`}>{`= ${t('cashFlow')}`}</span><span className={`font-extrabold text-lg ${cashFlow>=0?'text-emerald-700':'text-rose-700'}`}>{gFm(cashFlow)}</span></div></>}
          <div className="flex justify-between py-3 px-4 bg-purple-50 rounded-xl border border-purple-100 mt-2"><span className="font-bold text-purple-700">Retorno Cash-on-Cash</span><span className="font-extrabold text-purple-700 text-lg">{coc.toFixed(1)}%</span></div>
          <p className="text-[10px] text-slate-400 mt-2 text-center">Cash-on-Cash = Cash Flow Anual / Capital Total Invertido ({gFm(totCont)})</p>
        </div>
      </div>}

      {/* MORTGAGE REPORT */}
      {rptTab==='mortgage_rpt'&&<div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="border-b-2 border-amber-500 pb-3 mb-5"><h2 className="text-lg font-extrabold text-slate-800">Mortgage Summary</h2><p className="text-xs text-slate-400">{prop.name} · Generated: {new Date().toLocaleDateString('es')}</p></div>
        {mort.balance>0?<>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
            <div className="bg-slate-50 rounded-xl p-3 text-center border"><div className="text-[10px] text-slate-500 font-bold uppercase">Balance</div><div className="text-lg font-extrabold text-slate-800">{gFm(mort.balance)}</div></div>
            <div className="bg-slate-50 rounded-xl p-3 text-center border"><div className="text-[10px] text-slate-500 font-bold uppercase">Tasa</div><div className="text-lg font-extrabold text-slate-800">{mort.rate}%</div></div>
            <div className="bg-slate-50 rounded-xl p-3 text-center border"><div className="text-[10px] text-slate-500 font-bold uppercase">Plazo</div><div className="text-lg font-extrabold text-slate-800">{mort.termYears} años</div></div>
            <div className="bg-slate-50 rounded-xl p-3 text-center border"><div className="text-[10px] text-slate-500 font-bold uppercase">Pago Mensual</div><div className="text-lg font-extrabold text-slate-800">{gFm(mort.monthlyPayment)}</div></div>
            <div className="bg-slate-50 rounded-xl p-3 text-center border"><div className="text-[10px] text-slate-500 font-bold uppercase">{t('equity')}</div><div className="text-lg font-extrabold text-emerald-600">{gFm(equity)}</div></div>
          </div>
          {sNE.length>0&&<>
            <h3 className="text-sm font-bold text-slate-700 mb-3">Tabla de Amortización (Anual)</h3>
            <Tbl cols={[{label:'Año',render:r=><span className="font-bold">{r.yr}</span>},{label:'Mes',r:true,render:r=>r.mo},{label:'Balance',r:true,render:r=><span className="font-semibold text-slate-800">{gFm(r.bal)}</span>},{label:'Interés All Time',r:true,render:r=><span className="text-rose-500">{gFm(r.ti)}</span>}]} rows={sNE}/>
          </>}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-rose-50 rounded-xl p-4 text-center border border-rose-100"><div className="text-[10px] text-rose-600 font-bold uppercase">Total Intereses</div><div className="text-2xl font-extrabold text-rose-700">{sNE.length>0?gFm(sNE[sNE.length-1].ti):'—'}</div><div className="text-[10px] text-rose-500">sin pagos extra</div></div>
            <div className="bg-amber-50 rounded-xl p-4 text-center border border-amber-100"><div className="text-[10px] text-amber-600 font-bold uppercase">LTV</div><div className="text-2xl font-extrabold text-amber-700">{ltv.toFixed(0)}%</div><div className="text-[10px] text-amber-500">{ltv>80?'Alto riesgo':ltv>60?'Moderado':'Conservador'}</div></div>
            <div className="bg-blue-50 rounded-xl p-4 text-center border border-blue-100"><div className="text-[10px] text-blue-600 font-bold uppercase">DSCR</div><div className="text-2xl font-extrabold text-blue-700">{annualMortgage>0?(noi/annualMortgage).toFixed(2):'N/A'}</div><div className="text-[10px] text-blue-500">{noi/annualMortgage>1.25?'Saludable':'Ajustado'}</div></div>
          </div>
        </>:<p className="text-sm text-slate-400 text-center py-8">No mortgage configured. Go to Mortgage module to set it up.</p>}
      </div>}

      {/* EXPENSES REPORT */}
      {rptTab==='expenses_rpt'&&<div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="border-b-2 border-rose-500 pb-3 mb-5"><h2 className="text-lg font-extrabold text-slate-800">Expenses Report</h2><p className="text-xs text-slate-400">{prop.name} · {expenses.length} records · Generated: {new Date().toLocaleDateString('es')}</p></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <div className="bg-rose-50 rounded-xl p-3 text-center border border-rose-100"><div className="text-[10px] text-rose-600 font-bold uppercase">Total Expenses</div><div className="text-xl font-extrabold text-rose-700">{gFm(totalOpEx)}</div></div>
          <div className="bg-amber-50 rounded-xl p-3 text-center border border-amber-100"><div className="text-[10px] text-amber-600 font-bold uppercase">Fijos (Statements)</div><div className="text-xl font-extrabold text-amber-700">{sFm(stmtRev-stmtNet)}</div></div>
          <div className="bg-slate-50 rounded-xl p-3 text-center border"><div className="text-[10px] text-slate-500 font-bold uppercase">Adicionales</div><div className="text-xl font-extrabold text-slate-800">{gFm(totExp)}</div></div>
          <div className="bg-blue-50 rounded-xl p-3 text-center border border-blue-100"><div className="text-[10px] text-blue-600 font-bold uppercase">{t('expenseRatio')}</div><div className="text-xl font-extrabold text-blue-700">{expRatio.toFixed(1)}%</div></div>
        </div>
        {/* Breakdown from statements */}
        {stmtRev>0&&<><h3 className="text-sm font-bold text-slate-700 mb-3">Desglose — Costos Operativos (de Statements)</h3>
          <div className="grid grid-cols-3 gap-2 mb-5">
            {[[t('pmCommission')+'',stmtComm,'💼'],[t('electricity'),stmtDuke,'⚡'],['HOA',stmtHoa,'🏢'],['Maintenance',stmtMaint,'🔧'],['Water',stmtWater,'💧'],['Vendor',stmtVendor,'🛠️']].filter(([_,v])=>v>0).map(([l,v,ic])=><div key={l} className="flex items-center gap-3 bg-slate-50 rounded-xl p-3 border">
              <span className="text-lg">{ic}</span><div><div className="text-xs text-slate-500">{l}</div><div className="font-bold text-slate-800">{gFm(v)}</div><div className="text-[10px] text-slate-400">{pct(v,stmtRev)} del revenue</div></div>
            </div>)}
          </div>
        </>}
        {expByCat.length>0&&<><h3 className="text-sm font-bold text-slate-700 mb-3">Additional Expenses by Category</h3>
          <ResponsiveContainer width="100%" height={Math.max(150,expByCat.length*35)}><BarChart data={expByCat} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0"/><XAxis type="number" tickFormatter={v=>gFm(v)} tick={{fontSize:10,fill:'#94a3b8'}}/><YAxis type="category" dataKey="name" tick={{fontSize:10,fill:'#64748b'}} width={120}/><Tooltip content={<Tip fmt={gFm}/>}/><Bar dataKey="value" name="Monto" fill="#DC2626" radius={[0,6,6,0]}/></BarChart></ResponsiveContainer>
        </>}
      </div>}
    </>}

    </ViewGuard></div></div>

    {/* ═══ MODALS ═══ */}
    {modal==='expense'&&<Mdl title={editId?(lang==='es'?'✏️ Editar Gasto':'✏️ Edit Expense'):(lang==='es'?'Registrar Gasto':'Add Expense')} grad="from-rose-500 to-rose-600" onClose={()=>{setModal(null);setEditId(null)}} footer={<><button onClick={()=>{setModal(null);setEditId(null)}} className="flex-1 py-2.5 border-2 border-slate-200 rounded-xl font-semibold text-sm text-slate-500">Cancel</button><button onClick={()=>{
        const data={...expenseForm,amount:parseFloat(expenseForm.amount)};
        // Smart detection: if this category has a fixed expense already AND this is a new entry (not edit)
        // AND the new entry is also fixed/recurring → redirect to contribution
        if(!editId){
          const existingFixed=expenses.find(e=>e.category===data.category&&e.category!=='otros'&&e.category!==''&&(e.type==='fixed'||eFreq(e)==='monthly'||eFreq(e)==='annual'));
          if(existingFixed&&(data.type==='fixed'||data.frequency==='monthly'||data.frequency==='annual')){
            // Auto-convert to contribution
            setContribForm({date:data.date||new Date().toISOString().split('T')[0],concept:data.concept||existingFixed.concept,amount:String(data.amount||''),paidBy:data.paidBy||partners[0]?.id||'',purpose:'operations'});
            setModal('contribution');
            notify(lang==='es'?'Este costo fijo ya existe. Convertido a Aporte de Socio automáticamente.':'This fixed cost already exists. Auto-converted to Partner Payment.','info');
            return;
          }
        }
        if(editId){update('expenses',editId,data)}else{save('expenses',data)}
      }} disabled={!expenseForm.amount||!expenseForm.concept} className="flex-1 py-2.5 bg-rose-500 text-white rounded-xl font-bold text-sm disabled:opacity-30">{editId?(lang==='es'?'Actualizar':'Update'):(lang==='es'?'Guardar':'Save')}</button></>}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3"><Inp label={lang==='es'?'Fecha':'Date'} value={expenseForm.date} onChange={v=>ue('date',v)} type="date" required/><Sel label={lang==='es'?'Categoría':'Category'} value={expenseForm.category} onChange={v=>ue('category',v)} options={propCats.map(c=>({v:c.v,l:c.i+' '+c.l}))}/></div>
      {(()=>{const existing=expenses.find(e=>e.category===expenseForm.category&&e.category!=='otros'&&(e.type==='fixed'||eFreq(e)==='monthly'||eFreq(e)==='annual')&&!editId);return existing?<div className="text-[11px] text-amber-700 font-semibold bg-amber-50 border border-amber-200 px-3 py-2.5 rounded-xl">⚠️ {lang==='es'?<>Ya tienes un gasto fijo en esta categoría (<b>{existing.concept}</b>). Si un socio pagó esta obligación, usa <button onClick={()=>{setContribForm({date:new Date().toISOString().split('T')[0],concept:existing.concept,amount:'',paidBy:partners[0]?.id||'',purpose:'operations'});setModal('contribution')}} className="underline text-purple-600 font-bold">Aporte de Socio</button> en vez de crear otro gasto.</>:<>You already have a fixed expense in this category (<b>{existing.concept}</b>). If a partner paid this obligation, use <button onClick={()=>{setContribForm({date:new Date().toISOString().split('T')[0],concept:existing.concept,amount:'',paidBy:partners[0]?.id||'',purpose:'operations'});setModal('contribution')}} className="underline text-purple-600 font-bold">Partner Payment</button> instead of creating another expense.</>}</div>:null})()}
      <Inp label={lang==='es'?'Concepto':'Concept'} value={expenseForm.concept} onChange={v=>ue('concept',v)} placeholder={lang==='es'?'Descripción del gasto':'Expense description'} required error={expenseForm.concept===''&&expenseForm.amount?(lang==='es'?'Ingresa una descripción':'Enter a description'):''}/>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Moneda</label><div className="grid grid-cols-3 gap-1">{[['USD','🇺🇸 USD'],['COP','🇨🇴 COP'],['EUR','🇪🇺 EUR']].map(([v,l])=><button key={v} type="button" onClick={()=>ue('expCurrency',v)} className={`py-2 rounded-xl border-2 text-[10px] font-medium transition ${(expenseForm.expCurrency||propCurrency)===v?'border-blue-500 bg-blue-50 text-blue-700':'border-slate-200 text-slate-500'}`}>{l}</button>)}</div></div>
        <Inp label={`${lang==='es'?'Monto':'Amount'} (${expenseForm.expCurrency||propCurrency})`} value={expenseForm.amount} onChange={v=>ue('amount',v)} prefix={(expenseForm.expCurrency||propCurrency)==='EUR'?'€':(expenseForm.expCurrency||propCurrency)==='GBP'?'£':'$'} type="number" min="0" required error={expenseForm.amount&&parseFloat(expenseForm.amount)<=0?(lang==='es'?'El monto debe ser mayor a 0':'Amount must be > 0'):''}/>
      </div>
      {(expenseForm.expCurrency||propCurrency)!==propCurrency&&prop.exchangeRate>0&&expenseForm.amount&&<div className="text-[11px] text-blue-500 font-semibold bg-blue-50 px-3 py-2 rounded-xl">= {fmCurrency(parseFloat(expenseForm.amount)*((expenseForm.expCurrency||'USD')==='USD'?prop.exchangeRate:1/prop.exchangeRate),propCurrency)} {propCurrency}</div>}
      <div className="grid grid-cols-2 gap-3">
        <div><label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">{lang==='es'?'Frecuencia':'Frequency'}</label><div className="grid grid-cols-3 gap-1">{[['monthly','🔄 '+t('monthly')],['annual','📅 '+t('annual')],['once','🛒 '+t('purchase')]].map(([v,l])=><button key={v} type="button" onClick={()=>{ue('frequency',v);ue('type',v==='once'?'additional':'fixed')}} className={`py-2.5 rounded-xl border-2 text-[11px] font-medium transition ${(expenseForm.frequency||(expenseForm.type==='fixed'?'monthly':'once'))===v?'border-blue-500 bg-blue-50 text-blue-700':'border-slate-200 text-slate-500'}`}>{l}</button>)}</div><div className="text-[10px] text-slate-400 mt-1">{expenseForm.frequency==='monthly'||(!expenseForm.frequency&&expenseForm.type==='fixed')?t('freqMonthlyDesc'):expenseForm.frequency==='annual'?t('freqAnnualDesc'):t('freqPurchaseDesc')}</div></div>
      </div>
      {expenseForm.frequency==='annual'&&expenseForm.amount&&<div className="text-[11px] text-blue-500 font-semibold bg-blue-50 px-3 py-2 rounded-xl">= {gFm(parseFloat(expenseForm.amount)/12)}/{t('mo')} {lang==='es'?'equivalente':'equivalent'}</div>}
      {expenseForm.category==='mortgage_pay'&&mort.monthlyPayment>0&&<div className="text-[11px] text-amber-700 font-semibold bg-amber-50 border border-amber-200 px-3 py-2 rounded-xl">⚠️ {lang==='es'?`La hipoteca ya está configurada ($${mort.monthlyPayment}/${t('mo')}). Este gasto NO se sumará doble.`:`Mortgage already configured ($${mort.monthlyPayment}/${t('mo')}). This won't double-count.`}</div>}
      {(expenseForm.category==='taxes'||expenseForm.category==='predial')&&mort.includesTaxes&&<div className="text-[11px] text-amber-700 font-semibold bg-amber-50 border border-amber-200 px-3 py-2 rounded-xl">⚠️ {lang==='es'?'Tu pago de hipoteca ya incluye Property Taxes (escrow). Este gasto se excluirá del P&L automáticamente para no contar doble.':'Your mortgage payment already includes Property Taxes (escrow). This expense will be auto-excluded from P&L to avoid double-counting.'}</div>}
      {expenseForm.category==='insurance'&&mort.includesInsurance&&<div className="text-[11px] text-amber-700 font-semibold bg-amber-50 border border-amber-200 px-3 py-2 rounded-xl">⚠️ {lang==='es'?'Tu pago de hipoteca ya incluye Insurance (escrow). Este gasto se excluirá del P&L automáticamente para no contar doble.':'Your mortgage payment already includes Insurance (escrow). This expense will be auto-excluded from P&L to avoid double-counting.'}</div>}
      <div><label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">{lang==='es'?'¿Quién pagó?':'Who paid?'}</label><PPick partners={partners} selected={expenseForm.paidBy} onChange={v=>ue('paidBy',v)}/></div>
    </Mdl>}

    {modal==='contribution'&&<Mdl title={editId?(lang==='es'?'✏️ Editar Aporte':'✏️ Edit Contribution'):(lang==='es'?'Aporte de Capital':'Capital Contribution')} grad="from-purple-500 to-purple-600" onClose={()=>{setModal(null);setEditId(null)}} footer={<><button onClick={()=>{setModal(null);setEditId(null)}} className="flex-1 py-2.5 border-2 border-slate-200 rounded-xl font-semibold text-sm text-slate-500">{lang==='es'?'Cancelar':'Cancel'}</button><button onClick={()=>{const data={...contribForm,amount:parseFloat(contribForm.amount),type:'contribution',purpose:contribForm.purpose||'operations'};if(editId){update('contributions',editId,data)}else{save('contributions',data)}}} disabled={!contribForm.amount} className="flex-1 py-2.5 bg-purple-600 text-white rounded-xl font-bold text-sm disabled:opacity-30">{editId?(lang==='es'?'Actualizar':'Update'):(lang==='es'?'Guardar':'Save')}</button></>}>
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 mb-3 text-[11px] text-blue-700">💡 {lang==='es'?'Los aportes de capital NO son gastos. No afectan el P&L. Solo registran quién puso dinero para cubrir la operación.':'Capital contributions are NOT expenses. They don\'t affect the P&L. They only track who put money in to cover operations.'}</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3"><Inp label={lang==='es'?'Fecha':'Date'} value={contribForm.date} onChange={v=>uc('date',v)} type="date" required/><Inp label={lang==='es'?'Monto':'Amount'} value={contribForm.amount} onChange={v=>uc('amount',v)} prefix="$" type="number" required error={contribForm.amount&&parseFloat(contribForm.amount)<=0?(lang==='es'?'Monto debe ser mayor a 0':'Amount must be > 0'):''}/></div>
      <div><label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">{lang==='es'?'¿Para qué es este aporte?':'What is this contribution for?'}</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">{[
          ['operations',lang==='es'?'🏠 Operación mensual':'🏠 Monthly operations'],
          ['mortgage',lang==='es'?'🏦 Hipoteca':'🏦 Mortgage'],
          ['insurance',lang==='es'?'🛡️ Seguro':'🛡️ Insurance'],
          ['taxes',lang==='es'?'🏛️ Impuestos':'🏛️ Taxes'],
          ['repair',lang==='es'?'🔧 Reparación':'🔧 Repair'],
          ['other',lang==='es'?'📦 Otro':'📦 Other'],
        ].map(([v,l])=><button key={v} type="button" onClick={()=>uc('purpose',v)} className={`py-2 rounded-xl border-2 text-[10px] font-medium transition ${(contribForm.purpose||'operations')===v?'border-purple-500 bg-purple-50 text-purple-700':'border-slate-200 text-slate-500'}`}>{l}</button>)}</div>
      </div>
      <Inp label={lang==='es'?'Nota (opcional)':'Note (optional)'} value={contribForm.concept} onChange={v=>uc('concept',v)} placeholder={lang==='es'?'Ej: Transferencia para cubrir déficit de marzo':'e.g. Transfer to cover March deficit'}/>
      <div><label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">{lang==='es'?'Socio':'Partner'}</label><PPick partners={partners} selected={contribForm.paidBy} onChange={v=>uc('paidBy',v)}/></div>
    </Mdl>}

    {/* Direct Booking / Additional Income Modal */}
    {modal==='addIncome'&&<Mdl title={editId?(lang==='es'?'✏️ Editar Ingreso':'✏️ Edit Income'):(lang==='es'?'💰 Registrar Ingreso Directo':'💰 Register Direct Income')} grad="from-emerald-500 to-emerald-600" onClose={()=>{setModal(null);setEditId(null)}} footer={<><button onClick={()=>{setModal(null);setEditId(null)}} className="flex-1 py-2.5 border-2 border-slate-200 rounded-xl font-semibold text-sm text-slate-500">{lang==='es'?'Cancelar':'Cancel'}</button><button onClick={()=>{const data={date:incForm.date,amount:parseFloat(incForm.amount)||0,source:incForm.source,concept:incForm.concept,currency:incForm.currency,nights:parseInt(incForm.nights)||0};if(editId){update('income',editId,data)}else{save('income',data)}}} disabled={!incForm.amount||!incForm.date} className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-sm disabled:opacity-30">{editId?(lang==='es'?'Actualizar':'Update'):(lang==='es'?'Guardar':'Save')}</button></>}>
      <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 mb-3 text-[11px] text-emerald-700">💡 {lang==='es'?'Los ingresos directos se suman automáticamente al Revenue Bruto del dashboard en el mes correspondiente.':'Direct income auto-adds to Gross Revenue in the dashboard for the corresponding month.'}</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Inp label={lang==='es'?'Fecha del ingreso':'Income date'} value={incForm.date} onChange={v=>uif('date',v)} type="date" required/>
        <Inp label={lang==='es'?'Monto':'Amount'} value={incForm.amount} onChange={v=>uif('amount',v)} prefix="$" type="number" required/>
      </div>
      <div><label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">{lang==='es'?'Fuente':'Source'}</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">{[
          ['direct',lang==='es'?'🏠 Directa':'🏠 Direct'],
          ['booking','🅱️ Booking.com'],
          ['vrbo','🏡 VRBO'],
          ['other',lang==='es'?'📦 Otro':'📦 Other'],
        ].map(([v,l])=><button key={v} type="button" onClick={()=>uif('source',v)} className={`py-2 rounded-xl border-2 text-[10px] font-medium transition ${incForm.source===v?'border-emerald-500 bg-emerald-50 text-emerald-700':'border-slate-200 text-slate-500'}`}>{l}</button>)}</div>
      </div>
      <Inp label={lang==='es'?'Concepto':'Concept'} value={incForm.concept} onChange={v=>uif('concept',v)} placeholder={lang==='es'?'Ej: Reserva directa familia García':'e.g. Direct booking García family'}/>
      <Inp label={lang==='es'?'Noches':'Nights'} value={incForm.nights} onChange={v=>uif('nights',v)} type="number" placeholder={lang==='es'?'Ej: 5':'e.g. 5'}/>
      <div><label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">{lang==='es'?'Moneda':'Currency'}</label>
        <div className="grid grid-cols-3 gap-1">{[['USD','🇺🇸 USD'],['COP','🇨🇴 COP'],['EUR','🇪🇺 EUR']].map(([v,l])=><button key={v} type="button" onClick={()=>uif('currency',v)} className={`py-2 rounded-xl border-2 text-[10px] font-medium transition ${(incForm.currency||'USD')===v?'border-emerald-500 bg-emerald-50 text-emerald-700':'border-slate-200 text-slate-500'}`}>{l}</button>)}</div>
      </div>
    </Mdl>}

    {modal==='addStmt'&&<Mdl title={editId?'✏️ Editar Statement':'Statement Manual'} grad="from-slate-700 to-slate-800" onClose={()=>{setModal(null);setEditId(null)}} footer={<><button onClick={()=>{setModal(null);setEditId(null)}} className="flex-1 py-2.5 border-2 border-slate-200 rounded-xl font-semibold text-sm text-slate-500">Cancel</button><button onClick={()=>{const yr=parseInt(stmtForm.year),mo=parseInt(stmtForm.month);const data={year:yr,month:mo,revenue:parseFloat(stmtForm.revenue)||0,net:parseFloat(stmtForm.net)||0,commission:parseFloat(stmtForm.commission)||0,duke:parseFloat(stmtForm.duke)||0,water:parseFloat(stmtForm.water)||0,hoa:parseFloat(stmtForm.hoa)||0,maintenance:parseFloat(stmtForm.maintenance)||0,vendor:parseFloat(stmtForm.vendor)||0,nights:parseInt(stmtForm.nights)||0,reservations:parseInt(stmtForm.reservations)||0};if(editId){update('statements',editId,data)}else{if(stmts.find(s=>s.year===yr&&s.month===mo)){notify(`Ya existe statement para ${M[mo-1]} ${yr}`,"error");return;}save('statements',data);setStmtForm(x=>({...x,month:x.month<12?x.month+1:1,revenue:'',net:'',commission:'',duke:'',water:'',hoa:'',maintenance:'',vendor:'',nights:'',reservations:''}))}}} disabled={!stmtForm.revenue} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm disabled:opacity-30">{editId?(lang==='es'?'Actualizar':'Update'):(lang==='es'?'Guardar':'Save')}</button></>}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3"><Inp label="Año" value={stmtForm.year} onChange={v=>us('year',v)} type="number" disabled={!!editId}/><Sel label="Mes" value={stmtForm.month} onChange={v=>us('month',v)} options={M.map((m,i)=>({v:i+1,l:m}))}/></div>
      <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100"><div className="text-[10px] font-black text-emerald-700 uppercase mb-3">Revenue</div><Inp label="Revenue Total" value={stmtForm.revenue} onChange={v=>us('revenue',v)} prefix="$" type="number" required error={stmtForm.revenue&&parseFloat(stmtForm.revenue)<=0?'Enter revenue for the period':''}/></div>
      <div className="bg-rose-50 rounded-2xl p-4 border border-rose-100"><div className="text-[10px] font-black text-rose-700 uppercase mb-3">Expenses</div><div className="grid grid-cols-1 md:grid-cols-2 gap-3"><Inp label="PM Commission" value={stmtForm.commission} onChange={v=>us('commission',v)} prefix="$" type="number"/><Inp label="Electricity" value={stmtForm.duke} onChange={v=>us('duke',v)} prefix="$" type="number"/><Inp label="Water" value={stmtForm.water} onChange={v=>us('water',v)} prefix="$" type="number"/><Inp label="HOA" value={stmtForm.hoa} onChange={v=>us('hoa',v)} prefix="$" type="number"/><Inp label="Maintenance" value={stmtForm.maintenance} onChange={v=>us('maintenance',v)} prefix="$" type="number"/><Inp label="Vendor/Other" value={stmtForm.vendor} onChange={v=>us('vendor',v)} prefix="$" type="number"/></div></div>
      <Inp label="Net al Owner" value={stmtForm.net} onChange={v=>us('net',v)} prefix="$" type="number"/>
      <div className="bg-cyan-50 rounded-2xl p-4 border border-cyan-100"><div className="text-[10px] font-black text-cyan-700 uppercase mb-3">{lang==='es'?'Ocupación':'Occupancy'}</div><div className="grid grid-cols-2 gap-3"><Inp label={lang==='es'?'Noches ocupadas':'Nights booked'} value={stmtForm.nights} onChange={v=>us('nights',v)} type="number" placeholder="Ej: 22"/><Inp label={lang==='es'?'Reservaciones':'Reservations'} value={stmtForm.reservations} onChange={v=>us('reservations',v)} type="number" placeholder="Ej: 5"/></div></div>
    </Mdl>}

    {/* Mortgage statement parsed results */}
    {modal==='mortgageParsed'&&(()=>{const r=window.__mortParsed||{};return<Mdl title={lang==='es'?'📋 Datos extraídos del PDF':'📋 Data extracted from PDF'} grad="from-blue-600 to-cyan-600" onClose={()=>setModal(null)} footer={<><button onClick={()=>setModal(null)} className="flex-1 py-2.5 border-2 border-slate-200 rounded-xl font-semibold text-sm text-slate-500">{lang==='es'?'Cancelar':'Cancel'}</button><button onClick={()=>{setModal('editMort')}} className="flex-1 py-2.5 border-2 border-blue-200 text-blue-600 rounded-xl font-bold text-sm">{lang==='es'?'✏️ Editar':'✏️ Edit'}</button><button onClick={async()=>{await saveMortgage();setModal(null);notify(lang==='es'?'✅ Hipoteca guardada':'✅ Mortgage saved','success')}} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm">{lang==='es'?'✓ Guardar':'✓ Save'}</button></>}>
      {r.servicer&&<div className="text-[11px] text-blue-600 font-semibold bg-blue-50 px-3 py-2 rounded-xl mb-3">🏦 {r.servicer}</div>}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="divide-y divide-slate-100">
          <div className="flex justify-between px-4 py-3"><span className="text-[12px] text-slate-500">{lang==='es'?'Balance':'Loan Balance'}</span><span className="text-[13px] font-bold text-slate-800">${(parseFloat(mortConfig.bal)||0).toLocaleString()}</span></div>
          <div className="flex justify-between px-4 py-3"><span className="text-[12px] text-slate-500">{lang==='es'?'Tasa':'Rate'}</span><span className="text-[13px] font-bold text-slate-800">{mortConfig.rate}%</span></div>
          <div className="flex justify-between px-4 py-3 bg-slate-800"><span className="text-[12px] font-bold text-white">{lang==='es'?'Pago Mensual':'Monthly Payment'}</span><span className="text-[14px] font-black text-white">${(parseFloat(mortConfig.pay)||0).toLocaleString()}</span></div>
        </div>
      </div>
      {(r.principal>0||r.taxAndInsuranceCombined>0||r.taxEscrow>0)&&<div className="bg-slate-50 rounded-xl border p-3 mt-3">
        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">{lang==='es'?'Desglose':'Breakdown'}</div>
        <div className="space-y-1.5">
          {r.principal>0&&<div className="flex justify-between"><span className="text-[11px] text-slate-500">Principal</span><span className="text-[11px] font-semibold">${r.principal.toLocaleString()}</span></div>}
          {r.interest>0&&<div className="flex justify-between"><span className="text-[11px] text-slate-500">{lang==='es'?'Interés':'Interest'}</span><span className="text-[11px] font-semibold">${r.interest.toLocaleString()}</span></div>}
          {r.taxAndInsuranceCombined>0&&<div className="flex justify-between bg-blue-50 -mx-3 px-3 py-1.5 rounded"><span className="text-[11px] text-blue-700">🏛️🛡️ Tax + Insurance</span><span className="text-[11px] font-bold text-blue-800">${r.taxAndInsuranceCombined.toLocaleString()}</span></div>}
          {!r.taxAndInsuranceCombined&&r.taxEscrow>0&&<div className="flex justify-between"><span className="text-[11px] text-blue-600">🏛️ Tax</span><span className="text-[11px] font-semibold">${r.taxEscrow.toLocaleString()}</span></div>}
          {!r.taxAndInsuranceCombined&&r.insuranceEscrow>0&&<div className="flex justify-between"><span className="text-[11px] text-cyan-600">🛡️ Insurance</span><span className="text-[11px] font-semibold">${r.insuranceEscrow.toLocaleString()}</span></div>}
        </div>
      </div>}
      {(r.includesTaxes||r.includesInsurance)&&<div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 mt-3 text-[11px] text-emerald-700">✅ {lang==='es'?'Tu pago incluye Tax e Insurance. Se excluirán de Operating Expenses automáticamente.':'Your payment includes Tax and Insurance. They will be auto-excluded from Operating Expenses.'}</div>}
      {(!r.includesTaxes&&!r.includesInsurance)&&<div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mt-3 text-[11px] text-amber-700">💡 {lang==='es'?'No se detectó Tax ni Insurance. Si tu pago los incluye, usa "Editar" para configurarlo.':'Tax/Insurance not detected. If included, use "Edit" to configure.'}</div>}
    </Mdl>})()}

    {modal==='editMort'&&<Mdl title="Edit Mortgage" grad="from-blue-600 to-blue-700" onClose={()=>setModal(null)} footer={<><button onClick={()=>setModal(null)} className="flex-1 py-2.5 border-2 border-slate-200 rounded-xl font-semibold text-sm text-slate-500">Cancel</button><button onClick={async()=>{await saveMortgage();setModal(null)}} disabled={!(parseFloat(mortConfig.bal)>0)||!(parseFloat(mortConfig.rate)>0)||!(parseFloat(mortConfig.pay)>0)||savingMort} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm disabled:opacity-30 flex items-center justify-center gap-2">{savingMort&&<Loader2 size={14} className="animate-spin"/>}Save</button></>}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3"><Inp label="Balance" value={mortConfig.bal} onChange={v=>umc('bal',v)} prefix="$" type="number"/><Inp label={lang==='es'?'Tasa (%)':'Rate (%)'} value={mortConfig.rate} onChange={v=>umc('rate',v)} type="number"/></div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3"><Inp label={lang==='es'?'Plazo (años)':'Term (years)'} value={mortConfig.term} onChange={v=>umc('term',v)} type="number"/><Inp label={lang==='es'?'Pago Mensual Total':'Total Monthly Payment'} value={mortConfig.pay} onChange={v=>umc('pay',v)} prefix="$" type="number"/><Inp label={lang==='es'?'Inicio':'Start'} value={mortConfig.start} onChange={v=>umc('start',v)} type="date"/></div>
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mt-1">
        <div className="text-[11px] font-bold text-blue-700 mb-2">{lang==='es'?'¿Qué incluye tu pago mensual? (Escrow)':'What does your monthly payment include? (Escrow)'}</div>
        <div className="text-[10px] text-blue-600 mb-2">{lang==='es'?'En USA muchas hipotecas incluyen taxes y/o seguro en el mismo pago. Marca lo que aplique para evitar contar doble.':'In the US many mortgages include taxes and/or insurance in the same payment. Check what applies to avoid double-counting.'}</div>
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={!!mortConfig.includesTaxes} onChange={e=>umc('includesTaxes',e.target.checked)} className="w-4 h-4 rounded border-blue-300 text-blue-600"/><span className="text-[11px] text-slate-700">{lang==='es'?'🏛️ Incluye Property Taxes':'🏛️ Includes Property Taxes'}</span></label>
          <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={!!mortConfig.includesInsurance} onChange={e=>umc('includesInsurance',e.target.checked)} className="w-4 h-4 rounded border-blue-300 text-blue-600"/><span className="text-[11px] text-slate-700">{lang==='es'?'🛡️ Incluye Homeowner\'s Insurance':'🛡️ Includes Homeowner\'s Insurance'}</span></label>
        </div>
      </div>
    </Mdl>}

    {modal==='repair'&&<Mdl title={editId?'✏️ Editar Ticket':'🔧 Nuevo Ticket de Reparación'} grad="from-amber-500 to-amber-600" onClose={()=>{setModal(null);setEditId(null)}} footer={<><button onClick={()=>{setModal(null);setEditId(null)}} className="flex-1 py-2.5 border-2 border-slate-200 rounded-xl font-semibold text-sm text-slate-500">Cancel</button><button onClick={()=>{const data={...repairForm,amount:parseFloat(repairForm.amount)||0};if(editId){update('repairs',editId,data)}else{save('repairs',data)}}} disabled={!repairForm.title} className="flex-1 py-2.5 bg-amber-600 text-white rounded-xl font-bold text-sm disabled:opacity-30">{editId?(lang==='es'?'Actualizar':'Update'):(lang==='es'?'Guardar':'Save')}</button></>}>
      <Inp label="Título" value={repairForm.title} onChange={v=>ur('title',v)} placeholder="Ej: Reparación de AC, Pintura exterior" required/>
      <div className="grid grid-cols-2 gap-3">
        <Inp label={lang==='es'?'Fecha':'Date'} value={repairForm.date} onChange={v=>ur('date',v)} type="date" required/>
        <Inp label="Monto (USD)" value={repairForm.amount} onChange={v=>ur('amount',v)} prefix="$" type="number" min="0"/>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Sel label="Tipo" value={repairForm.category} onChange={v=>ur('category',v)} options={[{v:'repair',l:'🔧 Reparación urgente'},{v:'preventive',l:'🛡️ Maintenance preventivo'},{v:'capex',l:'📈 Mejora / CapEx'}]}/>
        <Sel label="Estado" value={repairForm.status} onChange={v=>ur('status',v)} options={[{v:'pending',l:'⚠ Pendiente'},{v:'progress',l:'⏳ En Progreso'},{v:'done',l:'✓ Completado'}]}/>
      </div>
      <Inp label="Vendor / Proveedor" value={repairForm.vendor} onChange={v=>ur('vendor',v)} placeholder="Ej: ABC Plumbing, Home Depot"/>
      <Inp label="Descripción (opcional)" value={repairForm.description} onChange={v=>ur('description',v)} placeholder="Detalles adicionales..."/>
      {partners.length>0&&<div><label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">¿Quién pagó?</label><PPick partners={partners} selected={repairForm.paidBy} onChange={v=>ur('paidBy',v)}/></div>}
    </Mdl>}

    {modal==='task'&&<Mdl title={editId?'✏️ Editar Obligation':'📋 Nueva Obligation'} grad="from-indigo-500 to-indigo-600" onClose={()=>{setModal(null);setEditId(null)}} footer={<><button onClick={()=>{setModal(null);setEditId(null)}} className="flex-1 py-2.5 border-2 border-slate-200 rounded-xl font-semibold text-sm text-slate-500">Cancel</button><button onClick={()=>{const data={...taskForm,amount:taskForm.amount||''};if(editId){update('tasks',editId,data)}else{save('tasks',data)}}} disabled={!taskForm.title} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm disabled:opacity-30">{editId?(lang==='es'?'Actualizar':'Update'):(lang==='es'?'Guardar':'Save')}</button></>}>
      <Inp label="Obligation" value={taskForm.title} onChange={v=>ut('title',v)} placeholder="e.g. Mortgage, Insurance, Taxes" required/>
      <div><label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">¿Quién paga?</label><div className="grid grid-cols-2 gap-2">{[['owner','👤 Propietario'],['pm','🏢 Property Manager']].map(([v,l])=><button key={v} type="button" onClick={()=>ut('payer',v)} className={`py-2.5 rounded-xl border-2 text-xs font-medium transition ${taskForm.payer===v?'border-blue-500 bg-blue-50 text-blue-700':'border-slate-200 text-slate-500'}`}>{l}</button>)}</div></div>
      <div className="grid grid-cols-2 gap-3">
        <Inp label="Monto (USD)" value={taskForm.amount} onChange={v=>ut('amount',v)} prefix="$" type="number" placeholder="1,850"/>
        <div><label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">{lang==='es'?'Frecuencia':'Frequency'}</label><div className="grid grid-cols-2 gap-2">{[['monthly','Mensual'],['annual','Anual']].map(([v,l])=><button key={v} type="button" onClick={()=>ut('frequency',v)} className={`py-2.5 rounded-xl border-2 text-xs font-medium transition ${taskForm.frequency===v?'border-blue-500 bg-blue-50 text-blue-700':'border-slate-200 text-slate-500'}`}>{l}</button>)}</div></div>
      </div>
      {taskForm.payer==='owner'&&<div className="grid grid-cols-2 gap-3">
        <Inp label="Próximo pago" value={taskForm.dueDate} onChange={v=>ut('dueDate',v)} type="date"/>
        <Sel label="Recordar antes de" value={taskForm.reminderDays} onChange={v=>ut('reminderDays',v)} options={[{v:'3',l:'3 días antes'},{v:'7',l:'1 semana antes'},{v:'15',l:'15 días antes'},{v:'30',l:'1 mes antes'},{v:'60',l:'2 months antes'}]}/>
      </div>}
      <Inp label="Notas (opcional)" value={taskForm.notes} onChange={v=>ut('notes',v)} placeholder="Ej: Póliza #12345, County Tax"/>
    </Mdl>}

    {modal==='valuation'&&<Mdl title={editId?'✏️ Editar Appreciation':'📈 Registrar Market Value'} grad="from-emerald-600 to-teal-600" onClose={()=>{setModal(null);setEditId(null)}} footer={<><button onClick={()=>{setModal(null);setEditId(null)}} className="flex-1 py-2.5 border-2 border-slate-200 rounded-xl font-semibold text-sm text-slate-500">Cancel</button><button onClick={()=>{const data={date:valForm.date,value:parseFloat(valForm.value)||0,source:valForm.source,notes:valForm.notes};if(editId){update('valuations',editId,data)}else{save('valuations',data)}}} disabled={!valForm.value} className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-sm disabled:opacity-30">{editId?(lang==='es'?'Actualizar':'Update'):(lang==='es'?'Guardar':'Save')}</button></>}>
      <Inp label="Fecha de Estimación" value={valForm.date} onChange={v=>uv('date',v)} type="date"/>
      <Inp label="Valor Estimado de Mercado" value={valForm.value} onChange={v=>uv('value',v)} prefix="$" type="number" placeholder="490,000"/>
      <Sel label="Fuente" value={valForm.source} onChange={v=>uv('source',v)} options={[{v:'manual',l:'Estimación propia'},{v:'zillow',l:'Zillow Zestimate'},{v:'redfin',l:'Redfin Estimate'},{v:'appraisal',l:'Avalúo profesional'},{v:'broker',l:'CMA de broker'},{v:'comps',l:'Comparables de mercado'}]}/>
      <Inp label="Notas (opcional)" value={valForm.notes} onChange={v=>uv('notes',v)} placeholder="Ej: Basado en venta de vecino por $500K"/>
      {valForm.value&&prop.purchasePrice>0&&<div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2 text-sm">
        <div className="flex justify-between"><span className="text-slate-500">{t('purchasePrice')}</span><span className="font-semibold">{gFm(prop.purchasePrice)}</span></div>
        <div className="flex justify-between"><span className="text-slate-500">Valor Estimado</span><span className="font-bold text-emerald-600">{gFm(parseFloat(valForm.value))}</span></div>
        <div className="flex justify-between border-t border-slate-200 pt-2"><span className="text-slate-600 font-semibold">Apreciación</span><span className={`font-extrabold ${parseFloat(valForm.value)>=prop.purchasePrice?'text-emerald-600':'text-rose-500'}`}>{((parseFloat(valForm.value)-prop.purchasePrice)/prop.purchasePrice*100).toFixed(1)}% ({gFm(parseFloat(valForm.value)-prop.purchasePrice)})</span></div>
      </div>}
    </Mdl>}

    {/* Smart routing: What are you recording? */}
    {modal==='recordWhat'&&<Mdl title={lang==='es'?'¿Qué deseas registrar?':'What do you want to record?'} grad="from-slate-700 to-slate-800" onClose={()=>setModal(null)}>
      <div className="grid grid-cols-1 gap-3">
        <button onClick={()=>{setExpenseForm({date:'',concept:'',amount:'',paidBy:partners[0]?.id||'',category:'otros',type:'additional',frequency:'once',expCurrency:''});setModal('expense')}} className="text-left p-4 rounded-2xl border-2 border-slate-200 hover:border-rose-400 hover:bg-rose-50 transition group">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600 text-lg group-hover:bg-rose-200 transition">🧾</div>
            <div>
              <div className="font-bold text-slate-800 text-sm">{lang==='es'?'Nuevo Gasto':'New Expense'}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">{lang==='es'?'Un costo nuevo de la propiedad (reparación, compra, servicio adicional)':'A new property cost (repair, purchase, additional service)'}</div>
            </div>
          </div>
          <div className="text-[10px] text-rose-500 mt-2 ml-13 pl-[52px]">{lang==='es'?'→ Afecta el P&L':'→ Affects P&L'}</div>
        </button>
        <button onClick={()=>{setContribForm({date:new Date().toISOString().split('T')[0],concept:'',amount:'',paidBy:partners[0]?.id||'',purpose:'operations'});setModal('contribution')}} className="text-left p-4 rounded-2xl border-2 border-slate-200 hover:border-purple-400 hover:bg-purple-50 transition group">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600 text-lg group-hover:bg-purple-200 transition">💰</div>
            <div>
              <div className="font-bold text-slate-800 text-sm">{lang==='es'?'Aporte de Socio':'Partner Payment'}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">{lang==='es'?'Un socio transfirió dinero para cubrir costos existentes (hipoteca, seguro, operación mensual)':'A partner transferred money to cover existing costs (mortgage, insurance, monthly operations)'}</div>
            </div>
          </div>
          <div className="text-[10px] text-purple-500 mt-2 ml-13 pl-[52px]">{lang==='es'?'→ NO afecta el P&L — solo registra quién pagó':'→ Does NOT affect P&L — only tracks who paid'}</div>
        </button>
        <button onClick={()=>{setIncForm({date:new Date().toISOString().split('T')[0],amount:'',source:'direct',concept:'',currency:'USD',nights:''});setModal('addIncome')}} className="text-left p-4 rounded-2xl border-2 border-slate-200 hover:border-emerald-400 hover:bg-emerald-50 transition group">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 text-lg group-hover:bg-emerald-200 transition">🏠</div>
            <div>
              <div className="font-bold text-slate-800 text-sm">{lang==='es'?'Reserva Directa / Ingreso Extra':'Direct Booking / Extra Income'}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">{lang==='es'?'Ingreso que no aparece en los statements del PM (reserva directa, Booking.com, VRBO)':'Income not in PM statements (direct booking, Booking.com, VRBO)'}</div>
            </div>
          </div>
          <div className="text-[10px] text-emerald-500 mt-2 ml-13 pl-[52px]">{lang==='es'?'→ Se suma al Revenue Bruto del mes':'→ Adds to Gross Revenue for the month'}</div>
        </button>
      </div>
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mt-3 text-[11px] text-amber-700">
        💡 {lang==='es'
          ?'Si el gasto ya existe (seguro, hipoteca, servicios mensuales), usa "Aporte de Socio". Registrar el mismo costo como Gasto Y como Aporte lo contaría doble.'
          :'If the cost already exists (insurance, mortgage, monthly utilities), use "Partner Payment." Recording the same cost as an Expense AND a Payment would double-count it.'}
      </div>
    </Mdl>}

    {modal==='upload'&&<Mdl title="📤 Subir Statements (PDF)" grad="from-blue-600 to-cyan-600" onClose={()=>setModal(null)}>
      <p className="text-sm text-slate-500 mb-3">Sube los PDFs de los owner statements de tu property manager.</p>
      <div className="flex flex-wrap gap-1.5 mb-3">{['IHM','Vacasa','Evolve','Guesty','Host U','Airbnb','Vrbo'].map(pm=><span key={pm} className="text-[10px] font-semibold bg-blue-50 text-blue-600 px-2 py-1 rounded-lg">{pm}</span>)}<span className="text-[10px] font-semibold bg-slate-100 text-slate-500 px-2 py-1 rounded-lg">+ otros</span></div>
      <label className="block border-2 border-dashed border-blue-300 rounded-2xl p-8 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all">
        <Upload size={32} className="text-blue-400 mx-auto mb-2"/>
        <div className="text-sm font-semibold text-blue-600">Haz clic aquí para seleccionar PDFs</div>
        <div className="text-xs text-slate-400 mt-1">Soporta múltiples archivos</div><div className="text-[8px] text-slate-300 mt-1">v2.5</div>
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

    {/* ═══ REVIEW PARSED STATEMENTS ═══ */}
    {modal==='reviewParsed'&&parsedPreview&&(()=>{
      const rows=parsedPreview.results;
      const included=rows.filter(r=>r._include);
      const totRev=included.reduce((s,r)=>s+(r.revenue||0),0);
      const totNet=included.reduce((s,r)=>s+(r.net||0),0);
      const totNights=included.reduce((s,r)=>s+(r.nights||0),0);
      const updateRow=(idx,field,val)=>{const next=[...rows];next[idx]={...next[idx],[field]:val};setParsedPreview({...parsedPreview,results:next})};
      const toggleRow=(idx)=>{const next=[...rows];next[idx]={...next[idx],_include:!next[idx]._include};setParsedPreview({...parsedPreview,results:next})};
      const fmt=rows[0]?._format||'Unknown';
      return <Mdl wide title={`📋 ${lang==='es'?'Revisar y Aprobar':'Review & Approve'}`} grad="from-emerald-500 to-blue-500" onClose={()=>{setParsedPreview(null);setModal(null)}} footer={<><button onClick={()=>{setParsedPreview(null);setModal('upload')}} className="flex-1 py-2.5 border-2 border-slate-200 rounded-xl font-semibold text-sm text-slate-500">{lang==='es'?'Volver':'Back'}</button><button onClick={saveParsedResults} disabled={included.length===0} className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-sm disabled:opacity-30">{lang==='es'?`Guardar ${included.length} statements`:`Save ${included.length} statements`}</button></>}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2"><span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-1 rounded-lg">{fmt}</span><span className="text-[10px] text-slate-400">{rows.length} {lang==='es'?'meses detectados':'months detected'}</span></div>
          <button onClick={()=>{const allOn=rows.every(r=>r._include||r._dup);const next=rows.map(r=>({...r,_include:r._dup?false:!allOn}));setParsedPreview({...parsedPreview,results:next})}} className="text-[10px] text-blue-500 font-bold">{rows.every(r=>r._include||r._dup)?(lang==='es'?'Deseleccionar todo':'Deselect all'):(lang==='es'?'Seleccionar todo':'Select all')}</button>
        </div>
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-2.5 mb-3 text-[11px] text-emerald-700">💡 {lang==='es'?'Revisa los datos. Puedes editar cualquier campo haciendo clic. Desmarca los meses que no quieras guardar.':'Review the data. Click any field to edit. Uncheck months you don\'t want to save.'}</div>
        <div className="overflow-x-auto -mx-2 max-h-[350px] overflow-y-auto">
          <table className="w-full text-[11px]">
            <thead><tr className="bg-slate-100 sticky top-0 z-10">
              <th className="px-1 py-2 w-6"></th>
              <th className="px-2 py-2 text-left font-bold text-slate-500">{lang==='es'?'Mes':'Month'}</th>
              <th className="px-2 py-2 text-right font-bold text-slate-500">Revenue</th>
              <th className="px-2 py-2 text-right font-bold text-slate-500">{lang==='es'?'Comisión':'Commission'}</th>
              <th className="px-2 py-2 text-right font-bold text-slate-500 hidden sm:table-cell">Duke</th>
              <th className="px-2 py-2 text-right font-bold text-slate-500 hidden sm:table-cell">Water</th>
              <th className="px-2 py-2 text-right font-bold text-slate-500">Net</th>
              <th className="px-2 py-2 text-right font-bold text-slate-500">{lang==='es'?'Noches':'Nights'}</th>
            </tr></thead>
            <tbody>{rows.map((r,i)=><tr key={i} className={`border-b border-slate-50 ${r._dup?'opacity-40':r._include?'':'opacity-50 bg-slate-50'}`}>
              <td className="px-1 py-1.5 text-center"><input type="checkbox" checked={r._include} onChange={()=>toggleRow(i)} disabled={r._dup} className="w-3.5 h-3.5 accent-emerald-500"/></td>
              <td className="px-2 py-1.5"><span className="font-bold text-slate-700">{M[r.month-1]} {r.year}</span>{r._dup&&<span className="ml-1 text-[9px] bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full font-bold">{lang==='es'?'YA EXISTE':'EXISTS'}</span>}</td>
              <td className="px-1 py-1"><input type="number" value={r.revenue||''} onChange={e=>updateRow(i,'revenue',parseFloat(e.target.value)||0)} className="w-20 text-right text-[11px] font-semibold text-blue-600 bg-transparent border border-transparent hover:border-blue-200 focus:border-blue-400 rounded px-1 py-0.5 outline-none"/></td>
              <td className="px-1 py-1"><input type="number" value={r.commission||''} onChange={e=>updateRow(i,'commission',parseFloat(e.target.value)||0)} className="w-16 text-right text-[11px] text-rose-500 bg-transparent border border-transparent hover:border-rose-200 focus:border-rose-400 rounded px-1 py-0.5 outline-none"/></td>
              <td className="px-1 py-1 hidden sm:table-cell"><input type="number" value={r.duke||''} onChange={e=>updateRow(i,'duke',parseFloat(e.target.value)||0)} className="w-14 text-right text-[11px] text-slate-500 bg-transparent border border-transparent hover:border-slate-200 focus:border-slate-400 rounded px-1 py-0.5 outline-none"/></td>
              <td className="px-1 py-1 hidden sm:table-cell"><input type="number" value={r.water||''} onChange={e=>updateRow(i,'water',parseFloat(e.target.value)||0)} className="w-14 text-right text-[11px] text-slate-500 bg-transparent border border-transparent hover:border-slate-200 focus:border-slate-400 rounded px-1 py-0.5 outline-none"/></td>
              <td className="px-1 py-1"><input type="number" value={r.net||''} onChange={e=>updateRow(i,'net',parseFloat(e.target.value)||0)} className="w-20 text-right text-[11px] font-semibold text-emerald-600 bg-transparent border border-transparent hover:border-emerald-200 focus:border-emerald-400 rounded px-1 py-0.5 outline-none"/></td>
              <td className="px-1 py-1"><input type="number" value={r.nights||''} onChange={e=>updateRow(i,'nights',parseInt(e.target.value)||0)} className="w-10 text-right text-[11px] text-slate-500 bg-transparent border border-transparent hover:border-slate-200 focus:border-slate-400 rounded px-1 py-0.5 outline-none"/></td>
            </tr>)}</tbody>
            <tfoot><tr className="bg-slate-800 text-white font-bold">
              <td className="px-1 py-2"></td>
              <td className="px-2 py-2">TOTAL ({included.length})</td>
              <td className="px-2 py-2 text-right">{fm(totRev)}</td>
              <td className="px-2 py-2 text-right">{fm(included.reduce((s,r)=>s+(r.commission||0),0))}</td>
              <td className="px-2 py-2 text-right hidden sm:table-cell">{fm(included.reduce((s,r)=>s+(r.duke||0),0))}</td>
              <td className="px-2 py-2 text-right hidden sm:table-cell">{fm(included.reduce((s,r)=>s+(r.water||0),0))}</td>
              <td className="px-2 py-2 text-right">{fm(totNet)}</td>
              <td className="px-2 py-2 text-right">{totNights}</td>
            </tr></tfoot>
          </table>
        </div>
      </Mdl>})()}

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
    return<Suspense fallback={<div className="min-h-screen bg-[#080E1A]"/>}><LandingPage onLogin={m=>setAuthMode(m)}/></Suspense>;
  }
  if(checking)return<div className="min-h-screen bg-[#080E1A] flex items-center justify-center"><div className="text-center"><div className="w-12 h-12 bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-600/20"><span className="text-sm font-black text-white">OD</span></div><Loader2 size={24} className="animate-spin text-blue-500 mx-auto mb-3"/><p className="text-white/30 text-sm">Cargando propiedades...</p></div></div>;
  if(!allProps.length||!ap||addingProp)return<Onboarding userId={user.uid} onComplete={id=>{setActive(id);setAddingProp(false)}} onBack={allProps.length>0?()=>{setAddingProp(false);if(!active&&allProps.length)setActive(allProps[0].id)}:null}/>;
  return<Dashboard propertyId={active} propertyData={ap} allProperties={allProps} onSwitchProperty={setActive} onLogout={()=>signOut(auth)} onAddProperty={()=>setAddingProp(true)} userEmail={user.email}/>;
}
