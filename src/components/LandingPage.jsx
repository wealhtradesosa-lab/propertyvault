import { useState } from 'react';

export function LandingPage({onLogin}) {
  const [annual,setAnnual]=useState(false);
  const scroll=(id)=>document.getElementById(id)?.scrollIntoView({behavior:'smooth'});
  return <div className="min-h-screen bg-[#080E1A] text-white" style={{backgroundImage:'radial-gradient(ellipse at 20% 0%,rgba(37,99,235,.08) 0%,transparent 50%),radial-gradient(ellipse at 80% 100%,rgba(16,185,129,.05) 0%,transparent 50%)'}}>
    {/* NAV */}
    <nav className="fixed top-0 w-full z-50 bg-[#080E1A]/80 backdrop-blur-xl border-b border-white/5">
      <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3"><div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20"><span className="text-xs font-black text-white">OD</span></div><span className="text-lg font-extrabold tracking-tight">Owner<span className="text-blue-400">Desk</span></span></div>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-white/40">
          <button onClick={()=>scroll('features')} className="hover:text-white transition">Funciones</button>
          <button onClick={()=>scroll('pricing')} className="hover:text-white transition">Planes</button>
          <button onClick={()=>scroll('faq')} className="hover:text-white transition">FAQ</button>
        </div>
        <div className="flex gap-2 md:gap-3">
          <button onClick={()=>onLogin('login')} className="hidden md:block px-4 py-2 text-sm font-semibold text-white/60 hover:text-white transition">Iniciar Sesión</button>
          <button onClick={()=>onLogin('login')} className="md:hidden px-3 py-2 text-xs font-semibold text-white/60 hover:text-white transition">Login</button>
          <button onClick={()=>onLogin('register')} className="px-3 md:px-5 py-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white text-xs md:text-sm font-bold rounded-xl hover:from-blue-700 hover:to-blue-600 transition shadow-lg shadow-blue-600/20">Crear Cuenta</button>
        </div>
      </div>
    </nav>

    {/* ═══ A — ATTENTION: Hero with Banner ═══ */}
    <section className="relative pt-24 pb-0 overflow-hidden" style={{minHeight:'92vh'}}>
      <div className="absolute inset-0 z-0">
        <img src="/hero-banner.webp" srcSet="/hero-banner-mobile.webp 800w, /hero-banner.webp 2000w" sizes="100vw" alt="" className="w-full h-full object-cover object-center" style={{filter:'brightness(0.35) saturate(1.2)'}} loading="eager"/>
        <div className="absolute inset-0" style={{background:'linear-gradient(to bottom, rgba(8,14,26,0.7) 0%, rgba(8,14,26,0.4) 40%, rgba(8,14,26,0.6) 70%, rgba(8,14,26,1) 100%)'}}/>
        <div className="absolute inset-0" style={{background:'radial-gradient(ellipse at 30% 20%, rgba(37,99,235,0.12) 0%, transparent 60%)'}}/>
      </div>
      <div className="relative z-10 px-6 pt-12 md:pt-20 pb-16">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-black/30 backdrop-blur-md border border-white/15 rounded-full px-5 py-2 mb-8"><div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"/><span className="text-sm font-semibold text-white/60">El copiloto financiero de tu propiedad de inversión</span></div>
          <h1 className="text-3xl md:text-6xl font-black tracking-tight leading-[1.1] mb-6 drop-shadow-2xl">
            Tu statement cuenta una parte.<br/>
            <span className="bg-gradient-to-r from-blue-400 via-cyan-300 to-emerald-400 bg-clip-text text-transparent">Nosotros te contamos toda la historia.</span>
          </h1>
          <p className="text-sm md:text-lg text-white/55 max-w-2xl mx-auto leading-relaxed mb-10 drop-shadow-lg">
            Convertimos los datos de tu property manager en información real para tomar decisiones: dónde ganas, dónde pierdes, cuánto se lleva la hipoteca, y qué ajustar hoy para que tu inversión sea más rentable.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={()=>onLogin('register')} className="px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-500 text-white text-base font-bold rounded-2xl hover:from-blue-700 hover:to-blue-600 transition-all shadow-2xl shadow-blue-600/30 hover:shadow-blue-600/40 hover:-translate-y-0.5 backdrop-blur-sm">Analiza tu propiedad gratis</button>
            <button onClick={()=>scroll('features')} className="px-8 py-4 bg-black/30 backdrop-blur-md border border-white/15 text-white/80 text-base font-semibold rounded-2xl hover:bg-black/40 transition">Cómo funciona ↓</button>
          </div>
          <p className="text-xs text-white/30 mt-4 drop-shadow">Gratis para siempre · 1 propiedad · Sin tarjeta de crédito</p>
        </div>
      </div>
      <div className="relative z-10 px-6 pb-12 -mt-2">
        <div className="max-w-5xl mx-auto">
          <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl">
            <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
              {[['Ingreso Bruto','$188,991','text-blue-400','↑ 12%'],['Ingreso Neto','$99,338','text-emerald-400','↑ 8%'],['Cash Flow','-$31,565','text-rose-400','↓ deuda'],['Ocupación','70%','text-cyan-400','24 noches'],['Retorno (CoC)','-12.6%','text-purple-400','equity +28%']].map(([l,v,c,sub])=>
                <div key={l} className="text-center md:text-left px-2 py-1"><div className="text-[9px] md:text-[10px] font-bold text-white/30 uppercase tracking-wider">{l}</div><div className={`text-base md:text-xl font-extrabold ${c} mt-0.5`}>{v}</div><div className="text-[8px] md:text-[9px] text-white/25 font-medium mt-0.5">{sub}</div></div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>

    {/* ═══ I — INTEREST: Problem + Features ═══ */}
    <section id="features" className="py-20 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-2xl md:text-4xl font-extrabold tracking-tight mb-4">Un PDF entra.<br/><span className="text-white/40">Un diagnóstico completo sale.</span></h2>
          <p className="text-white/35 max-w-xl mx-auto">OwnerDesk extrae cada número del statement de tu administrador, lo cruza con tu hipoteca, y te muestra exactamente cómo está tu inversión — y qué hacer para mejorarla.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            ['📄','Sube el PDF. Listo.','Arrastra el statement de tu property manager — IHM, Vacasa, Evolve, Guesty, Host U, Airbnb, Vrbo — y más. En segundos extrae ingresos, comisiones, utilities, noches, y reservaciones.'],
            ['📊','Ve lo que tu PM no te muestra','Dashboard profesional con los KPIs que importan: Cash Flow real (no solo revenue), ocupación vs break-even, margen operativo, y tu retorno real sobre el capital invertido.'],
            ['💡','Te dice qué hacer, no solo qué pasó','Insights accionables: "Necesitas 24 noches para cubrir costos pero promedias 21." "Tu electricidad consume 15% del ingreso — revisa el termostato." "Tienes $239K en equity — considera un HELOC."'],
            ['🏦','Sabe cuánto le debes al banco','Tracker de hipoteca visual: cuánto has pagado, cuánto falta, cuándo terminas, LTV, y si el ingreso cubre el debt service.'],
            ['📈','Mide si vas mejor o peor','Comparativo año a año: ¿subió el ingreso? ¿bajó la ocupación? ¿los costos se dispararon? Tendencias claras sin hojas de Excel.'],
            ['👥','Cada socio sabe lo suyo','Si tienes partner, la plataforma calcula cuánto aportó cada uno, cuánto le corresponde, y si alguien está en deuda. Cero conflictos.'],
            ['🔧','Controla cada gasto','Registra reparaciones, mejoras, y CapEx con costos, fechas, y quién pagó. Todo trazable para tu contador.'],
            ['📋','Reportes que tu banco respeta','P&L profesional, Cash Flow, distribución de socios, progreso de hipoteca. Listos para imprimir o enviar al banco.'],
            ['🌍','Un portafolio, una pantalla','¿Dos propiedades? ¿Diez? Todas en una cuenta con vista consolidada. Un solo login para todo tu patrimonio inmobiliario.'],
          ].map(([icon,title,desc])=>
            <div key={title} className="bg-white/[0.03] border border-white/6 rounded-2xl p-6 hover:border-white/12 transition-all hover:-translate-y-1">
              <div className="text-2xl mb-3">{icon}</div>
              <h3 className="text-sm md:text-base font-bold mb-2">{title}</h3>
              <p className="text-sm text-white/35 leading-relaxed">{desc}</p>
            </div>
          )}
        </div>
      </div>
    </section>

    {/* ═══ D — DESIRE: Social proof + Results ═══ */}
    <section className="py-20 px-6 bg-gradient-to-b from-transparent via-blue-950/20 to-transparent">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-2xl md:text-4xl font-extrabold tracking-tight mb-4">Propietarios que dejaron de<br/><span className="text-blue-400">adivinar y empezaron a decidir.</span></h2>
        </div>
        <div className="grid md:grid-cols-4 gap-6 mb-16">
          {[['70%','De propietarios no saben su cash flow real'],['24','Noches promedio para break-even en Orlando'],['$636','Promedio mensual en electricidad que pocos monitorean'],['28%','Valorización que pasa desapercibida sin tracking']].map(([n,d])=>
            <div key={d} className="text-center"><div className="text-3xl font-black bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">{n}</div><div className="text-xs text-white/30 mt-2 font-medium">{d}</div></div>
          )}
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            ['"Creía que mi propiedad daba ganancia. OwnerDesk me mostró que la hipoteca se llevaba todo. Refinancié y ahora sí genero cash flow positivo."','Carlos M.','Propietario, Orlando FL','⭐⭐⭐⭐⭐'],
            ['"Mi property manager me mandaba PDFs que yo ni abría. Ahora subo todo y en 5 segundos sé si fue buen mes o mal mes — y por qué."','Ana R.','Inversionista, Miami FL','⭐⭐⭐⭐⭐'],
            ['"Tengo propiedad con mi cuñado. Antes peleábamos por los números. Ahora cada quien entra y ve exactamente qué le toca. Cero drama."','Diego L.','Co-propietario, Kissimmee FL','⭐⭐⭐⭐⭐'],
          ].map(([q,name,role,stars])=>
            <div key={name} className="bg-white/[0.03] border border-white/6 rounded-2xl p-6">
              <div className="text-xs mb-3">{stars}</div>
              <p className="text-sm text-white/50 italic leading-relaxed mb-4">{q}</p>
              <div><div className="text-sm font-bold">{name}</div><div className="text-xs text-white/25">{role}</div></div>
            </div>
          )}
        </div>
      </div>
    </section>

    {/* ═══ A — ACTION: Pricing ═══ */}
    <section id="pricing" className="py-20 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-6">
          <h2 className="text-2xl md:text-4xl font-extrabold tracking-tight mb-4">Empieza gratis.<br/><span className="text-white/40">Escala cuando lo necesites.</span></h2>
          <p className="text-white/30 max-w-md mx-auto">Sin compromisos. Sin sorpresas. Sin letra pequeña.</p>
        </div>
        <div className="flex items-center gap-3 justify-center mb-12">
          <span className={`text-sm font-semibold cursor-pointer transition ${!annual?'text-white':'text-white/40'}`} onClick={()=>setAnnual(false)}>Mensual</span>
          <div className={`w-12 h-7 rounded-full cursor-pointer relative transition-all ${annual?'bg-gradient-to-r from-blue-600 to-emerald-500':'bg-white/10'}`} onClick={()=>setAnnual(!annual)}><div className={`absolute w-5 h-5 bg-white rounded-full top-1 shadow-md transition-all ${annual?'left-6':'left-1'}`}/></div>
          <span className={`text-sm font-semibold cursor-pointer transition ${annual?'text-white':'text-white/40'}`} onClick={()=>setAnnual(true)}>Anual</span>
          <span className="bg-gradient-to-r from-emerald-600 to-emerald-500 text-white text-[10px] font-bold px-3 py-1 rounded-full">AHORRA 25%</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* FREE */}
          <div className="bg-white/[0.03] border border-white/8 rounded-3xl p-8 hover:border-white/15 transition-all">
            <div className="text-xs font-extrabold text-white/30 uppercase tracking-widest mb-2">Free</div>
            <div className="flex items-baseline gap-1 mb-1"><span className="text-3xl md:text-5xl font-black">$0</span><span className="text-white/30 text-sm">/siempre</span></div>
            <p className="text-sm text-white/30 mb-6 mt-3">Para ver si tu propiedad da plata o te quita.</p>
            <button onClick={()=>onLogin('register')} className="w-full py-3.5 bg-white/5 border border-white/10 rounded-xl text-sm font-bold text-white/60 hover:bg-white/10 hover:text-white transition">Empezar Gratis</button>
            <div className="mt-6 pt-5 border-t border-white/5 space-y-3 text-[13px] text-white/40">
              <div className="flex gap-2"><span className="text-amber-400">①</span>1 propiedad</div>
              <div className="flex gap-2"><span className="text-emerald-400">✓</span>Dashboard básico</div>
              <div className="flex gap-2"><span className="text-emerald-400">✓</span>Carga de PDFs</div>
              <div className="flex gap-2"><span className="text-emerald-400">✓</span>Gastos e ingresos</div>
              <div className="flex gap-2"><span className="text-amber-400">⑫</span>Últimos 12 meses</div>
              <div className="flex gap-2 text-white/15"><span>—</span>Sin insights ni métricas STR</div>
            </div>
          </div>
          {/* STARTER */}
          <div className="bg-gradient-to-b from-blue-600/10 to-transparent border-2 border-blue-500/30 rounded-3xl p-8 relative hover:border-blue-500/50 transition-all">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-600 to-blue-500 text-white text-[10px] font-extrabold px-5 py-1.5 rounded-full tracking-widest shadow-lg">MÁS POPULAR</div>
            <div className="text-xs font-extrabold text-blue-400 uppercase tracking-widest mb-2">Starter</div>
            <div className="flex items-baseline gap-1 mb-1"><span className="text-3xl md:text-5xl font-black">${annual?'9':'12'}</span><span className="text-white/30 text-sm">/mes</span></div>
            {annual&&<div className="text-xs text-white/25 line-through">$12/mes</div>}
            <p className="text-sm text-white/30 mb-6 mt-3">Para saber dónde pierdes y qué cambiar hoy.</p>
            <a href={annual?'https://buy.stripe.com/fZu4gA6PAgvs74Of8s2ZO03':'https://buy.stripe.com/7sY8wQddYa7488S9O82ZO01'} target="_blank" rel="noopener" className="block w-full py-3.5 bg-gradient-to-r from-blue-600 to-blue-500 rounded-xl text-sm font-bold text-white shadow-xl shadow-blue-600/25 hover:from-blue-700 hover:to-blue-600 transition-all text-center">Comenzar con Starter</a>
            <div className="mt-6 pt-5 border-t border-white/5 space-y-3 text-[13px] text-white/50">
              <div className="flex gap-2"><span className="text-blue-400">③</span>Hasta 3 propiedades</div>
              <div className="flex gap-2"><span className="text-emerald-400">✓</span>Dashboard completo</div>
              <div className="flex gap-2"><span className="text-emerald-400">✓</span>Insights & recomendaciones</div>
              <div className="flex gap-2"><span className="text-emerald-400">✓</span>Métricas STR (ADR, RevPAR)</div>
              <div className="flex gap-2"><span className="text-emerald-400">✓</span>Break-even & punto de equilibrio</div>
              <div className="flex gap-2"><span className="text-emerald-400">✓</span>Socios & distribución</div>
              <div className="flex gap-2"><span className="text-emerald-400">✓</span>Hipoteca tracker</div>
              <div className="flex gap-2"><span className="text-emerald-400">✓</span>Historial ilimitado</div>
            </div>
          </div>
          {/* PRO */}
          <div className="bg-white/[0.03] border border-white/8 rounded-3xl p-8 hover:border-white/15 transition-all">
            <div className="text-xs font-extrabold text-purple-400 uppercase tracking-widest mb-2">Pro</div>
            <div className="flex items-baseline gap-1 mb-1"><span className="text-3xl md:text-5xl font-black">${annual?'16':'21'}</span><span className="text-white/30 text-sm">/mes</span></div>
            {annual&&<div className="text-xs text-white/25 line-through">$21/mes</div>}
            <p className="text-sm text-white/30 mb-6 mt-3">Para inversionistas que gestionan un portafolio real.</p>
            <a href={annual?'https://buy.stripe.com/aFaeVe6PAfro60K8K42ZO04':'https://buy.stripe.com/9B6cN66PA6US1KuaSc2ZO00'} target="_blank" rel="noopener" className="block w-full py-3.5 bg-gradient-to-r from-slate-700 to-slate-600 border border-white/10 rounded-xl text-sm font-bold text-white hover:from-slate-600 hover:to-slate-500 transition-all text-center">Ir a Pro</a>
            <div className="mt-6 pt-5 border-t border-white/5 space-y-3 text-[13px] text-white/40">
              <div className="flex gap-2"><span className="text-purple-400">∞</span>Propiedades ilimitadas</div>
              <div className="flex gap-2"><span className="text-emerald-400">✓</span>Todo de Starter</div>
              <div className="flex gap-2"><span className="text-emerald-400">✓</span>Reportes PDF profesionales</div>
              <div className="flex gap-2"><span className="text-emerald-400">✓</span>Valorización & equity</div>
              <div className="flex gap-2"><span className="text-emerald-400">✓</span>Pipeline de inversión</div>
              <div className="flex gap-2"><span className="text-emerald-400">✓</span>CapEx & reparaciones</div>
              <div className="flex gap-2"><span className="text-emerald-400">✓</span>Vista consolidada portafolio</div>
              <div className="flex gap-2"><span className="text-emerald-400">✓</span>Soporte prioritario</div>
            </div>
          </div>
        </div>
      </div>
    </section>

    {/* FAQ */}
    <section id="faq" className="py-16 px-6">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-2xl font-extrabold text-center mb-10">Preguntas Frecuentes</h2>
        {[
          ['¿Puedo empezar gratis?','Sí. El plan Free es para siempre, sin tarjeta de crédito. Incluye 1 propiedad con dashboard básico y carga de PDFs.'],
          ['¿Qué statements soportan?','PDFs de property managers como IHM, Vacasa, Evolve, y otros formatos estándar de owner statement. El parser extrae todo automáticamente.'],
          ['¿Mis datos están seguros?','Tus datos están encriptados con Firebase/Google Cloud. Solo tú y tus socios invitados tienen acceso. No vendemos datos.'],
          ['¿Puedo cancelar cuando quiera?','Sí, cancela en cualquier momento. Mantienes acceso hasta el fin del periodo pagado. Tus datos pasan al plan Free.'],
          ['¿Qué son ADR, RevPAR, DSCR?','ADR = tarifa promedio por noche. RevPAR = ingreso por noche disponible. DSCR = cobertura de deuda. Son métricas estándar en la industria de inversión inmobiliaria.'],
        ].map(([q,a])=><details key={q} className="border-b border-white/5 group"><summary className="py-5 text-sm font-semibold text-white/60 cursor-pointer hover:text-white transition list-none flex justify-between items-center">{q}<ChevronDown size={16} className="text-white/20 group-open:rotate-180 transition-transform"/></summary><p className="text-sm text-white/30 pb-5 leading-relaxed">{a}</p></details>)}
      </div>
    </section>

    {/* Final CTA */}
    <section className="py-20 px-6 text-center">
      <h2 className="text-3xl md:text-4xl font-extrabold mb-4">Tu propiedad trabaja para ti.<br/>Es hora de que los números también.</h2>
      <p className="text-white/30 mb-8 max-w-md mx-auto">Sube tu primer statement en 30 segundos. Si no te cambia la perspectiva, no has perdido nada.</p>
      <button onClick={()=>onLogin('register')} className="px-10 py-4 bg-gradient-to-r from-blue-600 to-blue-500 text-white text-base font-bold rounded-2xl shadow-2xl shadow-blue-600/30 hover:shadow-blue-600/40 hover:-translate-y-0.5 transition-all">Sube tu primer statement gratis</button>
    </section>

    {/* Footer */}
    <footer className="border-t border-white/5 py-8 px-6 text-center">
      <div className="flex items-center justify-center gap-2 mb-3"><div className="w-7 h-7 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center"><span className="text-[9px] font-black text-white">OD</span></div><span className="text-sm font-bold">Owner<span className="text-blue-400">Desk</span></span></div>
      <p className="text-xs text-white/15">Investment Property Intelligence · © 2026</p>
    </footer>
  </div>;
}

