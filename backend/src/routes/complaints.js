const express = require('express');
const db = require('../config/db');
const sarvamService = require('../services/sarvamService');

const router = express.Router();

/**
 * Generate a unique demo ticket ID
 * e.g., BB-2026-8492
 */
function generateDemoTicketId() {
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `BB-2026-${randomSuffix}`;
}

/**
 * Helper to build spoken confirmation message based on language
 */
function buildConfirmationText(ticketId, category, language) {
  if (language === 'mr-IN') {
    return `तुमची तक्रार क्रमांक ${ticketId} यशस्वीरीत्या नोंदवली गेली आहे. संबंधित विभाग लवकरच कार्यवाही करेल. धन्यवाद.`;
  } else if (language === 'hi-IN') {
    return `आपकी शिकायत संख्या ${ticketId} सफलतापूर्वक दर्ज कर ली गई है। संबंधित विभाग शीघ्र ही इस पर कार्रवाई करेगा। धन्यवाद।`;
  } else {
    return `Your complaint ticket ${ticketId} has been successfully recorded. The relevant department will take action soon. Thank you.`;
  }
}

/**
 * POST /api/complaints
 * Submit citizen complaint, store in SQLite, generate demo ticket ID and spoken confirmation audio
 */
router.post('/', async (req, res) => {
  try {
    const {
      category,
      description,
      original_transcript,
      language = 'hi-IN',
      locality = 'Not specified',
      landmark = 'Not specified',
      duration = 'Not specified',
      urgency = 'Medium'
    } = req.body;

    if (!category || !description) {
      return res.status(400).json({ error: 'Category and description are required' });
    }

    const ticketId = generateDemoTicketId();
    const spokenText = buildConfirmationText(ticketId, category, language);

    // Generate spoken confirmation via Sarvam Bulbul V4 Flash
    let audioBase64 = null;
    try {
      const audioResult = await sarvamService.generateVoiceConfirmation(spokenText, language);
      audioBase64 = audioResult.audioBase64;
    } catch (ttsErr) {
      console.warn('Voice confirmation synthesis warning (continuing without audio):', ttsErr.message);
    }

    const insertStmt = db.prepare(`
      INSERT INTO complaints (
        ticket_id, category, description, original_transcript,
        language, locality, landmark, duration, urgency,
        status, audio_confirmation_base64
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', ?)
    `);

    const result = insertStmt.run(
      ticketId,
      category,
      description,
      original_transcript || description,
      language,
      locality,
      landmark,
      duration,
      urgency,
      audioBase64
    );

    const complaintStmt = db.prepare(`SELECT * FROM complaints WHERE id = ?`);
    const newComplaint = complaintStmt.get(result.lastInsertRowid);

    res.status(201).json({
      success: true,
      complaint: newComplaint,
      spokenConfirmation: {
        text: spokenText,
        audioBase64
      }
    });
  } catch (err) {
    console.error('Create complaint error:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to submit complaint'
    });
  }
});

/**
 * GET /api/complaints
 * List all demo complaints with filtering support
 */
router.get('/', (req, res) => {
  try {
    const { status, category, urgency, search } = req.query;

    let query = 'SELECT id, ticket_id, category, description, original_transcript, language, locality, landmark, duration, urgency, status, created_at, updated_at FROM complaints WHERE 1=1';
    const params = [];

    if (status && status !== 'All') {
      query += ' AND status = ?';
      params.push(status);
    }
    if (category && category !== 'All') {
      query += ' AND category = ?';
      params.push(category);
    }
    if (urgency && urgency !== 'All') {
      query += ' AND urgency = ?';
      params.push(urgency);
    }
    if (search) {
      query += ' AND (ticket_id LIKE ? OR description LIKE ? OR locality LIKE ? OR landmark LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }

    query += ' ORDER BY created_at DESC';

    const stmt = db.prepare(query);
    const complaints = stmt.all(...params);

    res.json({
      success: true,
      count: complaints.length,
      complaints
    });
  } catch (err) {
    console.error('List complaints error:', err);
    res.status(500).json({ success: false, error: 'Failed to retrieve complaints' });
  }
});

/**
 * GET /api/complaints/stats/summary
 * Dashboard statistics for administrative overview
 */
router.get('/stats/summary', (req, res) => {
  try {
    const totalRow = db.prepare('SELECT COUNT(*) as total FROM complaints').get();
    const pendingRow = db.prepare("SELECT COUNT(*) as count FROM complaints WHERE status = 'Pending'").get();
    const inProgressRow = db.prepare("SELECT COUNT(*) as count FROM complaints WHERE status = 'In Progress'").get();
    const resolvedRow = db.prepare("SELECT COUNT(*) as count FROM complaints WHERE status = 'Resolved'").get();

    const categoryRows = db.prepare(`
      SELECT category, COUNT(*) as count 
      FROM complaints 
      GROUP BY category 
      ORDER BY count DESC
    `).all();

    const urgencyRows = db.prepare(`
      SELECT urgency, COUNT(*) as count 
      FROM complaints 
      GROUP BY urgency
    `).all();

    res.json({
      success: true,
      stats: {
        total: totalRow.total,
        pending: pendingRow.count,
        inProgress: inProgressRow.count,
        resolved: resolvedRow.count,
        byCategory: categoryRows,
        byUrgency: urgencyRows
      }
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ success: false, error: 'Failed to retrieve statistics' });
  }
});

/**
 * GET /api/complaints/:ticketId
 * Retrieve specific complaint by ticket ID
 */
router.get('/:ticketId', (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM complaints WHERE ticket_id = ?');
    const complaint = stmt.get(req.params.ticketId);

    if (!complaint) {
      return res.status(404).json({ error: 'Complaint not found' });
    }

    res.json({ success: true, complaint });
  } catch (err) {
    console.error('Get complaint error:', err);
    res.status(500).json({ success: false, error: 'Failed to retrieve complaint' });
  }
});

/**
 * PATCH /api/complaints/:id/status
 * Update complaint status (Pending, In Progress, Resolved)
 */
router.patch('/:id/status', (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['Pending', 'In Progress', 'Resolved'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const updateStmt = db.prepare(`
      UPDATE complaints 
      SET status = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `);

    const result = updateStmt.run(status, req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Complaint not found' });
    }

    const complaint = db.prepare('SELECT * FROM complaints WHERE id = ?').get(req.params.id);
    res.json({ success: true, complaint });
  } catch (err) {
    console.error('Update status error:', err);
    res.status(500).json({ success: false, error: 'Failed to update complaint status' });
  }
});

module.exports = router;
