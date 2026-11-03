import React, { useState } from 'react';
import Navbar from './components/Navbar';
import LanguageSelector from './components/LanguageSelector';
import VoiceRecorder from './components/VoiceRecorder';
import ComplaintForm from './components/ComplaintForm';
import ComplaintConfirmation from './components/ComplaintConfirmation';
import AdminDashboard from './components/AdminDashboard';
import { Volume2, Sparkles, ShieldCheck } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('report'); // 'report' | 'admin'
  const [selectedLang, setSelectedLang] = useState('hi-IN'); // 'mr-IN' | 'hi-IN' | 'en-IN'
  const [complaintStep, setComplaintStep] = useState('record'); // 'record' | 'edit' | 'confirmation'
  const [extractedData, setExtractedData] = useState(null);
  const [submissionResult, setSubmissionResult] = useState(null);

  const handleExtractionComplete = (data) => {
    setExtractedData(data);
    setComplaintStep('edit');
  };

  const handleResetToRecord = () => {
    setExtractedData(null);
    setSubmissionResult(null);
    setComplaintStep('record');
  };

  const handleSubmitSuccess = (result) => {
    setSubmissionResult(result);
    setComplaintStep('confirmation');
  };

  const handleViewInAdmin = () => {
    setActiveTab('admin');
  };

  return (
    <div className="app-container">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="main-content">
        {activeTab === 'report' ? (
          <>
            {/* Hero Banner */}
            <section className="hero-card">
              <div className="hero-content">
                <div className="hero-badge">
                  <Sparkles size={14} />
                  <span>Powered by Sarvam AI (Saaras V4 • 105B • Bulbul V4 Flash)</span>
                </div>
                <h1 className="hero-title">
                  आपकी आवाज़, बस्ती का समाधान
                </h1>
                <p className="hero-desc">
                  Report civic problems (potholes, garbage, water leaks, streetlights) in Marathi, Hindi, or English by simply speaking.
                </p>

                {/* Language Selector */}
                {complaintStep === 'record' && (
                  <LanguageSelector
                    selectedLang={selectedLang}
                    onSelectLang={setSelectedLang}
                  />
                )}
              </div>
            </section>

            {/* Step Content */}
            {complaintStep === 'record' && (
              <VoiceRecorder
                selectedLang={selectedLang}
                onExtractionComplete={handleExtractionComplete}
              />
            )}

            {complaintStep === 'edit' && extractedData && (
              <ComplaintForm
                extractedData={extractedData}
                onReset={handleResetToRecord}
                onSubmitSuccess={handleSubmitSuccess}
              />
            )}

            {complaintStep === 'confirmation' && submissionResult && (
              <ComplaintConfirmation
                submissionResult={submissionResult}
                onNewComplaint={handleResetToRecord}
                onViewInAdmin={handleViewInAdmin}
              />
            )}
          </>
        ) : (
          <AdminDashboard />
        )}
      </main>

      {/* Footer */}
      <footer style={{ background: '#ffffff', borderTop: '1px solid #e2e8f0', padding: '24px 16px', textAlign: 'center', fontSize: '0.82rem', color: '#64748b' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: '#0f172a' }}>
            <ShieldCheck size={16} color="#0284c7" />
            <span>Bolti Basti (बोलती बस्ती) — Multilingual Voice-First Civic Reporting Platform</span>
          </div>
          <p>
            Built for Hackathon Demonstration. Tickets generated are simulated demo tickets for civic impact research and are not official municipal filings.
          </p>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
            Speech recognition by Sarvam Saaras V4 • Information extraction by Sarvam-105B • Spoken audio by Sarvam Bulbul V4 Flash
          </div>
        </div>
      </footer>
    </div>
  );
}
