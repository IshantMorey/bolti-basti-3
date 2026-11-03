import React from 'react';
import { Megaphone, LayoutDashboard, Mic, ShieldAlert } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab }) {
  return (
    <header className="navbar">
      <div className="nav-inner">
        <div className="nav-brand">
          <div className="brand-icon">
            <Megaphone size={22} />
          </div>
          <div>
            <div className="brand-title">Bolti Basti <span style={{ color: '#0284c7' }}>बोलती बस्ती</span></div>
            <div className="brand-sub">Voice-First Multilingual Civic Reporting</div>
          </div>
        </div>

        <div className="nav-right">
          <div className="demo-pill">
            <ShieldAlert size={14} />
            <span>Hackathon Demo</span>
          </div>

          <div className="tabs-container">
            <button
              className={`tab-btn ${activeTab === 'report' ? 'active' : ''}`}
              onClick={() => setActiveTab('report')}
            >
              <Mic size={16} />
              <span>Report Issue</span>
            </button>
            <button
              className={`tab-btn ${activeTab === 'admin' ? 'active' : ''}`}
              onClick={() => setActiveTab('admin')}
            >
              <LayoutDashboard size={16} />
              <span>Admin Portal</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
