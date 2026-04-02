import { useState, useCallback } from 'react';
import { db, auth } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Building2, Users, UserPlus, Landmark, Loader2, X } from 'lucide-react';
import { C, COUNTRIES, CURRENCY_LIST, getTerms, PROPERTY_TYPES as PT } from '../lib/constants';
import { Inp, Sel } from './ui';

export function Onboarding({userId,onComplete,onBack}) {
  const [step,setStep]=useState(0);const [busy,setBusy]=useState(false);
  const [p,setP]=useState({name:'',address:'',city:'',state:'',type:'vacation',price:'',date:'',beds:'',baths:'',pm:'',pmFee:'15',country:'US',currency:'USD',managedBy:'pm'});
  const [prs,setPrs]=useState([{name:'',email:'',own:'100',cap:''}]);
  const [mt,setMt]=useState({bal:'',rate:'',term:'30',pay:'',start:''});
  const up=useCallback((k,v)=>{
    setP(x=>{const next={...x,[k]:v};
      if(k==='country'){const c=COUNTRIES.find(y=>y.v===v);if(c)next.currency=c.cur;next.state=''}
      return next});
  },[]);const um=useCallback((k,v)=>setMt(x=>({...x,[k]:v})),[]);
  const terms=getTerms(p.country);
  const stateList=terms.stateList||[];
  const upPr=useCallback((i,k,v)=>setPrs(x=>{const n=[...x];n[i]={...n[i],[k]:v};return n}),[]);
  const addPr=()=>setPrs(x=>[...x,{name:'',email:'',own:'',cap:''}]);const rmPr=i=>setPrs(x=>x.length>1?x.filter((_,j)=>j!==i):x);
  const totOwn=prs.reduce((s,x)=>s+(parseFloat(x.own)||0),0);
  const finish=async()=>{setBusy(true);try{
    const pl=prs.map((x,i)=>({id:'p'+i,name:x.name,email:x.email||'',ownership:parseFloat(x.own)||0,initialCapital:parseFloat(x.cap)||0,color:C[i%C.length]}));
    const me=[auth.currentUser.email,...pl.map(x=>x.email).filter(Boolean)];
    const d={name:p.name,address:p.address,city:p.city,state:p.state,type:p.type,country:p.country||'US',currency:p.currency||'USD',managedBy:p.managedBy||'pm',purchasePrice:parseFloat(p.price)||0,purchaseDate:p.date,bedrooms:parseInt(p.beds)||0,bathrooms:parseInt(p.baths)||0,manager:p.managedBy==='pm'?p.pm:'',managerCommission:p.managedBy==='pm'?(parseFloat(p.pmFee)||15):0,partners:pl,memberEmails:me,
      mortgage:{balance:parseFloat(mt.bal)||0,rate:parseFloat(mt.rate)||0,termYears:parseInt(mt.term)||30,monthlyPayment:parseFloat(mt.pay)||0,startDate:mt.start||''},ownerId:userId,createdAt:serverTimestamp()};
    const ref=await addDoc(collection(db,'properties'),d);
    for(const x of d.partners){if(x.initialCapital>0)await addDoc(collection(db,'properties',ref.id,'contributions'),{partnerId:x.id,amount:x.initialCapital,type:'contribution',concept:'Capital Inicial',date:p.date||new Date().toISOString().split('T')[0],createdAt:serverTimestamp()});}
    onComplete(ref.id);
  }catch(e){setBusy(false);alert('Error al crear la propiedad: '+e.message);return}setBusy(false)};
  return <div className="min-h-screen bg-[#080E1A] flex items-center justify-center p-4" style={{backgroundImage:'radial-gradient(ellipse at 50% 0%,rgba(37,99,235,.08) 0%,transparent 50%)'}}>
    <div className="w-full max-w-[580px]">
      <div className="text-center mb-6">
        {onBack&&<button onClick={onBack} className="text-white/40 hover:text-white text-sm font-medium mb-4 flex items-center gap-1 mx-auto hover:bg-white/10 px-4 py-2 rounded-xl transition">← Volver a mis propiedades</button>}
        <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 rounded-xl shadow-lg shadow-blue-600/20 mb-3"><span className="text-sm font-black text-white">OD</span></div><h1 className="text-2xl font-extrabold text-white tracking-tight">{onBack?'Nueva Propiedad':'Configurar Propiedad'}</h1><p className="text-white/30 text-sm mt-1">Paso {step+1} de 3</p></div>
      <div className="flex gap-2 mb-6">{['Propiedad','Socios','Hipoteca'].map((s,i)=><div key={i} className="flex-1"><div className={`h-1.5 rounded-full transition-all duration-500 ${i<=step?'bg-gradient-to-r from-blue-500 to-emerald-500':'bg-white/5'}`}/><div className={`text-[10px] mt-1.5 text-center font-medium ${i<=step?'text-blue-400':'text-white/20'}`}>{s}</div></div>)}</div>
      <div className="bg-white rounded-3xl shadow-2xl p-7">
        {step===0&&<div><h2 className="text-lg font-extrabold text-slate-800 mb-5 flex items-center gap-2"><Building2 size={20} className="text-blue-500"/> Datos de la Propiedad</h2>
          <div className="space-y-3"><Inp label="Nombre" value={p.name} onChange={v=>up('name',v)} placeholder="Ej: Finca El Refugio, Casa Orlando"/>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3"><Sel label="País" value={p.country} onChange={v=>up('country',v)} options={COUNTRIES.map(c=>({v:c.v,l:c.l}))}/><Sel label="Moneda" value={p.currency} onChange={v=>up('currency',v)} options={CURRENCY_LIST}/><Sel label="Tipo" value={p.type} onChange={v=>up('type',v)} options={PT}/></div>
          <Inp label="Dirección" value={p.address} onChange={v=>up('address',v)} placeholder="Km 5 Vía La Ceja"/>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3"><Inp label="Ciudad" value={p.city} onChange={v=>up('city',v)} placeholder="Medellín"/>{stateList.length>0?<Sel label={terms.state} value={p.state} onChange={v=>up('state',v)} options={stateList.map(s=>({v:s,l:s}))}/>:<Inp label={terms.state} value={p.state} onChange={v=>up('state',v)} placeholder="Región"/>}</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3"><Inp label="Precio compra" value={p.price} onChange={v=>up('price',v)} prefix={p.currency==='EUR'?'€':p.currency==='GBP'?'£':'$'} type="number"/><Inp label="Fecha compra" value={p.date} onChange={v=>up('date',v)} type="date"/></div>
          <div className="grid grid-cols-2 gap-3"><Inp label="Habitaciones" value={p.beds} onChange={v=>up('beds',v)} type="number"/><Inp label="Baños" value={p.baths} onChange={v=>up('baths',v)} type="number"/></div>
          <div><label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">¿Quién administra?</label><div className="grid grid-cols-2 gap-2">{[['owner','👤 Propietario'],['pm','🏢 Administrador externo']].map(([v,l])=><button key={v} type="button" onClick={()=>up('managedBy',v)} className={`py-2.5 rounded-xl border-2 text-xs font-medium transition ${p.managedBy===v?'border-blue-500 bg-blue-50 text-blue-700':'border-slate-200 text-slate-500'}`}>{l}</button>)}</div></div>
          {p.managedBy==='pm'&&<div className="grid grid-cols-2 gap-3"><Inp label="Nombre del Administrador" value={p.pm} onChange={v=>up('pm',v)} placeholder="IHM, Vacasa, Host U..."/><Inp label="Comisión (%)" value={p.pmFee} onChange={v=>up('pmFee',v)} type="number"/></div>}
          </div>
          <div className="flex justify-end mt-6"><button onClick={()=>setStep(1)} disabled={!p.name||!p.address} className="px-7 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 disabled:opacity-30 transition shadow-lg shadow-blue-500/20">Siguiente →</button></div></div>}
        {step===1&&<div><h2 className="text-lg font-extrabold text-slate-800 mb-1 flex items-center gap-2"><Users size={20} className="text-blue-500"/> Socios</h2><p className="text-sm text-slate-400 mb-5">Único dueño = tu nombre con 100%.</p>
          {prs.map((x,i)=><div key={i} className="rounded-2xl p-4 mb-3 bg-slate-50 border-l-4" style={{borderLeftColor:C[i%C.length]}}><div className="flex justify-between items-center mb-3"><span className="text-xs font-extrabold uppercase tracking-widest" style={{color:C[i%C.length]}}>Socio {i+1}</span>{prs.length>1&&<button onClick={()=>rmPr(i)} className="text-slate-300 hover:text-rose-500 p-1 rounded-lg hover:bg-rose-50"><X size={16}/></button>}</div>
            <div className="grid grid-cols-2 gap-3 mb-2"><Inp label="Nombre" value={x.name} onChange={v=>upPr(i,'name',v)} placeholder="Juan Pérez"/><Inp label="Email" value={x.email} onChange={v=>upPr(i,'email',v)} placeholder="socio@email.com" type="email"/></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3"><Inp label="% Participación" value={x.own} onChange={v=>upPr(i,'own',v)} type="number"/><Inp label="Capital Inicial" value={x.cap} onChange={v=>upPr(i,'cap',v)} prefix="$" type="number"/></div></div>)}
          <div className="flex justify-between items-center mt-3 mb-6"><button onClick={addPr} className="text-sm text-blue-600 font-bold flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-blue-50"><UserPlus size={15}/> Agregar</button><span className={`text-sm font-extrabold px-4 py-1.5 rounded-full ${totOwn===100?'bg-emerald-100 text-emerald-700':'bg-amber-100 text-amber-700'}`}>{totOwn}%{totOwn===100?' ✓':' ≠100%'}</span></div>
          <div className="flex justify-between"><button onClick={()=>setStep(0)} className="px-5 py-2.5 border-2 border-slate-200 rounded-xl font-semibold text-slate-600 hover:bg-slate-50">← Atrás</button><button onClick={()=>setStep(2)} disabled={!prs[0].name||totOwn!==100} className="px-7 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm disabled:opacity-30 shadow-lg shadow-blue-500/20">Siguiente →</button></div></div>}
        {step===2&&<div><h2 className="text-lg font-extrabold text-slate-800 mb-1 flex items-center gap-2"><Landmark size={20} className="text-blue-500"/> Hipoteca <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-1 rounded-full">OPCIONAL</span></h2><p className="text-sm text-slate-400 mb-5">Deja en blanco si no aplica.</p>
          <div className="space-y-3"><div className="grid grid-cols-1 md:grid-cols-2 gap-3"><Inp label="Balance" value={mt.bal} onChange={v=>um('bal',v)} prefix="$" type="number"/><Inp label="Tasa (%)" value={mt.rate} onChange={v=>um('rate',v)} type="number"/></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3"><Inp label="Plazo (años)" value={mt.term} onChange={v=>um('term',v)} type="number"/><Inp label="Pago Mensual" value={mt.pay} onChange={v=>um('pay',v)} prefix="$" type="number"/><Inp label="Inicio" value={mt.start} onChange={v=>um('start',v)} type="date"/></div></div>
          <div className="flex justify-between mt-6"><button onClick={()=>setStep(1)} className="px-5 py-2.5 border-2 border-slate-200 rounded-xl font-semibold text-slate-600 hover:bg-slate-50">← Atrás</button><button onClick={finish} disabled={busy} className="px-7 py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white rounded-xl font-bold text-sm disabled:opacity-50 flex items-center gap-2 shadow-xl shadow-emerald-500/20">{busy&&<Loader2 size={16} className="animate-spin"/>}🚀 Crear Propiedad</button></div></div>}
      </div>
    </div>
  </div>;
}

