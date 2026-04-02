import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error('OwnerDesk Error:', error, info); }
  render() {
    if (this.state.error) return <div style={{minHeight:'100vh',background:'#F8FAFC',display:'flex',alignItems:'center',justifyContent:'center',padding:24,fontFamily:'system-ui'}}>
      <div style={{maxWidth:420,textAlign:'center'}}>
        <div style={{width:56,height:56,background:'#FEE2E2',borderRadius:16,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px',fontSize:24}}>!</div>
        <h2 style={{fontSize:18,fontWeight:700,color:'#1E293B',marginBottom:8}}>Algo salió mal</h2>
        <p style={{fontSize:14,color:'#64748B',marginBottom:24,lineHeight:1.5}}>Ocurrió un error inesperado. Esto puede pasar por datos incompletos o una actualización pendiente.</p>
        <div style={{display:'flex',gap:8,justifyContent:'center'}}>
          <button onClick={()=>window.location.reload()} style={{padding:'10px 24px',background:'#2563EB',color:'white',border:'none',borderRadius:12,fontWeight:700,fontSize:14,cursor:'pointer'}}>Recargar</button>
          <button onClick={()=>this.setState({error:null})} style={{padding:'10px 24px',background:'#F1F5F9',color:'#475569',border:'none',borderRadius:12,fontWeight:700,fontSize:14,cursor:'pointer'}}>Intentar de nuevo</button>
        </div>
        <details style={{marginTop:20,textAlign:'left'}}>
          <summary style={{fontSize:11,color:'#94A3B8',cursor:'pointer'}}>Detalles técnicos</summary>
          <pre style={{fontSize:10,color:'#94A3B8',whiteSpace:'pre-wrap',wordBreak:'break-all',marginTop:8,padding:12,background:'#F1F5F9',borderRadius:8}}>{this.state.error.message}{'\n'}{this.state.error.stack}</pre>
        </details>
      </div>
    </div>;
    return this.props.children;
  }
}

import('./App.jsx').then(mod => {
  const App = mod.default;
  ReactDOM.createRoot(document.getElementById('root')).render(
    <ErrorBoundary><App /></ErrorBoundary>
  );
}).catch(e => {
  document.getElementById('root').innerHTML = '<div style="padding:40px;text-align:center;font-family:system-ui"><h2>Error cargando OwnerDesk</h2><p style="color:#64748B">Recarga la página (Ctrl+Shift+R)</p><button onclick="location.reload()" style="margin-top:16px;padding:10px 24px;background:#2563EB;color:white;border:none;border-radius:12px;font-weight:700;cursor:pointer">Recargar</button></div>';
});
