import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'

// Global error handler — show errors on screen instead of blank page
const showErr = (title, msg, stack) => {
  const r = document.getElementById('root');
  if(r) r.innerHTML = `<div style="padding:40px;font-family:monospace;background:#0F172A;color:#F87171;min-height:100vh"><h2 style="color:#fff;margin-bottom:16px">${title}</h2><pre style="white-space:pre-wrap;font-size:13px;word-break:break-all">${msg}\n\n${stack||''}</pre></div>`;
};
window.onerror = (msg, src, line, col, err) => showErr('Runtime Error', msg, `${src}:${line}:${col}\n${err?.stack||''}`);
window.addEventListener('unhandledrejection', e => showErr('Async Error', e.reason?.message||String(e.reason), e.reason?.stack||''));

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (this.state.error) return <div style={{padding:40,fontFamily:'monospace',background:'#0F172A',color:'#F87171',minHeight:'100vh'}}>
      <h2 style={{color:'#fff',marginBottom:16}}>Component Error</h2>
      <pre style={{whiteSpace:'pre-wrap',fontSize:13,wordBreak:'break-all'}}>{this.state.error.message}{'\n\n'}{this.state.error.stack}</pre>
    </div>;
    return this.props.children;
  }
}

import('./App.jsx').then(mod => {
  const App = mod.default;
  ReactDOM.createRoot(document.getElementById('root')).render(
    <ErrorBoundary><App /></ErrorBoundary>
  );
}).catch(e => showErr('Import Error', e.message, e.stack));
