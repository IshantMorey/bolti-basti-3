/**
 * Audio Recorder Utility for Bolti Basti
 * Records speech directly into clean, uncompressed 16-bit PCM WAV format at 16,000 Hz
 * providing optimal compatibility with Sarvam Saaras V4 and live volume metering.
 */

export class WavAudioRecorder {
  constructor(options = {}) {
    this.targetSampleRate = options.sampleRate || 16000;
    this.onVolumeChange = options.onVolumeChange || null; // callback(volumePercent: 0-100)
    this.audioContext = null;
    this.mediaStream = null;
    this.sourceNode = null;
    this.analyserNode = null;
    this.processorNode = null;
    this.pcmChunks = [];
    this.isRecording = false;
    this.maxVolumeDetected = 0;
    this.animFrameId = null;
  }

  async start(deviceId = null) {
    this.pcmChunks = [];
    this.maxVolumeDetected = 0;

    const constraints = {
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        ...(deviceId ? { deviceId: { exact: deviceId } } : {})
      }
    };

    this.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    this.audioContext = new AudioContextClass();
    const sourceSampleRate = this.audioContext.sampleRate;

    this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);
    this.analyserNode = this.audioContext.createAnalyser();
    this.analyserNode.fftSize = 512;
    this.analyserNode.smoothingTimeConstant = 0.3;

    // Buffer size 4096 gives ~85ms chunks at 48kHz
    this.processorNode = this.audioContext.createScriptProcessor(4096, 1, 1);

    this.processorNode.onaudioprocess = (e) => {
      if (!this.isRecording) return;
      const inputChannelData = e.inputBuffer.getChannelData(0);
      
      // Resample from AudioContext sample rate (e.g. 44.1k/48k) to 16kHz
      const resampled = downsampleBuffer(inputChannelData, sourceSampleRate, this.targetSampleRate);
      this.pcmChunks.push(resampled);
    };

    // Connect nodes: source -> analyser -> processor -> destination (muted)
    this.sourceNode.connect(this.analyserNode);
    this.analyserNode.connect(this.processorNode);
    this.processorNode.connect(this.audioContext.destination);

    this.isRecording = true;
    this._startVolumeMeter();
  }

  _startVolumeMeter() {
    const dataArray = new Uint8Array(this.analyserNode.frequencyBinCount);

    const updateVolume = () => {
      if (!this.isRecording) return;

      this.analyserNode.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      const avg = sum / dataArray.length;
      const volumePercent = Math.min(100, Math.round((avg / 128) * 100));

      if (volumePercent > this.maxVolumeDetected) {
        this.maxVolumeDetected = volumePercent;
      }

      if (this.onVolumeChange) {
        this.onVolumeChange(volumePercent);
      }

      this.animFrameId = requestAnimationFrame(updateVolume);
    };

    this.animFrameId = requestAnimationFrame(updateVolume);
  }

  stop() {
    this.isRecording = false;

    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    if (this.processorNode) {
      this.processorNode.disconnect();
      this.processorNode = null;
    }
    if (this.analyserNode) {
      this.analyserNode.disconnect();
      this.analyserNode = null;
    }
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    // Merge PCM chunks
    let totalLength = 0;
    for (const chunk of this.pcmChunks) {
      totalLength += chunk.length;
    }

    const mergedPcm = new Float32Array(totalLength);
    let offset = 0;
    for (const chunk of this.pcmChunks) {
      mergedPcm.set(chunk, offset);
      offset += chunk.length;
    }

    // Encode into RIFF 16-bit PCM WAV Blob
    const wavBlob = encodeWAV(mergedPcm, this.targetSampleRate);

    return {
      blob: wavBlob,
      maxVolume: this.maxVolumeDetected,
      isSilent: this.maxVolumeDetected < 2, // flag if mic captured zero sound
      durationSeconds: totalLength / this.targetSampleRate
    };
  }
}

/**
 * Resample Float32Array audio buffer
 */
function downsampleBuffer(buffer, sourceRate, targetRate) {
  if (sourceRate === targetRate) return new Float32Array(buffer);
  const ratio = sourceRate / targetRate;
  const newLength = Math.round(buffer.length / ratio);
  const result = new Float32Array(newLength);
  let offsetResult = 0;
  let offsetBuffer = 0;

  while (offsetResult < result.length) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * ratio);
    let accum = 0;
    let count = 0;
    for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
      accum += buffer[i];
      count++;
    }
    result[offsetResult] = count > 0 ? accum / count : 0;
    offsetResult++;
    offsetBuffer = nextOffsetBuffer;
  }
  return result;
}

/**
 * Encode Float32Array samples into standard 16-bit PCM RIFF WAV format
 */
function encodeWAV(samples, sampleRate) {
  const numChannels = 1;
  const bytesPerSample = 2; // 16-bit
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = samples.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // RIFF header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');

  // fmt subchunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true);  // AudioFormat (1 = PCM)
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true); // bits per sample

  // data subchunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // Write PCM samples (clamped Float32 -> Int16)
  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }

  return new Blob([view], { type: 'audio/wav' });
}

function writeString(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}
