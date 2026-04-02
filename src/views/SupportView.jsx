import { collection, addDoc, serverTimestamp, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { Send, MessageSquare } from 'lucide-react';
import { useDashboard } from '../context/DashboardContext';
import { Inp, Empty } from '../components/ui';

export function SupportView() {
  const { isAdmin, ticketForm, setTicketForm, userEmail, prop, propertyId, tickets, toast, setToast } = useDashboard();
  const notify = (msg, type='ok') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  return <>
    <div className="flex justify-between items-start mb-6">
      <div><h1 className="text-lg md:text-[22px] font-extrabold text-slate-800">💬 Soporte{isAdmin?' — Panel Admin':''}</h1><p className="text-sm text-slate-400 mt-1">{isAdmin?'Todos los tickets de usuarios':'Reporta bugs, sugiere mejoras, o haz preguntas'}</p></div>
    </div>

    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 max-w-2xl mb-6">
      <h3 className="text-base font-bold text-slate-700 mb-4">Nuevo Ticket</h3>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div><label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Tipo</label>
            <div className="grid grid-cols-3 gap-2">{[['bug','🐛 Bug'],['feature','💡 Mejora'],['question','❓ Pregunta']].map(([v,l])=><button key={v} type="button" onClick={()=>setTicketForm(f=>({...f,type:v}))} className={`py-2 rounded-xl border-2 text-xs font-medium transition ${ticketForm.type===v?'border-blue-500 bg-blue-50 text-blue-700':'border-slate-200 text-slate-500 hover:border-slate-300'}`}>{l}</button>)}</div>
          </div>
          <div><label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Prioridad</label>
            <div className="grid grid-cols-3 gap-2">{[['low','🟢 Baja'],['medium','🟡 Media'],['high','🔴 Alta']].map(([v,l])=><button key={v} type="button" onClick={()=>setTicketForm(f=>({...f,priority:v}))} className={`py-2 rounded-xl border-2 text-xs font-medium transition ${ticketForm.priority===v?'border-blue-500 bg-blue-50 text-blue-700':'border-slate-200 text-slate-500 hover:border-slate-300'}`}>{l}</button>)}</div>
          </div>
        </div>
        <Inp label="Asunto" value={ticketForm.subject} onChange={v=>setTicketForm(f=>({...f,subject:v}))} placeholder="Ej: El parser no lee mi statement"/>
        <div><label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Descripción</label>
          <textarea value={ticketForm.message} onChange={e=>setTicketForm(f=>({...f,message:e.target.value}))} rows={4} className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 resize-none" placeholder="Describe el problema o sugerencia con el mayor detalle posible..."/>
        </div>
      </div>
      <button onClick={async()=>{
        if(!ticketForm.subject||!ticketForm.message){notify('Llena asunto y descripción','error');return;}
        try{
          await addDoc(collection(db,'tickets'),{...ticketForm,userEmail,propertyName:prop.name||'',propertyId,status:'open',createdAt:serverTimestamp()});
          setTicketForm({type:'bug',subject:'',message:'',priority:'medium'});
          notify('Ticket enviado');
        }catch(e){notify('Error: '+e.message,'error')}
      }} disabled={!ticketForm.subject||!ticketForm.message} className="mt-4 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition shadow-lg shadow-blue-500/20 disabled:opacity-30 flex items-center gap-2"><Send size={15}/> Enviar Ticket</button>
    </div>

    {tickets.length>0&&<div className="max-w-2xl">
      <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wider mb-3">{isAdmin?'Todos los Tickets':'Mis Tickets'} ({tickets.length})</h3>
      <div className="space-y-2">{tickets.map(t=><div key={t.id} className={`bg-white rounded-2xl border shadow-sm p-4 ${t.status==='open'?'border-blue-200':'border-slate-200'}`}>
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm">{t.type==='bug'?'🐛':t.type==='feature'?'💡':'❓'}</span>
            <span className="text-sm font-bold text-slate-800">{t.subject}</span>
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${t.status==='open'?'bg-blue-100 text-blue-700':t.status==='resolved'?'bg-emerald-100 text-emerald-700':'bg-slate-100 text-slate-500'}`}>{t.status==='open'?'ABIERTO':t.status==='resolved'?'RESUELTO':'CERRADO'}</span>
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${t.priority==='high'?'bg-rose-100 text-rose-700':t.priority==='medium'?'bg-amber-100 text-amber-700':'bg-emerald-100 text-emerald-700'}`}>{t.priority==='high'?'ALTA':t.priority==='medium'?'MEDIA':'BAJA'}</span>
          </div>
          <span className="text-[10px] text-slate-400">{t.createdAt?.toDate?t.createdAt.toDate().toLocaleDateString('es'):''}</span>
        </div>
        <p className="text-sm text-slate-500 leading-relaxed">{t.message}</p>
        {isAdmin&&<div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
          <div className="text-[10px] text-slate-400"><span className="font-bold text-slate-500">{t.userEmail}</span> · {t.propertyName}</div>
          <div className="flex gap-1">
            {t.status==='open'&&<button onClick={async()=>{await updateDoc(doc(db,'tickets',t.id),{status:'resolved'})}} className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg hover:bg-emerald-100 transition">✓ Resolver</button>}
            <button onClick={async()=>{if(confirm('¿Eliminar ticket?'))await deleteDoc(doc(db,'tickets',t.id))}} className="text-[10px] font-bold text-rose-500 bg-rose-50 px-3 py-1 rounded-lg hover:bg-rose-100 transition">Eliminar</button>
          </div>
        </div>}
      </div>)}</div>
    </div>}

    {tickets.length===0&&<div className="max-w-2xl"><Empty icon={MessageSquare} title="Sin tickets" desc="No hay tickets registrados. Usa el formulario arriba para reportar un bug o sugerir una mejora."/></div>}
  </>;
}
