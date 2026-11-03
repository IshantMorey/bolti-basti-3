import React from 'react';
import { AlertCircle, Clock, CheckCircle2, Inbox } from 'lucide-react';

export default function StatsOverview({ stats }) {
  if (!stats) return null;

  return (
    <div className="stats-grid">
      <div className="stat-card">
        <div className="stat-header">
          <span>Total Complaints</span>
          <Inbox size={18} color="#0284c7" />
        </div>
        <div className="stat-number">{stats.total || 0}</div>
      </div>

      <div className="stat-card">
        <div className="stat-header">
          <span>Pending Review</span>
          <AlertCircle size={18} color="#d97706" />
        </div>
        <div className="stat-number" style={{ color: '#d97706' }}>{stats.pending || 0}</div>
      </div>

      <div className="stat-card">
        <div className="stat-header">
          <span>In Progress</span>
          <Clock size={18} color="#0284c7" />
        </div>
        <div className="stat-number" style={{ color: '#0284c7' }}>{stats.inProgress || 0}</div>
      </div>

      <div className="stat-card">
        <div className="stat-header">
          <span>Resolved</span>
          <CheckCircle2 size={18} color="#10b981" />
        </div>
        <div className="stat-number" style={{ color: '#10b981' }}>{stats.resolved || 0}</div>
      </div>
    </div>
  );
}
