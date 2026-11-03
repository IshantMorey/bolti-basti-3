import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Upload, Loader2, Sparkles, Volume2 } from 'lucide-react';
import { transcribeAudio, extractComplaint } from '../services/api';

const PROMPTS = {
  'mr-IN': {
    title: 'आपल्या प्रभागातील समस्या बोला',
    desc: 'उदा. "आमच्या गल्लीत शिवाजी चौकाजवळ गेल्या तीन दिवसांपासून कचरा साचला आहे आणि दुर्गंधी पसरली आहे."',
    recordStart: 'माईकवर टॅप करून बोला',
    recordStop: 'थांबवण्यासाठी टॅप करा',
    uploadHint: 'किंवा ऑडिओ फाईल अपलोड करा (.webm, .wav, .mp3)',
    transcribing: 'सार्वम सारस V4 द्वारे आवाज रूपांतरित होत आहे...',
    extracting: 'सार्वम-105B द्वारे तक्रारीचे तपशील काढले जात आहेत...'
  },
  'hi-IN': {
    title: 'अपनी बस्ती की समस्या बोलकर बताएं',
    desc: 'उदा. "हमारे शांति नगर में पानी की पाइपलाइन टूट गई है और कल से गंदा पानी आ रहा है।"',
    recordStart: 'माइक दबाकर बोलना शुरू करें',
    recordStop: 'रोकने के लिए टैप करें',
    uploadHint: 'या ऑडियो फ़ाइल अपलोड करें (.webm, .wav, .mp3)',
    transcribing: 'सर्वम सारस V4 द्वारा आवाज़ पहचानी जा रही है...',
    extracting: 'सर्वम-105B द्वारा शिकायत के विवरण निकाले जा रहे हैं...'
  },
  'en-IN': {
    title: 'Speak your civic grievance',
    desc: 'e.g. "There is a severe drainage overflow near Gandhi Garden in Sector 4 persisting for 2 days."',
    recordStart: 'Tap to start speaking',
    recordStop: 'Tap to stop recording',
    uploadHint: 'Or upload an audio file (.webm, .wav, .mp3)',
    transcribing: 'Transcribing speech with Sarvam Saaras V4...',
    extracting: 'Extracting complaint details with Sarvam-105B...'
  }
};

export default function VoiceRecorder({ selectedLang, onExtractionComplete }) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [processingStep, setProcessingStep] = useState(null); // 'transcribing' | 'extracting' | null
  const [error, setError] = useState(null);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerIntervalRef = useRef(null);
  const fileInputRef = useRef(null);

  const prompt = PROMPTS[selectedLang] || PROMPTS['hi-IN'];

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const startRecording = async () => {
    setError(null);
    setAudioBlob(null);
    setAudioUrl(null);
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const options = MediaRecorder.isTypeSupported('audio/webm') ? { mimeType: 'audio/webm' } : {};
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const mime = mediaRecorder.mimeType || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: mime });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);

        // Stop all tracks to release microphone
        stream.getTracks().forEach((track) => track.stop());

        // Process audio immediately
        processVoiceData(blob);
      };

      mediaRecorder.start(250); // collect in 250ms chunks
      setIsRecording(true);
      setRecordingSeconds(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Microphone access denied:', err);
      setError('Microphone access was denied or is not supported. Please allow microphone access or upload an audio recording file below.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerIntervalRef.current);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setAudioBlob(file);
    const url = URL.createObjectURL(file);
    setAudioUrl(url);
    processVoiceData(file);
  };

  const processVoiceData = async (blob) => {
    try {
      // Step 1: Transcribe using Sarvam Saaras V4
      setProcessingStep('transcribing');
      const sttResult = await transcribeAudio(blob, selectedLang);

      if (!sttResult.transcript || sttResult.transcript.trim() === '') {
        throw new Error('No clear speech was detected. Please speak closer to the microphone and try again.');
      }

      // Step 2: Extract structured fields using Sarvam-105B
      setProcessingStep('extracting');
      const extracted = await extractComplaint(sttResult.transcript, selectedLang);

      setProcessingStep(null);
      onExtractionComplete({
        ...extracted,
        original_transcript: sttResult.transcript,
        language: selectedLang
      });
    } catch (err) {
      console.error('Voice processing pipeline error:', err);
      setError(err.message || 'Failed to process voice complaint. Please try again.');
      setProcessingStep(null);
    }
  };

  const formatTimer = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="card">
      <div className="recorder-box">
        <h3 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '6px' }}>
          {prompt.title}
        </h3>
        <p style={{ color: '#64748b', fontSize: '0.92rem', maxWidth: '620px', marginBottom: '28px' }}>
          {prompt.desc}
        </p>

        {/* Microphone Button */}
        <div className="mic-wrapper">
          <button
            type="button"
            className={`mic-circle ${isRecording ? 'recording' : ''}`}
            onClick={isRecording ? stopRecording : startRecording}
            disabled={processingStep !== null}
            title={isRecording ? prompt.recordStop : prompt.recordStart}
          >
            {isRecording ? <Square size={36} /> : <Mic size={42} />}
          </button>
        </div>

        {/* Recording Timer & Visualizer */}
        {isRecording && (
          <div>
            <div className="recording-timer">{formatTimer(recordingSeconds)}</div>
            <div className="status-badge listening">
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#dc2626', display: 'inline-block' }}></span>
              Recording... Tap red square to finish
            </div>
            <div className="wave-animation">
              <div className="wave-bar"></div>
              <div className="wave-bar"></div>
              <div className="wave-bar"></div>
              <div className="wave-bar"></div>
              <div className="wave-bar"></div>
              <div className="wave-bar"></div>
            </div>
          </div>
        )}

        {/* Processing State */}
        {processingStep && (
          <div style={{ marginTop: '14px' }}>
            <div className="status-badge processing">
              <Loader2 className="animate-spin" size={16} />
              <span>{processingStep === 'transcribing' ? prompt.transcribing : prompt.extracting}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#0369a1', fontSize: '0.85rem', marginTop: '6px' }}>
              <Sparkles size={16} />
              <span>
                {processingStep === 'transcribing' ? 'Sarvam Saaras V4 (Multilingual STT)' : 'Sarvam-105B (Civic Parser)'}
              </span>
            </div>
          </div>
        )}

        {/* Audio Preview if available */}
        {audioUrl && !isRecording && !processingStep && (
          <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Volume2 size={18} color="#0284c7" />
            <audio controls src={audioUrl} style={{ height: '36px' }} />
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '12px 18px', borderRadius: '12px', fontSize: '0.88rem', marginTop: '20px', maxWidth: '580px' }}>
            ⚠️ {error}
          </div>
        )}

        {/* File Upload Fallback */}
        <div style={{ marginTop: '28px', paddingTop: '20px', borderTop: '1px dashed #e2e8f0', width: '100%', maxWidth: '500px' }}>
          <input
            type="file"
            accept="audio/*"
            ref={fileInputRef}
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />
          <button
            type="button"
            className="btn-secondary"
            onClick={() => fileInputRef.current?.click()}
            disabled={isRecording || processingStep !== null}
            style={{ fontSize: '0.82rem', padding: '8px 16px' }}
          >
            <Upload size={14} />
            <span>{prompt.uploadHint}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
