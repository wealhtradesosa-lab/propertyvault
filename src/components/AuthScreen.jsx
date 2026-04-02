import { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import { Loader2, Lock, Mail, Eye, EyeOff } from 'lucide-react';

export function AuthScreen({initialMode='login',onBack}) {
  const [mode,setMode]=useState(initialMode);const [email,setEmail]=useState('');const [pw,setPw]=useState('');const [show,setShow]=useState(false);const [err,setErr]=useState('');const [busy,setBusy]=useState(false);
  const go=async e=>{e.preventDefault();setErr('');setBusy(true);try{mode==='login'?await signInWithEmailAndPassword(auth,email,pw):await createUserWithEmailAndPassword(auth,email,pw)}catch(e){setErr({'auth/invalid-credential':'Correo o contraseña incorrectos','auth/email-already-in-use':'Este correo ya tiene cuenta','auth/weak-password':'Mínimo 6 caracteres'}[e.code]||e.message)}setBusy(false)};
  return <div className="min-h-screen bg-[#080E1A] flex items-center justify-center p-4" style={{backgroundImage:'radial-gradient(ellipse at 20% 50%,rgba(37,99,235,.06) 0%,transparent 50%),radial-gradient(ellipse at 80% 20%,rgba(16,185,129,.04) 0%,transparent 50%)'}}>
    <div className="w-full max-w-[440px]">
      <div className="text-center mb-10">
        {onBack&&<button onClick={onBack} className="text-white/30 hover:text-white/60 text-sm font-medium mb-6 flex items-center gap-1 mx-auto transition">← Volver al inicio</button>}
        <div className="inline-flex items-center justify-center w-[68px] h-[68px] bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 rounded-2xl shadow-xl shadow-blue-600/20 mb-5 ring-4 ring-white/5">
          <span className="text-2xl font-black text-white tracking-tighter">OD</span>
        </div>
        <h1 className="text-2xl md:text-[34px] font-extrabold text-white tracking-tight">Owner<span className="text-blue-400">Desk</span></h1>
        <p className="text-white/25 mt-2 text-sm font-medium tracking-wide">INVESTMENT PROPERTY INTELLIGENCE</p>
      </div>
      <div className="bg-white/[0.03] backdrop-blur-xl rounded-3xl border border-white/8 p-8 shadow-2xl">
        <div className="flex mb-7 bg-white/5 rounded-2xl p-1">{[['login','Iniciar Sesión'],['register','Crear Cuenta']].map(([k,l])=><button key={k} onClick={()=>{setMode(k);setErr('')}} className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${mode===k?'bg-white text-slate-800 shadow-lg':'text-white/50 hover:text-white/80'}`}>{l}</button>)}</div>
        <form onSubmit={go} className="space-y-4">
          <div><label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">Correo</label><div className="relative"><Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/20" size={18}/><input type="email" value={email} onChange={e=>setEmail(e.target.value)} className="w-full pl-11 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/20 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 text-sm" placeholder="tu@email.com" required autoComplete="email"/></div></div>
          <div><label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">Contraseña</label><div className="relative"><Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/20" size={18}/><input type={show?'text':'password'} value={pw} onChange={e=>setPw(e.target.value)} className="w-full pl-11 pr-12 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/20 outline-none focus:border-blue-400 text-sm" placeholder="••••••••" required/><button type="button" onClick={()=>setShow(!show)} aria-label={show?'Ocultar contraseña':'Mostrar contraseña'} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 p-1">{show?<EyeOff size={16}/>:<Eye size={16}/>}</button></div></div>
          {err&&<div className="bg-red-500/10 border border-red-500/20 text-red-300 px-4 py-3 rounded-xl text-sm">{err}</div>}
          <button type="submit" disabled={busy} className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl font-bold text-sm hover:from-blue-700 hover:to-blue-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-xl shadow-blue-500/25 mt-2">{busy&&<Loader2 size={18} className="animate-spin"/>}{mode==='login'?'Entrar':'Crear Cuenta'}</button>
        </form>
      </div>
    </div>
  </div>;
}
