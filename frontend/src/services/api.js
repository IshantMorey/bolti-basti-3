const API_BASE = '/api';

export async function transcribeAudio(audioBlob, language = 'hi-IN') {
  const formData = new FormData();
  // Ensure the appropriate extension matches the blob MIME type
  const filename = audioBlob.type?.includes('wav')
    ? 'recording.wav'
    : audioBlob.type?.includes('mp3')
    ? 'recording.mp3'
    : 'recording.webm';

  formData.append('audio', audioBlob, filename);
  formData.append('language', language);

  const res = await fetch(`${API_BASE}/ai/transcribe`, {
    method: 'POST',
    body: formData
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to transcribe audio');
  }

  return data;
}

export async function extractComplaint(transcript, language = 'hi-IN') {
  const res = await fetch(`${API_BASE}/ai/extract`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transcript, language })
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to extract details with Sarvam-105B');
  }

  return data.extracted;
}

export async function submitComplaint(complaintData) {
  const res = await fetch(`${API_BASE}/complaints`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(complaintData)
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to submit complaint');
  }

  return data;
}

export async function getComplaints(filters = {}) {
  const params = new URLSearchParams();
  if (filters.status && filters.status !== 'All') params.append('status', filters.status);
  if (filters.category && filters.category !== 'All') params.append('category', filters.category);
  if (filters.urgency && filters.urgency !== 'All') params.append('urgency', filters.urgency);
  if (filters.search) params.append('search', filters.search);

  const res = await fetch(`${API_BASE}/complaints?${params.toString()}`);
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to fetch complaints');
  }

  return data.complaints;
}

export async function getComplaintStats() {
  const res = await fetch(`${API_BASE}/complaints/stats/summary`);
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to fetch stats');
  }

  return data.stats;
}

export async function updateComplaintStatus(id, status) {
  const res = await fetch(`${API_BASE}/complaints/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to update status');
  }

  return data.complaint;
}
