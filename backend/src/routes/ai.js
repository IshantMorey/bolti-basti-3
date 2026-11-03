const express = require('express');
const multer = require('multer');
const sarvamService = require('../services/sarvamService');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 } // 25 MB max
});

/**
 * POST /api/ai/transcribe
 * Accepts audio file from citizen voice recorder and returns transcription via Saaras v4
 */
router.post('/transcribe', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Audio file is required' });
    }

    const languageCode = req.body.language || 'unknown';
    const result = await sarvamService.transcribeAudio(
      req.file.buffer,
      req.file.mimetype || 'audio/webm',
      req.file.originalname || 'recording.webm',
      languageCode
    );

    res.json({
      success: true,
      transcript: result.transcript,
      detectedLanguage: result.detectedLanguage
    });
  } catch (err) {
    console.error('Transcription error:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to transcribe audio'
    });
  }
});

/**
 * POST /api/ai/extract
 * Uses Sarvam-105B to extract structured complaint fields from raw voice transcript
 */
router.post('/extract', async (req, res) => {
  try {
    const { transcript, language } = req.body;
    if (!transcript || transcript.trim() === '') {
      return res.status(400).json({ error: 'Transcript text is required' });
    }

    const details = await sarvamService.extractComplaintDetails(transcript, language || 'hi-IN');
    res.json({
      success: true,
      extracted: details
    });
  } catch (err) {
    console.error('Extraction error:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to extract complaint details'
    });
  }
});

/**
 * POST /api/ai/synthesize
 * Uses Sarvam Bulbul V4 Flash to generate audio confirmation in Marathi, Hindi or English
 */
router.post('/synthesize', async (req, res) => {
  try {
    const { text, language } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Text to synthesize is required' });
    }

    const langCode = language || 'hi-IN';
    const result = await sarvamService.generateVoiceConfirmation(text, langCode);

    res.json({
      success: true,
      audioBase64: result.audioBase64
    });
  } catch (err) {
    console.error('TTS error:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to generate voice confirmation'
    });
  }
});

module.exports = router;
