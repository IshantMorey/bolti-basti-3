import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Upload, Loader2, Sparkles, Volume2, AlertTriangle, CheckCircle2, Sliders, Play, RotateCcw } from 'lucide-react';
import { WavAudioRecorder } from '../utils/audioRecorder';
import { transcribeAudio, extractComplaint } from '../services/api';

const PROMPTS = {
  'mr-IN': {
    title: 'आपल्या प्रभागातील समस्या बोला',
    desc: 'उदा. "आमच्या गल्लीत शिवाजी चौकाजवळ गेल्या तीन दिवसांपासून कचरा साचला आहे आणि दुर्गंधी पसरली आहे."',
    recordStart: 'माईकवर टॅप करून बोला',
    recordStop: 'थांबवण्यासाठी टॅप करा',
    uploadHint: 'किंवा ऑडिओ फाईल अपलोड करा (.wav, .mp3, .webm)',
    transcribing: 'सार्वम सारस V4 द्वारे आवाज रूपांतरित होत आहे...',
    extracting: 'सार्वम-105B द्वारे तक्रारीचे तपशील काढले जात आहेत...'
  },
  'hi-IN': {
    title: 'अपनी बस्ती की समस्या बोलकर बताएं',
    desc: 'उदा. "हमारे शांति नगर में पानी की पाइपलाइन टूट गई है और कल से गंदा पानी आ रहा है।"',
    recordStart: 'माइक दबाकर बोलना शुरू करें',
    recordStop: 'रोकने के लिए टैप करें',
    uploadHint: 'या ऑडियो फ़ाइल अपलोड करें (.wav, .mp3, .webm)',
    transcribing: 'सर्वम सारस V4 द्वारा आवाज़ पहचानी जा रही है...',
    extracting: 'सर्वम-105B द्वारा शिकायत के विवरण निकाले जा रहे हैं...'
  },
  'en-IN': {
    title: 'Speak your civic grievance',
    desc: 'e.g. "There is a severe drainage overflow near Gandhi Garden in Sector 4 persisting for 2 days."',
    recordStart: 'Tap to start speaking',
    recordStop: 'Tap to stop recording',
    uploadHint: 'Or upload an audio file (.wav, .mp3, .webm)',
    transcribing: 'Transcribing speech with Sarvam Saaras V4...',
    extracting: 'Extracting complaint details with Sarvam-105B...'
  }
};

export default function VoiceRecorder({ selectedLang, onExtractionComplete }) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [liveVolume, setLiveVolume] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [processingStep, setProcessingStep] = useState(null); // 'transcribing' | 'extracting' | null
  const [error, setError] = useState(null);

  // Mic test state
  const [isTestingMic, setIsTestingMic] = useState(false);
  const [testCountdown, setTestCountdown] = useState(3);
  const [testAudioUrl, setTestAudioUrl] = useState(null);
  const [testMaxVolume, setTestMaxVolume] = useState(0);

  // Audio devices
  const [audioDevices, setAudioDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');

  const recorderRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const fileInputRef = useRef(null);

  const prompt = PROMPTS[selectedLang] || PROMPTS['hi-IN'];

  // Enumerate input devices on mount
  useEffect(() => {
    async function getDevices() {
      try {
        if (!navigator.mediaDevices?.enumerateDevices) return;
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = devices.filter((d) => d.kind === 'audioinput');
        setAudioDevices(audioInputs);
        if (audioInputs.length > 0 && !selectedDeviceId) {
          setSelectedDeviceId(audioInputs[0].deviceId);
        }
      } catch (e) {
        console.warn('Could not enumerate audio devices:', e);
      }
    }
    getDevices();
  }, []);

  // Cleanup URLs and timer on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (testAudioUrl) URL.revokeObjectURL(testAudioUrl);
    };
  }, [audioUrl, testAudioUrl]);

  // Start Main Recording
  const startRecording = async () => {
    setError(null);
    setAudioBlob(null);
    setAudioUrl(null);
    setLiveVolume(0);

    try {
      const recorder = new WavAudioRecorder({
        sampleRate: 16000,
        onVolumeChange: (vol) => setLiveVolume(vol)
      });
      recorderRef.current = recorder;

      await recorder.start(selectedDeviceId || null);
      setIsRecording(true);
      setRecordingSeconds(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Microphone start error:', err);
      setError('Microphone access was denied or not found. Please click the camera/mic icon in your browser URL bar to Allow, or use the file upload option below.');
    }
  };

  // Stop Main Recording
  const stopRecording = () => {
    if (!recorderRef.current || !isRecording) return;

    clearInterval(timerIntervalRef.current);
    setIsRecording(false);

    try {
      const result = recorderRef.current.stop();
      setLiveVolume(0);

      const url = URL.createObjectURL(result.blob);
      setAudioBlob(result.blob);
      setAudioUrl(url);

      // Check if recording was completely silent
      if (result.isSilent || result.durationSeconds < 0.6) {
        setError('⚠️ No voice was captured (microphone input level was 0% / silent). Please verify your microphone is not muted in Windows, or run the "Test Microphone" diagnostic below.');
        return;
      }

      // Process voice data
      processVoiceData(result.blob);
    } catch (err) {
      console.error('Error stopping recorder:', err);
      setError('Failed to finalize audio recording.');
    }
  };

  // Run 3-second hardware microphone diagnostic test
  const handleTestMic = async () => {
    setError(null);
    if (testAudioUrl) URL.revokeObjectURL(testAudioUrl);
    setTestAudioUrl(null);
    setIsTestingMic(true);
    setTestCountdown(3);
    setTestMaxVolume(0);

    try {
      const testRecorder = new WavAudioRecorder({
        sampleRate: 16000,
        onVolumeChange: (vol) => {
          setLiveVolume(vol);
          setTestMaxVolume((prev) => Math.max(prev, vol));
        }
      });

      await testRecorder.start(selectedDeviceId || null);

      let timeLeft = 3;
      const countTimer = setInterval(() => {
        timeLeft -= 1;
        setTestCountdown(timeLeft);
        if (timeLeft <= 0) {
          clearInterval(countTimer);
          const res = testRecorder.stop();
          setIsTestingMic(false);
          setLiveVolume(0);
          const url = URL.createObjectURL(res.blob);
          setTestAudioUrl(url);
        }
      }, 1000);
    } catch (err) {
      setIsTestingMic(false);
      setError('Microphone diagnostic failed: ' + err.message);
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
        throw new Error('No clear speech was recognized by Saaras V4. Please speak louder, hold the microphone closer, and try again.');
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
        <p style={{ color: '#64748b', fontSize: '0.92rem', maxWidth: '620px', marginBottom: '24px' }}>
          {prompt.desc}
        </p>

        {/* Microphone Button */}
        <div className="mic-wrapper">
          <button
            type="button"
            className={`mic-circle ${isRecording ? 'recording' : ''}`}
            onClick={isRecording ? stopRecording : startRecording}
            disabled={processingStep !== null || isTestingMic}
            title={isRecording ? prompt.recordStop : prompt.recordStart}
          >
            {isRecording ? <Square size={36} /> : <Mic size={42} />}
          </button>
        </div>

        {/* Recording Timer & Live VU Volume Meter */}
        {isRecording && (
          <div style={{ width: '100%', maxWidth: '360px', marginTop: '4px' }}>
            <div className="recording-timer">{formatTimer(recordingSeconds)}</div>
            
            {/* Live Volume Meter */}
            <div style={{ background: '#f1f5f9', borderRadius: '8px', height: '10px', overflow: 'hidden', margin: '8px 0', border: '1px solid #e2e8f0' }}>
              <div
                style={{
                  height: '100%',
                  width: `${liveVolume}%`,
                  background: liveVolume > 20 ? '#10b981' : liveVolume > 5 ? '#0284c7' : '#ef4444',
                  transition: 'width 0.1s ease'
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b', marginBottom: '10px' }}>
              <span>Live Input Level: <strong>{liveVolume}%</strong></span>
              {liveVolume > 5 ? (
                <span style={{ color: '#059669', fontWeight: 700 }}>● Voice Detected</span>
              ) : (
                <span style={{ color: '#d97706', fontWeight: 700 }}>● Waiting for speech...</span>
              )}
            </div>

            <div className="status-badge listening">
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#dc2626', display: 'inline-block' }}></span>
              Recording 16kHz PCM WAV... Tap red square to finish
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
                {processingStep === 'transcribing' ? 'Sarvam Saaras V4 (Direct 16kHz WAV STT)' : 'Sarvam-105B (Civic Parser)'}
              </span>
            </div>
          </div>
        )}

        {/* Audio Preview if available */}
        {audioUrl && !isRecording && !processingStep && (
          <div style={{ marginTop: '16px', background: '#f8fafc', padding: '12px 18px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Volume2 size={18} color="#0284c7" />
            <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>Your Recording:</span>
            <audio controls src={audioUrl} style={{ height: '36px' }} />
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div style={{ background: '#fef2f2', border: '1.5px solid #fecaca', color: '#b91c1c', padding: '14px 18px', borderRadius: '12px', fontSize: '0.88rem', marginTop: '20px', maxWidth: '620px', textAlign: 'left', lineHeight: 1.5 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, marginBottom: '4px' }}>
              <AlertTriangle size={18} />
              <span>Voice Detection Issue</span>
            </div>
            {error}
          </div>
        )}

        {/* Microphone Diagnostic & Settings Box */}
        <div style={{ marginTop: '28px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '16px 20px', width: '100%', maxWidth: '580px', textAlign: 'left' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.88rem', fontWeight: 700, color: '#334155' }}>
              <Sliders size={16} color="#0284c7" />
              <span>Microphone Hardware Check & Diagnostics</span>
            </div>

            {/* Test Mic Button */}
            <button
              type="button"
              className="btn-secondary"
              onClick={handleTestMic}
              disabled={isRecording || isTestingMic}
              style={{ fontSize: '0.8rem', padding: '6px 12px' }}
            >
              <Mic size={14} />
              <span>{isTestingMic ? `Speak now! (${testCountdown}s)` : 'Test My Microphone'}</span>
            </button>
          </div>

          {/* Test Mic in action */}
          {isTestingMic && (
            <div style={{ background: '#e0f2fe', padding: '12px', borderRadius: '10px', marginBottom: '10px' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0369a1', marginBottom: '6px' }}>
                🎙️ Speak into your mic now! Testing input level ({testCountdown}s remaining)...
              </div>
              <div style={{ background: '#cbd5e1', borderRadius: '6px', height: '10px', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${liveVolume}%`,
                    background: liveVolume > 10 ? '#10b981' : '#f59e0b',
                    transition: 'width 0.1s ease'
                  }}
                />
              </div>
              <div style={{ fontSize: '0.78rem', color: '#0369a1', marginTop: '4px' }}>
                Detected Volume Level: <strong>{liveVolume}%</strong>
              </div>
            </div>
          )}

          {/* Test result player */}
          {testAudioUrl && !isTestingMic && (
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '10px 14px', borderRadius: '10px', marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: testMaxVolume > 5 ? '#15803d' : '#b45309' }}>
                  {testMaxVolume > 5
                    ? `✅ Mic Test Passed (Max Level: ${testMaxVolume}%)`
                    : `⚠️ Very weak or silent signal (Max Level: ${testMaxVolume}%). Check Windows mic volume.`}
                </span>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  Play the recording below to hear what your mic captured:
                </div>
              </div>
              <audio controls src={testAudioUrl} style={{ height: '32px' }} />
            </div>
          )}

          {/* Device dropdown if multiple mics found */}
          {audioDevices.length > 1 && (
            <div style={{ marginTop: '8px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>
                Selected Audio Input Device:
              </label>
              <select
                className="form-select"
                value={selectedDeviceId}
                onChange={(e) => setSelectedDeviceId(e.target.value)}
                style={{ fontSize: '0.82rem', padding: '6px 10px', marginTop: '4px' }}
              >
                {audioDevices.map((d, idx) => (
                  <option key={d.deviceId || idx} value={d.deviceId}>
                    {d.label || `Microphone ${idx + 1}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '8px', lineHeight: 1.4 }}>
            💡 <strong>Troubleshooting tip:</strong> If the test is silent, open Windows <em>Settings &gt; System &gt; Sound &gt; Input</em> and verify your microphone volume is set to 80-100% and not muted.
          </div>
        </div>

        {/* File Upload Fallback */}
        <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px dashed #e2e8f0', width: '100%', maxWidth: '580px' }}>
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
            disabled={isRecording || processingStep !== null || isTestingMic}
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
