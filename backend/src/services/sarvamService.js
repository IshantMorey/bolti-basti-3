const SARVAM_BASE_URL = 'https://api.sarvam.ai';

function getApiKey() {
  const key = process.env.SARVAM_API_KEY;
  if (!key || key.trim() === '' || key === 'your_sarvam_api_key_here') {
    throw new Error('SARVAM_API_KEY is not configured in backend/.env');
  }
  return key.trim();
}

/**
 * Transcribe voice recording using Sarvam Saaras V4
 * @param {Buffer} fileBuffer Audio file buffer
 * @param {string} mimeType e.g. audio/webm or audio/wav
 * @param {string} filename e.g. audio.webm
 * @param {string} languageCode e.g. 'mr-IN', 'hi-IN', 'en-IN', or 'unknown'
 */
async function transcribeAudio(fileBuffer, mimeType = 'audio/webm', filename = 'recording.webm', languageCode = 'unknown') {
  const apiKey = getApiKey();
  const formData = new FormData();

  const blob = new Blob([fileBuffer], { type: mimeType });
  formData.append('file', blob, filename);
  formData.append('model', 'saaras:v4');
  formData.append('mode', 'transcribe');
  formData.append('language_code', languageCode || 'unknown');

  const response = await fetch(`${SARVAM_BASE_URL}/speech-to-text`, {
    method: 'POST',
    headers: {
      'api-subscription-key': apiKey
    },
    body: formData
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Sarvam STT failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return {
    transcript: data.transcript || '',
    detectedLanguage: data.language_code || languageCode
  };
}

/**
 * Extract structured civic complaint details using Sarvam-105B
 * @param {string} transcript Transcribed citizen voice text
 * @param {string} language Language of the user ('mr-IN', 'hi-IN', 'en-IN')
 */
async function extractComplaintDetails(transcript, language = 'hi-IN') {
  const apiKey = getApiKey();

  const systemPrompt = `You are Bolti Basti's civic complaint parser. You extract structured civic grievance data from citizen voice reports in Marathi, Hindi, or English.
Respond strictly with a single JSON object. No explanation, no markdown backticks, no extra text.

JSON Schema:
{
  "category": "One of: Roads & Potholes, Water Supply, Electricity & Streetlights, Garbage & Sanitation, Drainage & Sewage, Public Transport, Parks & Public Spaces, Others",
  "description": "Clear and detailed summary of the citizen's complaint (translated or clarified in simple language)",
  "locality": "Area, neighborhood, ward, or colony mentioned (or 'Not specified')",
  "landmark": "Nearest landmark, shop, school, or crossing (or 'Not specified')",
  "duration": "How long the issue has been persisting, e.g. '3 days', 'since yesterday', '1 month' (or 'Not specified')",
  "urgency": "One of: High, Medium, Low"
}

Categorization rules:
- Broken roads, craters, potholes, road blockages -> "Roads & Potholes"
- Water shortage, dirty water, pipeline leaks, no tanker -> "Water Supply"
- Power cuts, hanging wires, streetlight not working -> "Electricity & Streetlights"
- Garbage pile, overflowing dustbin, dead animals, uncleaned street -> "Garbage & Sanitation"
- Blocked drains, flooding dirty water, sewer overflow -> "Drainage & Sewage"
- Urgency: High if it poses health/safety risks, power/water outage, or flooding; Low if aesthetic or minor; Medium otherwise.`;

  const response = await fetch(`${SARVAM_BASE_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'api-subscription-key': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'sarvam-105b-conversations',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Citizen Grievance Voice Transcript: "${transcript}"` }
      ],
      temperature: 0.2
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Sarvam-105B Chat Completion failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const rawContent = data.choices?.[0]?.message?.content?.trim() || '{}';

  // Parse JSON, cleaning markdown ticks if present
  let cleanContent = rawContent;
  if (cleanContent.startsWith('```')) {
    cleanContent = cleanContent.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
  }

  try {
    const parsed = JSON.parse(cleanContent);
    return {
      category: parsed.category || 'Others',
      description: parsed.description || transcript,
      locality: parsed.locality || 'Not specified',
      landmark: parsed.landmark || 'Not specified',
      duration: parsed.duration || 'Not specified',
      urgency: ['High', 'Medium', 'Low'].includes(parsed.urgency) ? parsed.urgency : 'Medium'
    };
  } catch (err) {
    console.error('Failed to parse Sarvam-105B JSON output:', rawContent);
    return {
      category: 'Others',
      description: transcript,
      locality: 'Not specified',
      landmark: 'Not specified',
      duration: 'Not specified',
      urgency: 'Medium'
    };
  }
}

/**
 * Generate spoken voice confirmation using Sarvam Bulbul V4 Flash
 * @param {string} text Text to speak
 * @param {string} languageCode e.g. 'mr-IN', 'hi-IN', 'en-IN'
 */
async function generateVoiceConfirmation(text, languageCode = 'hi-IN') {
  const apiKey = getApiKey();

  // Select suitable speaker for language
  let speaker;
  if (languageCode === 'mr-IN') {
    speaker = 'ishita_mr_conversational';
  } else if (languageCode === 'hi-IN') {
    speaker = 'aditya_hi_conversational';
  } else {
    speaker = 'dev_en_conversational';
  }

  const payload = {
    text,
    language_code: languageCode,
    model: 'bulbul:v4-flash',
    speaker,
    pace: 1.0
  };

  const response = await fetch(`${SARVAM_BASE_URL}/text-to-speech`, {
    method: 'POST',
    headers: {
      'api-subscription-key': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Sarvam Bulbul TTS failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return {
    audioBase64: data.audios?.[0] || null
  };
}

module.exports = {
  transcribeAudio,
  extractComplaintDetails,
  generateVoiceConfirmation
};
