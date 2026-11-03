import React, { useState } from 'react';
import { Send, RotateCcw, AlertTriangle, FileText, CheckCircle2, Loader2 } from 'lucide-react';
import { submitComplaint } from '../services/api';

const CATEGORIES = [
  'Roads & Potholes',
  'Water Supply',
  'Electricity & Streetlights',
  'Garbage & Sanitation',
  'Drainage & Sewage',
  'Public Transport',
  'Parks & Public Spaces',
  'Others'
];

export default function ComplaintForm({ extractedData, onReset, onSubmitSuccess }) {
  const [formData, setFormData] = useState({
    category: extractedData.category || 'Roads & Potholes',
    description: extractedData.description || '',
    locality: extractedData.locality || '',
    landmark: extractedData.landmark || '',
    duration: extractedData.duration || '',
    urgency: extractedData.urgency || 'Medium',
    original_transcript: extractedData.original_transcript || '',
    language: extractedData.language || 'hi-IN'
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [showTranscript, setShowTranscript] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await submitComplaint(formData);
      setIsSubmitting(false);
      onSubmitSuccess(response);
    } catch (err) {
      console.error('Complaint submission error:', err);
      setError(err.message || 'Failed to submit complaint. Please check connection and try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <span className="badge resolved" style={{ marginBottom: '6px' }}>
            <CheckCircle2 size={13} />
            Extracted by Sarvam-105B
          </span>
          <h3 style={{ fontSize: '1.4rem', fontWeight: 800 }}>
            Review & Edit Your Complaint
          </h3>
          <p style={{ color: '#64748b', fontSize: '0.88rem' }}>
            Verify extracted details before submission. You can adjust any field.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowTranscript(!showTranscript)}
          className="btn-secondary"
          style={{ fontSize: '0.82rem', padding: '8px 14px' }}
        >
          <FileText size={14} />
          <span>{showTranscript ? 'Hide Raw Audio Transcript' : 'View Raw Audio Transcript'}</span>
        </button>
      </div>

      {/* Transcript collapsible box */}
      {showTranscript && (
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px 16px', marginBottom: '20px' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
            Recognized Voice Transcript (Saaras V4):
          </div>
          <p style={{ fontStyle: 'italic', color: '#1e293b', fontSize: '0.95rem' }}>
            "{formData.original_transcript}"
          </p>
        </div>
      )}

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '12px 16px', borderRadius: '10px', fontSize: '0.88rem', marginBottom: '16px' }}>
          ⚠️ {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          {/* Category */}
          <div className="form-group">
            <label className="form-label">Complaint Category *</label>
            <select
              name="category"
              className="form-select"
              value={formData.category}
              onChange={handleChange}
              required
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Urgency */}
          <div className="form-group">
            <label className="form-label">Urgency Level *</label>
            <select
              name="urgency"
              className="form-select"
              value={formData.urgency}
              onChange={handleChange}
              required
            >
              <option value="High">🔴 High (Safety risk / complete outage)</option>
              <option value="Medium">🟡 Medium (Disruption in daily life)</option>
              <option value="Low">🟢 Low (Minor issue / maintenance)</option>
            </select>
          </div>

          {/* Description */}
          <div className="form-group full-col">
            <label className="form-label">Grievance Description *</label>
            <textarea
              name="description"
              className="form-textarea"
              rows={3}
              value={formData.description}
              onChange={handleChange}
              placeholder="Describe the problem clearly..."
              required
            />
          </div>

          {/* Locality */}
          <div className="form-group">
            <label className="form-label">Locality / Colony / Ward</label>
            <input
              type="text"
              name="locality"
              className="form-input"
              value={formData.locality}
              onChange={handleChange}
              placeholder="e.g. Shivaji Nagar, Ward 12"
            />
          </div>

          {/* Landmark */}
          <div className="form-group">
            <label className="form-label">Nearest Landmark</label>
            <input
              type="text"
              name="landmark"
              className="form-input"
              value={formData.landmark}
              onChange={handleChange}
              placeholder="e.g. Near Water Tank, Opp. Primary School"
            />
          </div>

          {/* Duration */}
          <div className="form-group full-col">
            <label className="form-label">How long has this issue persisted?</label>
            <input
              type="text"
              name="duration"
              className="form-input"
              value={formData.duration}
              onChange={handleChange}
              placeholder="e.g. 2 days, since last night, 1 week"
            />
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '28px', gap: '12px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={onReset}
            disabled={isSubmitting}
          >
            <RotateCcw size={16} />
            <span>Re-record Voice</span>
          </button>

          <button
            type="submit"
            className="btn-primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                <span>Generating Ticket & Audio...</span>
              </>
            ) : (
              <>
                <Send size={18} />
                <span>Submit Complaint & Get Spoken Confirmation</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
