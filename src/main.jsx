import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'

const BUILD_TS = Date.now();

// Recovery UI — shown for ANY unrecoverable error
function showRecovery(msg) {
  const root = document.getElementById('root');
  if (!root || root.dataset.recovery) return;
  root.dataset.recovery = '1';
  root.innerHTML = `<div style="min-height:100vh;background:#F8FAFC;display:flex;align-items:center;justify-content:center;padding:24px;font-family:system-ui">
    <div style="max-width:420px;text-align:center">
      <div style="width:56px;height:56px;background:#FEE2E2;border-radius:16px;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;font-size:24px">!</div>
      <h2 style="font-size:18px;font-weight:700;color:#1E293B;margin-bottom:8px">Algo salió mal</h2>
      <p style="font-size:14px;color:#64748B;margin-bottom:24px;line-height:1.5">${msg || 'Ocurrió un error. Recarga para continuar.'}</p>
      <button onclick="localStorage.removeItem('od-dark');location.reload()" style="padding:12px 32px;background:#2563EB;color:white;border:none;border-radius:12px;font-weight:700;font-size:14px;cursor:pointer">Recargar</button>
    </div></div>`;
}

// Global error handlers — catch EVERYTHING that React misses
window.onerror = (msg) => { showRecovery(String(msg).slice(0, 200)); return true; };
window.addEventListener('unhandledrejection', e => { e.preventDefault(); showRecovery(String(e.reason?.message || e.reason).slice(0, 200)); });

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error('OwnerDesk:', error, info); }
  render() {
    if (this.state.error) return <div style={{minHeight:'100vh',background:'#F8FAFC',display:'flex',alignItems:'center',justifyContent:'center',padding:24,fontFamily:'system-ui'}}>
      <div style={{maxWidth:420,textAlign:'center'}}>
        <div style={{width:56,height:56,background:'#FEE2E2',borderRadius:16,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px',fontSize:24}}>!</div>
        <h2 style={{fontSize:18,fontWeight:700,color:'#1E293B',marginBottom:8}}>Algo salió mal</h2>
        <p style={{fontSize:14,color:'#64748B',marginBottom:24,lineHeight:1.5}}>Ocurrió un error inesperado.</p>
        <div style={{display:'flex',gap:8,justifyContent:'center'}}>
          <button onClick={()=>window.location.reload()} style={{padding:'10px 24px',background:'#2563EB',color:'white',border:'none',borderRadius:12,fontWeight:700,fontSize:14,cursor:'pointer'}}>Recargar</button>
          <button onClick={()=>this.setState({error:null})} style={{padding:'10px 24px',background:'#F1F5F9',color:'#475569',border:'none',borderRadius:12,fontWeight:700,fontSize:14,cursor:'pointer'}}>Intentar de nuevo</button>
        </div>
        <details style={{marginTop:20,textAlign:'left'}}>
          <summary style={{fontSize:11,color:'#94A3B8',cursor:'pointer'}}>Detalles técnicos</summary>
          <pre style={{fontSize:10,color:'#94A3B8',whiteSpace:'pre-wrap',wordBreak:'break-all',marginTop:8,padding:12,background:'#F1F5F9',borderRadius:8}}>{this.state.error.message}</pre>
        </details>
      </div>
    </div>;
    return this.props.children;
  }
}

import('./App.jsx').then(mod => {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <ErrorBoundary><mod.default /></ErrorBoundary>
  );
}).catch(e => {
  // Import failed — likely stale cached HTML pointing to old JS bundles
  console.error('Import failed:', e);
  showRecovery('La página necesita recargarse. Esto pasa después de una actualización.');
});
