import React, { useState, useEffect } from 'react';
import { Search, Filter, RefreshCw, AlertCircle, Volume2, Check, Clock } from 'lucide-react';
import StatsOverview from './StatsOverview';
import { getComplaints, getComplaintStats, updateComplaintStatus } from '../services/api';

export default function AdminDashboard() {
  const [complaints, setComplaints] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [updatingId, setUpdatingId] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [fetchedComplaints, fetchedStats] = await Promise.all([
        getComplaints({
          status: statusFilter,
          category: categoryFilter,
          search: searchTerm
        }),
        getComplaintStats()
      ]);
      setComplaints(fetchedComplaints);
      setStats(fetchedStats);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setError(err.message || 'Failed to load complaints');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter, categoryFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadData();
  };

  const handleStatusChange = async (id, newStatus) => {
    setUpdatingId(id);
    try {
      await updateComplaintStatus(id, newStatus);
      // Refresh list & stats
      await loadData();
    } catch (err) {
      alert(`Failed to update status: ${err.message}`);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div>
      {/* Header bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800 }}>Admin Civic Dashboard</h2>
          <p style={{ color: '#64748b', fontSize: '0.88rem' }}>
            Monitor, prioritize, and update status of citizen complaints.
          </p>
        </div>

        <button
          type="button"
          className="btn-secondary"
          onClick={loadData}
          disabled={loading}
          style={{ fontSize: '0.85rem', padding: '8px 16px' }}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Stats Cards */}
      <StatsOverview stats={stats} />

      {/* Filter and Search Bar */}
      <div className="card" style={{ padding: '18px', marginBottom: '20px' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: '1 1 250px', position: 'relative' }}>
            <input
              type="text"
              className="form-input"
              placeholder="Search by Ticket ID, locality, or keyword..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '38px' }}
            />
            <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <select
              className="form-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ width: 'auto' }}
            >
              <option value="All">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
            </select>

            <select
              className="form-select"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={{ width: 'auto' }}
            >
              <option value="All">All Categories</option>
              <option value="Roads & Potholes">Roads & Potholes</option>
              <option value="Water Supply">Water Supply</option>
              <option value="Electricity & Streetlights">Electricity & Streetlights</option>
              <option value="Garbage & Sanitation">Garbage & Sanitation</option>
              <option value="Drainage & Sewage">Drainage & Sewage</option>
              <option value="Others">Others</option>
            </select>

            <button type="submit" className="btn-primary" style={{ padding: '10px 18px', fontSize: '0.88rem' }}>
              Search
            </button>
          </div>
        </form>
      </div>

      {/* Error state */}
      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '14px', borderRadius: '12px', marginBottom: '20px' }}>
          ⚠️ {error}
        </div>
      )}

      {/* Complaints Table */}
      <div className="table-wrapper">
        <div className="table-header-bar">
          <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>
            Complaints List ({complaints.length})
          </span>
          <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
            Sorted by newest first
          </span>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
            <div className="wave-animation" style={{ justifyContent: 'center' }}>
              <div className="wave-bar"></div>
              <div className="wave-bar"></div>
              <div className="wave-bar"></div>
            </div>
            <p style={{ marginTop: '12px' }}>Loading complaints from SQLite...</p>
          </div>
        ) : complaints.length === 0 ? (
          <div style={{ padding: '48px 20px', textAlign: 'center', color: '#94a3b8' }}>
            <AlertCircle size={36} style={{ margin: '0 auto 12px auto', display: 'block', opacity: 0.5 }} />
            <h4 style={{ fontSize: '1.1rem', color: '#475569', marginBottom: '4px' }}>No complaints found</h4>
            <p style={{ fontSize: '0.85rem' }}>Try clearing filters or report a new issue using the citizen voice recorder.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="complaint-table">
              <thead>
                <tr>
                  <th>Ticket ID</th>
                  <th>Category</th>
                  <th>Description & Locality</th>
                  <th>Urgency</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {complaints.map((item) => {
                  const statusClass = item.status === 'Resolved' ? 'resolved' : item.status === 'In Progress' ? 'in-progress' : 'pending';
                  const urgencyClass = (item.urgency || 'Medium').toLowerCase();

                  return (
                    <tr key={item.id}>
                      <td style={{ fontWeight: 800, color: '#0284c7', whiteSpace: 'nowrap' }}>
                        {item.ticket_id}
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <span style={{ fontWeight: 600 }}>{item.category}</span>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          Lang: {item.language || 'unknown'}
                        </div>
                      </td>
                      <td style={{ minWidth: '260px' }}>
                        <div style={{ fontWeight: 600, color: '#0f172a', marginBottom: '2px' }}>
                          {item.description}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                          📍 {item.locality || 'Locality not specified'}
                          {item.landmark && item.landmark !== 'Not specified' ? ` (Near: ${item.landmark})` : ''}
                          {item.duration && item.duration !== 'Not specified' ? ` • Persisting: ${item.duration}` : ''}
                        </div>
                      </td>
                      <td>
                        <span className={`badge urgency-${urgencyClass}`}>
                          {item.urgency || 'Medium'}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${statusClass}`}>
                          {item.status}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.78rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                        {new Date(item.created_at).toLocaleDateString()} {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td>
                        <select
                          className="form-select"
                          value={item.status}
                          disabled={updatingId === item.id}
                          onChange={(e) => handleStatusChange(item.id, e.target.value)}
                          style={{ padding: '6px 10px', fontSize: '0.8rem', width: 'auto' }}
                        >
                          <option value="Pending">Pending</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Resolved">Resolved</option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
