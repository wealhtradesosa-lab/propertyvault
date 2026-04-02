import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useDashboard } from '../context/DashboardContext';
import { getTerms } from '../lib/constants';
import { Inp, Sel } from '../components/ui';

export function SettingsView() {
  const { prop, propertyId, partners, latestVal, settingsForm, setSettingsForm, editPartners, setEditPartners, stmts, expenses, income, contribs, valuations, repairs, notify, propTerms, COUNTRIES, CURRENCY_LIST, US, PT, M, fm } = useDashboard();
      const sf2=settingsForm||{name:prop.name||'',address:prop.address||'',city:prop.city||'',state:prop.state||'',type:prop.type||'vacation',purchasePrice:String(prop.purchasePrice||''),purchaseDate:prop.purchaseDate||'',marketValue:String(latestVal?latestVal.value:prop.purchasePrice||''),manager:prop.manager||'',managerCommission:String(prop.managerCommission||15),bedrooms:String(prop.bedrooms||''),bathrooms:String(prop.bathrooms||''),country:prop.country||'US',currency:prop.currency||'USD',managedBy:prop.managedBy||'pm'};
      const uf=(k,v)=>{
        const next={...sf2,[k]:v};
        if(k==='country'){const c=COUNTRIES.find(x=>x.v===v);if(c)next.currency=c.cur;next.state=''}
        setSettingsForm(next);
      };
      const terms=getTerms(sf2.country);
      const stateList=terms.stateList||[];
      const ep=editPartners||partners.map(p=>({...p,email:p.email||''}));
      const upEp=(i,k,v)=>{const n=[...ep];n[i]={...n[i],[k]:v};setEditPartners(n)};
      return <>
      <h1 className="text-[22px] font-extrabold text-slate-800 mb-6">⚙️ Configuración de la Propiedad</h1>

      {/* General */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 max-w-2xl">
        <h3 className="text-base font-bold text-slate-700 mb-4">Datos Generales</h3>
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3"><Inp label="Nombre" value={sf2.name} onChange={v=>uf('name',v)}/><Inp label="Dirección" value={sf2.address} onChange={v=>uf('address',v)}/></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Sel label="País" value={sf2.country} onChange={v=>uf('country',v)} options={COUNTRIES.map(c=>({v:c.v,l:c.l}))}/>
            <Sel label="Moneda" value={sf2.currency} onChange={v=>uf('currency',v)} options={CURRENCY_LIST}/>
            <Sel label="Tipo" value={sf2.type} onChange={v=>uf('type',v)} options={PT}/>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3"><Inp label="Ciudad" value={sf2.city} onChange={v=>uf('city',v)}/>{stateList.length>0?<Sel label={terms.state} value={sf2.state} onChange={v=>uf('state',v)} options={stateList.map(s=>({v:s,l:s}))}/>:<Inp label={terms.state} value={sf2.state} onChange={v=>uf('state',v)}/>}<Inp label="Fecha de Compra" value={sf2.purchaseDate} onChange={v=>uf('purchaseDate',v)} type="date"/></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3"><Inp label="Precio de Compra" value={sf2.purchasePrice} onChange={v=>uf('purchasePrice',v)} prefix={sf2.currency==='EUR'?'€':sf2.currency==='GBP'?'£':'$'} type="number"/><Inp label="Valor Comercial Actual" value={sf2.marketValue} onChange={v=>uf('marketValue',v)} prefix={sf2.currency==='EUR'?'€':sf2.currency==='GBP'?'£':'$'} type="number"/></div>
          <div className="grid grid-cols-2 gap-3"><Inp label="Habitaciones" value={sf2.bedrooms} onChange={v=>uf('bedrooms',v)} type="number"/><Inp label="Baños" value={sf2.bathrooms} onChange={v=>uf('bathrooms',v)} type="number"/></div>
          <div><label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">¿Quién administra?</label><div className="grid grid-cols-2 gap-2">{[['owner','👤 Propietario'],['pm','🏢 Administrador externo']].map(([v,l])=><button key={v} type="button" onClick={()=>uf('managedBy',v)} className={`py-2.5 rounded-xl border-2 text-xs font-medium transition ${sf2.managedBy===v?'border-blue-500 bg-blue-50 text-blue-700':'border-slate-200 text-slate-500'}`}>{l}</button>)}</div></div>
          {sf2.managedBy==='pm'&&<div className="grid grid-cols-2 gap-3"><Inp label="Nombre del Administrador" value={sf2.manager} onChange={v=>uf('manager',v)} placeholder="IHM, Vacasa, Host U..."/><Inp label="Comisión (%)" value={sf2.managerCommission} onChange={v=>uf('managerCommission',v)} type="number"/></div>}
        </div>
        <button onClick={async()=>{try{
          const updates={name:sf2.name,address:sf2.address,city:sf2.city,state:sf2.state,type:sf2.type,country:sf2.country||'US',currency:sf2.currency||'USD',managedBy:sf2.managedBy||'pm',purchasePrice:parseFloat(sf2.purchasePrice)||0,purchaseDate:sf2.purchaseDate||'',manager:sf2.managedBy==='pm'?sf2.manager:'',managerCommission:sf2.managedBy==='pm'?(parseFloat(sf2.managerCommission)||15):0,bedrooms:parseInt(sf2.bedrooms)||0,bathrooms:parseInt(sf2.bathrooms)||0};
          await updateDoc(doc(db,'properties',propertyId),updates);
          const mv=parseFloat(sf2.marketValue)||0;
          if(mv>0&&mv!==(latestVal?latestVal.value:prop.purchasePrice)){await addDoc(collection(db,'properties',propertyId,'valuations'),{date:new Date().toISOString().split('T')[0],value:mv,source:'manual',notes:'Actualizado desde Configuración',createdAt:serverTimestamp()})}
          notify('Guardado correctamente')
        }catch(e){notify('Error: '+e.message,'error')}}} className="mt-5 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition shadow-lg shadow-blue-500/20">💾 Guardar Cambios</button>
      </div>

      {/* Partners — editable */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 max-w-2xl mt-4">
        <div className="flex justify-between items-center mb-4"><h3 className="text-base font-bold text-slate-700">Socios</h3></div>
        <div className="space-y-3">{ep.map((p,i)=><div key={p.id} className="rounded-xl p-4 bg-slate-50 border-l-4" style={{borderLeftColor:p.color}}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Inp label="Nombre" value={p.name} onChange={v=>upEp(i,'name',v)}/>
            <Inp label="Email (para acceso)" value={p.email} onChange={v=>upEp(i,'email',v)} type="email" placeholder="socio@email.com"/>
            <Inp label="Participación (%)" value={String(p.ownership)} onChange={v=>upEp(i,'ownership',v)} type="number"/>
            <Inp label="Capital Inicial" value={String(p.initialCapital||'')} onChange={v=>upEp(i,'initialCapital',v)} prefix="$" type="number"/>
          </div>
        </div>)}</div>
        <button onClick={async()=>{try{
          const updatedPartners=ep.map(p=>({id:p.id,name:p.name,email:p.email||'',ownership:parseFloat(p.ownership)||0,initialCapital:parseFloat(p.initialCapital)||0,color:p.color}));
          const memberEmails=[auth.currentUser.email,...updatedPartners.map(x=>x.email).filter(Boolean)];
          await updateDoc(doc(db,'properties',propertyId),{partners:updatedPartners,memberEmails});
          notify('Socios actualizados')
        }catch(e){notify('Error: '+e.message,'error')}}} className="mt-4 px-6 py-3 bg-purple-600 text-white rounded-xl font-bold text-sm hover:bg-purple-700 transition shadow-lg shadow-purple-500/20">👥 Guardar Socios</button>
        <p className="text-[10px] text-slate-400 mt-2">El email del socio le permite acceder a esta propiedad con su propia cuenta de OwnerDesk.</p>
      </div>

      {/* Data Export */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 max-w-2xl mt-4">
        <h3 className="text-base font-bold text-slate-700 mb-2">Exportar Datos</h3>
        <p className="text-xs text-slate-400 mb-4">Descarga un respaldo completo de tu propiedad.</p>
        <div className="flex flex-wrap gap-2">
          <button onClick={()=>{
            const data={property:{name:prop.name,address:prop.address,city:prop.city,state:prop.state,purchasePrice:prop.purchasePrice,type:prop.type},
              statements:stmts.map(s=>({periodo:`${M[s.month-1]} ${s.year}`,revenue:s.revenue,commission:s.commission,duke:s.duke,water:s.water,hoa:s.hoa,maintenance:s.maintenance,vendor:s.vendor,net:s.net,nights:s.nights,reservations:s.reservations})),
              expenses:expenses.map(e=>({fecha:e.date,concepto:e.concept,monto:e.amount,categoria:e.category,tipo:e.type})),
              contributions:contribs.map(c=>({fecha:c.date,concepto:c.concept,monto:c.amount})),
              valuations:valuations.map(v=>({fecha:v.date,valor:v.value,fuente:v.source})),
              repairs:repairs.map(r=>({fecha:r.date,titulo:r.title,monto:r.amount,vendor:r.vendor,estado:r.status})),
              partners:partners.map(p=>({nombre:p.name,participacion:p.ownership,capital:p.initialCapital})),
              exportDate:new Date().toISOString()};
            const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
            const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`ownerdesk-${prop.name?.replace(/\s+/g,'-')||'export'}-${new Date().toISOString().split('T')[0]}.json`;a.click();URL.revokeObjectURL(url);
          }} className="px-5 py-3 bg-slate-700 text-white rounded-xl font-bold text-sm hover:bg-slate-800 active:bg-slate-900 transition flex items-center gap-2">📦 Exportar JSON</button>
          <button onClick={()=>{
            if(!stmts.length){notify('No hay statements para exportar','error');return}
            const header='Periodo,Revenue,Comision,Electricidad,Agua,HOA,Mantenimiento,Otros,Net,Noches,Reservaciones\n';
            const rows=stmts.sort((a,b)=>a.year*100+a.month-b.year*100-b.month).map(s=>`${M[s.month-1]} ${s.year},${s.revenue||0},${s.commission||0},${s.duke||0},${s.water||0},${s.hoa||0},${s.maintenance||0},${s.vendor||0},${s.net||0},${s.nights||0},${s.reservations||0}`).join('\n');
            const blob=new Blob([header+rows],{type:'text/csv'});
            const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`statements-${prop.name?.replace(/\s+/g,'-')||'export'}-${new Date().toISOString().split('T')[0]}.csv`;a.click();URL.revokeObjectURL(url);
          }} className="px-5 py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 active:bg-emerald-800 transition flex items-center gap-2">📊 Statements CSV</button>
        </div>
      </div>

      {/* Danger zone */}
      <div className="bg-rose-50 rounded-2xl border border-rose-200 p-6 max-w-2xl mt-4">
        <h3 className="text-base font-bold text-rose-700 mb-2">Zona de Peligro</h3>
        <p className="text-xs text-rose-500 mb-4">Estas acciones son irreversibles.</p>
        <button onClick={async()=>{if(!confirm('¿ELIMINAR esta propiedad y TODOS sus datos? Esta acción NO se puede deshacer.'))return;if(!confirm('¿Estás SEGURO? Se borrarán todos los statements, gastos, ingresos y aportes.'))return;for(const sub of['expenses','income','contributions','statements','valuations']){const snap=await getDocs(collection(db,'properties',propertyId,sub));for(const d of snap.docs)await deleteDoc(doc(db,'properties',propertyId,sub,d.id))}await deleteDoc(doc(db,'properties',propertyId));window.location.reload()}} className="px-5 py-2.5 bg-rose-600 text-white rounded-xl font-bold text-sm hover:bg-rose-700 transition">🗑️ Eliminar Propiedad</button>
      </div>
    </>;
}
