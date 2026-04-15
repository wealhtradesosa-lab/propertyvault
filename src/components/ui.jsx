import React, { useState } from 'react';
import { X, Plus, Trash2, Pencil, ChevronDown, Lock, ArrowUpRight, ArrowDownRight, AlertTriangle, CheckCircle } from 'lucide-react';
import { C, fm } from '../lib/constants';

export function Inp({label,value,onChange,type='text',prefix,placeholder,className='',disabled,error,min,required:req}) {
  const hasErr=!!error;
  return <div className={className}>{label&&<label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">{label}{req&&<span className="text-rose-400 ml-0.5">*</span>}</label>}
    <div className="relative">{prefix&&<span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">{prefix}</span>}
      <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} disabled={disabled} min={min} className={`w-full ${prefix?'pl-7':'pl-3.5'} pr-3.5 py-2.5 bg-white border ${hasErr?'border-rose-300 ring-2 ring-rose-100':'border-slate-200'} rounded-xl text-sm text-slate-800 placeholder:text-slate-300 outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-400`}/>
    </div>{hasErr&&<p className="text-[10px] text-rose-500 mt-1 font-medium">{error}</p>}</div>;
}

export function Sel({label,value,onChange,options,className=''}) {
  return <div className={className}>{label&&<label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">{label}</label>}
    <div className="relative"><select value={value} onChange={e=>onChange(e.target.value)} className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 outline-none appearance-none pr-9 focus:border-blue-400 focus:ring-2 focus:ring-blue-100">
      {options.map(o=><option key={o.v||o.value} value={o.v||o.value}>{o.l||o.label}</option>)}
    </select><ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/></div></div>;
}

export function PPick({partners,selected,onChange}) {
  return <div className="grid gap-2" style={{gridTemplateColumns:`repeat(${Math.min(partners.length,4)},1fr)`}}>
    {partners.map((p,i)=><button key={p.id} type="button" onClick={()=>onChange(p.id)} className={`relative py-3 rounded-xl border-2 font-semibold text-sm transition-all ${selected===p.id?'border-blue-500 bg-blue-50 text-blue-700 shadow-sm':'border-slate-200 text-slate-500 hover:border-slate-300'}`}><span className="absolute top-1.5 left-2.5 w-2 h-2 rounded-full" style={{background:p.color||C[i]}}/>{p.name||'Socio'}</button>)}
  </div>;
}

export function Mdl({title,grad='from-blue-600 to-blue-700',onClose,children,footer,wide}) {
  return <div className="fixed inset-0 z-50 flex justify-end" onClick={e=>e.target===e.currentTarget&&onClose()}>
    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose}/>
    <div className={`relative w-full ${wide?'md:max-w-2xl':'md:max-w-md'} bg-white shadow-2xl flex flex-col animate-slide-in max-h-screen`}>
      <div className={`bg-gradient-to-r ${grad} text-white px-5 py-4 flex justify-between items-center shrink-0`}><span className="font-bold text-sm">{title}</span><button onClick={onClose} aria-label="Cerrar" className="hover:bg-white/20 active:bg-white/30 p-2 rounded-lg transition"><X size={18}/></button></div>
      <div className="flex-1 overflow-y-auto p-5 space-y-4 overscroll-contain">{children}</div>
      {footer&&<div className="shrink-0 p-4 bg-slate-50 border-t flex gap-2 safe-area-pb">{footer}</div>}
    </div></div>;
}

export function Empty({icon:Ic,title,desc,action,onAction}) {
  return <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center"><div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4"><Ic size={28} className="text-slate-400"/></div><h3 className="text-base font-bold text-slate-700 mb-1">{title}</h3><p className="text-sm text-slate-400 mb-6 max-w-sm mx-auto">{desc}</p>{action&&<button onClick={onAction} className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 transition inline-flex items-center gap-1.5 shadow-lg shadow-blue-500/20"><Plus size={15}/>{action}</button>}</div>;
}

export function Tbl({cols,rows,onDel,dc,onEdit}) {
  if(!rows.length)return null;
  return <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"><div className="overflow-x-auto scrollbar-thin" style={{WebkitOverflowScrolling:'touch'}}><table className="w-full min-w-[600px]"><thead><tr className="bg-slate-50/80">{cols.map((c,i)=><th key={i} className={`py-3 px-3 md:px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap ${c.r?'text-right':'text-left'}`}>{c.label}</th>)}{(onDel||onEdit)&&<th className="w-14"/>}</tr></thead><tbody className="divide-y divide-slate-100">{rows.map((r,ri)=><tr key={r.id||ri} className="hover:bg-blue-50/30 active:bg-blue-50/50 transition-colors">{cols.map((c,ci)=><td key={ci} className={`py-2.5 px-3 md:px-4 text-sm ${c.r?'text-right':''} ${c.cls||''}`}>{c.render?c.render(r):r[c.key]}</td>)}{(onDel||onEdit)&&<td className="py-2.5 pr-2"><div className="flex items-center gap-0.5 justify-end">{onEdit&&<button onClick={()=>onEdit(r)} aria-label="Editar" className="text-slate-300 hover:text-blue-500 active:text-blue-600 p-2 rounded-lg hover:bg-blue-50 transition"><Pencil size={14}/></button>}{onDel&&<button onClick={()=>onDel(dc,r.id)} aria-label="Eliminar" className="text-slate-300 hover:text-red-500 active:text-red-600 p-2 rounded-lg hover:bg-red-50 transition"><Trash2 size={14}/></button>}</div></td>}</tr>)}</tbody></table></div></div>;
}

export const Tip=({active,payload,label,fmt})=>{if(!active||!payload?.length)return null;const f=fmt||fm;return<div className="bg-slate-800 rounded-xl px-4 py-3 shadow-xl border border-slate-700"><div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1.5">{label}</div>{payload.map((p,i)=><div key={i} className="text-xs" style={{color:p.color}}>{p.name}: <b className="text-white">{f(p.value)}</b></div>)}</div>};

export function UpgradeBanner({plan,feature}){const needed=feature==='insights'||feature==='str_metrics'||feature==='breakeven'?'Starter':'Pro';return<div className="relative bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center overflow-hidden"><div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white/90 backdrop-blur-[2px] z-10"/><div className="relative z-20"><Lock size={28} className="text-slate-300 mx-auto mb-3"/><h3 className="text-base font-bold text-slate-700 mb-1">Disponible en plan {needed}</h3><p className="text-sm text-slate-400 mb-4">Desbloquea {feature==='insights'?'insights y recomendaciones inteligentes':feature==='reports'?'reportes profesionales PDF':'esta función'} para optimizar tu inversión.</p><a href="https://ownerdesk.web.app/#pricing" className="inline-block px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition shadow-lg shadow-blue-500/20">Ver Planes</a></div></div>}

export function KPI({label,value,sub,color='blue',trend,alert,help}) {
  const [showHelp,setShowHelp]=useState(false);
  const bdr={blue:'border-l-blue-500',green:'border-l-emerald-500',red:'border-l-rose-500',purple:'border-l-purple-500',amber:'border-l-amber-500',cyan:'border-l-cyan-500'};
  const alertBg={red:'bg-rose-50',yellow:'bg-amber-50',green:'bg-emerald-50'};
  return <div className={`bg-white rounded-2xl p-4 border-l-4 ${bdr[color]||bdr.blue} shadow-sm hover:shadow-md transition-all ${alert?alertBg[alert]:''} relative print-avoid`}>
    <div className="flex items-center justify-between mb-1"><span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{label}</span>
      <div className="flex items-center gap-1">
        {alert==='red'&&<AlertTriangle size={14} className="text-rose-500"/>}
        {alert==='green'&&<CheckCircle size={14} className="text-emerald-500"/>}
        {help&&<button onMouseEnter={()=>setShowHelp(true)} onMouseLeave={()=>setShowHelp(false)} onClick={()=>setShowHelp(!showHelp)} className="text-slate-300 hover:text-blue-400 transition no-print"><span className="text-[10px] font-bold">?</span></button>}
      </div>
    </div>
    <div className="text-xl font-extrabold text-slate-800 tracking-tight">{value}</div>
    {(sub||trend)&&<div className="flex items-center gap-1.5 mt-1">{trend&&<span className={`text-[11px] font-bold flex items-center gap-0.5 ${trend.dir==='up'?'text-emerald-600':'text-rose-500'}`}>{trend.dir==='up'?<ArrowUpRight size={11}/>:<ArrowDownRight size={11}/>}{trend.text}</span>}{sub&&<span className="text-[10px] text-slate-400">{sub}</span>}</div>}
    {showHelp&&help&&<div className="absolute z-30 bottom-full left-0 mb-2 bg-slate-800 text-white text-[11px] p-3 rounded-xl shadow-xl max-w-[260px] leading-relaxed">{help}<div className="absolute -bottom-1 left-4 w-2 h-2 bg-slate-800 rotate-45"/></div>}
  </div>;
}
