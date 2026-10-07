import React, { useState, useEffect } from 'react';
import { Lock, FileText, Download, Play, RefreshCw, BarChart2, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

const API_BASE = 'http://16.4.52.74:3001/api';
const API_KEY = 'secret-demo-key';
const fetchOpts = { headers: { 'x-api-key': API_KEY } };

const formatCurrency = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
const formatNumber = (val) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(val);

export default function App() {
  const [metrics, setMetrics] = useState(null);
  const [files, setFiles] = useState([]);
  const [jobStatus, setJobStatus] = useState('IDLE');
  const [loading, setLoading] = useState(true);

  const fetchInitialData = async () => {
    try {
      const mRes = await fetch(`${API_BASE}/metrics`, fetchOpts);
      if (mRes.ok) {
        const data = await mRes.json();
        setMetrics(data);
      }
      const fRes = await fetch(`${API_BASE}/files`, fetchOpts);
      if (fRes.ok) {
        const fdata = await fRes.json();
        setFiles(fdata.files);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
    
    const sse = new EventSource(`${API_BASE}/lifecycle/stream?key=${API_KEY}`);
    sse.onmessage = (e) => {
      try {
        const state = JSON.parse(e.data);
        if (state.status) {
          setJobStatus(state.status);
          if (state.status.includes('TERMINATED')) {
             // Refresh data when job finishes
             fetchInitialData();
          }
        }
      } catch (err) {}
    };
    return () => sse.close();
  }, []);

  const triggerRun = async () => {
    setJobStatus('TRIGGERED');
    await fetch(`${API_BASE}/trigger`, { method: 'POST', ...fetchOpts });
  };

  const currentStep = () => {
    if (jobStatus.includes('TRIGGERED')) return 1;
    if (jobStatus.includes('PROVISIONING')) return 2;
    if (jobStatus.includes('MAPPING')) return 3;
    if (jobStatus.includes('REDUCING')) return 4;
    if (jobStatus.includes('WRITING')) return 5;
    if (jobStatus.includes('TERMINATED')) return 6;
    return 6; // default idle finished state
  };
  
  const stepNum = currentStep();

  const totalSales = metrics ? Object.values(metrics.sales_per_region).reduce((a,b)=>a+b,0) : 0;
  const topRegion = metrics ? metrics.ranked_regions_by_sales[0] : null;

  return (
    <div className="dashboard-container">
      <header style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem'}}>
        <div>
          <h1 style={{marginBottom: '0.25rem'}}>MarketMetrics</h1>
          <div style={{color: 'var(--color-text-secondary)'}}>Retail Sales Analytics Platform</div>
        </div>
        <button className="btn" onClick={triggerRun} style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
          <Play size={16} /> Run New Analysis
        </button>
      </header>

      {/* KPI Strip */}
      <div className="kpi-strip">
        <div className="kpi-card">
          <div className="kpi-title">Total Revenue</div>
          <div className="kpi-value">{formatCurrency(totalSales)}</div>
          <div className="kpi-subtext">Trailing 90 Days</div>
        </div>
        <div className="kpi-card highlight">
          <div className="kpi-title">Top Region</div>
          <div className="kpi-value">{topRegion ? topRegion.region : '-'}</div>
          <div className="kpi-subtext">{topRegion ? formatCurrency(topRegion.sales) : '-'}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-title">Current Job Status</div>
          <div className="kpi-value" style={{fontSize: '1.5rem', marginTop: '1rem', color: jobStatus.includes('TERMINATED') ? 'var(--color-primary)' : 'var(--color-highlight)'}}>{jobStatus.split(':')[0]}</div>
          <div className="kpi-subtext">Last updated: {new Date().toLocaleTimeString()}</div>
        </div>
      </div>

      {/* Pipeline Stepper */}
      <div className="stepper-container">
        <h3 style={{marginTop: 0, marginBottom: '1.5rem', fontSize: '1.1rem', color: 'var(--color-text-secondary)'}}>Pipeline Lifecycle</h3>
        <div className="stepper">
          {['Upload', 'Provision', 'Map', 'Reduce', 'Write', 'Complete'].map((label, i) => {
            const num = i + 1;
            const active = stepNum === num;
            const completed = stepNum > num;
            return (
              <div key={label} className={`step ${active ? 'active' : ''} ${completed ? 'completed' : ''}`}>
                <div className="step-indicator">{active ? <RefreshCw size={14} className="spin" /> : num}</div>
                <div>{label}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="main-content">
        <div className="charts-area">
          <div className="panel">
            <h3>Regional Performance</h3>
            <div style={{height: 300}}>
              {metrics && (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metrics.ranked_regions_by_sales}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="region" />
                    <YAxis tickFormatter={(val) => `$${val / 1000000}M`} />
                    <Tooltip formatter={(val) => formatCurrency(val)} />
                    <Bar dataKey="sales" fill="var(--color-primary)" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
          <div className="panel">
            <h3>Category Breakdown</h3>
             <div style={{height: 300}}>
              {metrics && (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={Object.entries(metrics.sales_per_category).map(([name, val]) => ({name, val})).sort((a,b)=>b.val-a.val)}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={(val) => `$${val / 1000000}M`} />
                    <Tooltip formatter={(val) => formatCurrency(val)} />
                    <Bar dataKey="val" fill="var(--color-text-secondary)" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        <div className="sidebar">
          <div className="panel">
            <h3>Secure Reports</h3>
            <table className="file-list">
              <thead>
                <tr>
                  <th>File</th>
                  <th>Size</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {files.map(f => (
                  <tr key={f.name}>
                    <td>
                       <div style={{display:'flex', alignItems:'center', gap:'0.5rem'}}>
                         <FileText size={16} />
                         {f.name}
                       </div>
                    </td>
                    <td>{(f.size / 1024).toFixed(1)} KB</td>
                    <td>
                      {f.encrypted ? <Lock size={16} color="var(--color-primary)" title="SSE Encrypted" /> : <span style={{color: 'var(--color-text-secondary)'}}>Raw</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
           <div className="panel" style={{background: 'var(--color-highlight)', color: 'white'}}>
            <h3 style={{color: 'white', borderBottomColor: 'rgba(255,255,255,0.2)'}}>Next Day Forecast (West)</h3>
            <div style={{fontFamily: 'var(--font-hero)', fontSize: '2.5rem', fontWeight: 700}}>
               {metrics ? formatCurrency(metrics.forecasts?.region_next_day_forecast?.West) : '-'}
            </div>
            <div style={{opacity: 0.9, marginTop: '0.5rem'}}>7-day moving average</div>
          </div>
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}} />
    </div>
  );
}
