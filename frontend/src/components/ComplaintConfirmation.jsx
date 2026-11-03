import React, { useState, useRef, useEffect } from 'react';
import { CheckCircle, Play, Pause, Volume2, PlusCircle, ArrowRight, ShieldAlert, Sparkles } from 'lucide-react';

export default function ComplaintConfirmation({ submissionResult, onNewComplaint, onViewInAdmin }) {
  const { complaint, spokenConfirmation } = submissionResult;
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);

  // Auto-play TTS audio when available
  useEffect(() => {
    if (spokenConfirmation?.audioBase64) {
      const audioSrc = `data:audio/mp3;base64,${spokenConfirmation.audioBase64}`;
      const audio = new Audio(audioSrc);
      audioRef.current = audio;

      audio.onended = () => setIsPlaying(false);
      audio.onerror = () => setIsPlaying(false);

      audio.play().then(() => {
        setIsPlaying(true);
      }).catch((e) => {
        console.log('Autoplay was prevented by browser policy:', e);
      });

      return () => {
        audio.pause();
        audio.src = '';
      };
    }
  }, [spokenConfirmation]);

  const toggleAudio = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(console.error);
    }
  };

  return (
    <div className="confirmation-card">
      <div style={{ display: 'inline-flex', padding: '14px', background: '#dcfce7', borderRadius: '50%', color: '#16a34a', marginBottom: '12px' }}>
        <CheckCircle size={48} />
      </div>

      <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#064e3b', marginBottom: '6px' }}>
        Complaint Recorded Successfully!
      </h2>
      <p style={{ color: '#047857', fontSize: '0.95rem' }}>
        Your voice grievance has been digitized and logged into the Bolti Basti system.
      </p>

      {/* Ticket Pill */}
      <div>
        <div className="ticket-pill">
          <span>Ticket ID:</span>
          <span>{complaint?.ticket_id}</span>
        </div>
      </div>

      {/* Spoken Voice Confirmation Box (Bulbul V4 Flash) */}
      {spokenConfirmation?.audioBase64 && (
        <div className="audio-card">
          <button
            type="button"
            className="play-circle"
            onClick={toggleAudio}
            title={isPlaying ? 'Pause spoken confirmation' : 'Play spoken confirmation'}
          >
            {isPlaying ? <Pause size={20} /> : <Play size={20} style={{ marginLeft: 3 }} />}
          </button>
          <div style={{ textAlign: 'left', flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: '#0284c7', fontWeight: 700 }}>
              <Sparkles size={14} />
              <span>Voice Confirmation (Sarvam Bulbul V4 Flash)</span>
            </div>
            <div style={{ fontSize: '0.88rem', color: '#1e293b', marginTop: '2px', fontStyle: 'italic' }}>
              "{spokenConfirmation.text}"
            </div>
          </div>
        </div>
      )}

      {/* Complaint Quick Summary */}
      <div style={{ background: '#ffffff', border: '1px solid #bbf7d0', borderRadius: '14px', padding: '18px', maxWidth: '600px', margin: '20px auto', textAlign: 'left', fontSize: '0.88rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
          <div>
            <span style={{ color: '#64748b', fontWeight: 600 }}>Category: </span>
            <strong>{complaint?.category}</strong>
          </div>
          <div>
            <span style={{ color: '#64748b', fontWeight: 600 }}>Urgency: </span>
            <span className={`badge urgency-${(complaint?.urgency || 'medium').toLowerCase()}`}>
              {complaint?.urgency}
            </span>
          </div>
          <div>
            <span style={{ color: '#64748b', fontWeight: 600 }}>Locality: </span>
            <strong>{complaint?.locality || 'Not specified'}</strong>
          </div>
          <div>
            <span style={{ color: '#64748b', fontWeight: 600 }}>Status: </span>
            <span className="badge pending">{complaint?.status}</span>
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <span style={{ color: '#64748b', fontWeight: 600 }}>Description: </span>
            <span>{complaint?.description}</span>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#92400e', background: '#fef3c7', padding: '6px 14px', borderRadius: '9999px', fontSize: '0.78rem', fontWeight: 600, border: '1px solid #fde68a', marginBottom: '24px' }}>
        <ShieldAlert size={14} />
        <span>Demo Ticket: This is a hackathon innovation prototype, not an official municipal submission.</span>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px', flexWrap: 'wrap' }}>
        <button
          type="button"
          className="btn-primary"
          onClick={onNewComplaint}
        >
          <PlusCircle size={18} />
          <span>Report Another Issue</span>
        </button>

        <button
          type="button"
          className="btn-secondary"
          onClick={onViewInAdmin}
        >
          <span>View in Admin Dashboard</span>
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}
