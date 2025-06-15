const { validationResult } = require('express-validator');
const Report = require('../models/report.model');
const supabase = require('../lib/supabase');
const path = require('path');
const fs = require('fs/promises');

async function uploadToSupabase(file) {
  const bucket = process.env.SUPABASE_BUCKET || 'oris';
  const ext = path.extname(file.originalname);
  const fileName = `${Date.now()}_${Math.round(Math.random() * 1e9)}${ext}`;

  const fileBuffer = file.buffer;

  const { data, error } = await supabase.storage.from(bucket).upload(fileName, fileBuffer, {
    contentType: file.mimetype,
    upsert: false
  });
  
  if (error) throw error;

  const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(fileName);

  return {
    url: publicUrlData.publicUrl,
    name: file.originalname,
    type: file.mimetype
  };
}

// Create a new report
const createReport = async (req, res) => {
  try {
    // Verifica se o usuário está autenticado
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: "Usuário não autenticado",
        received: {
          headers: req.headers,
          body: req.body
        }
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Erro de validação",
        errors: errors.array(),
        received: {
          body: req.body,
          file: req.file ? {
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size
          } : null
        }
      });
    }

    let attachmentArr = [];
    if (req.file) {
      try {
        const uploaded = await uploadToSupabase(req.file);
        attachmentArr.push(uploaded);
      } catch (err) {
        return res.status(500).json({
          success: false,
          message: 'Erro ao fazer upload da imagem',
          details: err.message,
          stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
          received: {
            file: req.file ? {
              originalname: req.file.originalname,
              mimetype: req.file.mimetype,
              size: req.file.size
            } : null
          }
        });
      }
    }

    const report = new Report({
      type: req.body.type,
      location: req.body.location,
      description: req.body.description,
      title: req.body.title,
      impact: req.body.impact,
      attachments: attachmentArr,
      userId: req.user._id
    });

    await report.save();

    res.status(201).json({
      success: true,
      message: "Relatório criado com sucesso",
      report
    });

  } catch (error) {
    console.error('Error creating report:', error);
    res.status(500).json({
      success: false,
      message: "Erro interno ao criar relatório",
      error: error.message || "Internal server error",
      stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined,
      received: {
        body: req.body,
        file: req.file ? {
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size
        } : null
      }
    });
  }
};

// Get all reports (with filtering options)
const getReports = async (req, res) => {
  try {
    const {
      type,
      status,
      impact,
      startDate,
      endDate
    } = req.query;

    const query = {};

    if (type) query.type = type;
    if (status) query.status = status;
    if (impact) query.impact = impact;

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const reports = await Report.find(query)
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });

    res.json(reports);
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch reports",
      error: error.message || "Internal server error"
    });
  }
};

// Get report by ID
const getReportById = async (req, res) => {
  try {
    const report = await Report.findById(req.params.id)
      .populate('userId', 'name email')
      .populate('comments.userId', 'name email');

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    res.json(report);
  } catch (error) {
    console.error('Error fetching report:', error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch report",
      error: error.message || "Internal server error"
    });
  }
};

// Update report
const updateReport = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const updates = Object.keys(req.body);
    const allowedUpdates = [
      'title',
      'description',
      'type',
      'location',
      'priority',
      'status',
      'impact',
      'affectedAreas',
      'assignedTo'
    ];

    const isValidOperation = updates.every(update => allowedUpdates.includes(update));
    if (!isValidOperation) {
      return res.status(400).json({ error: 'Invalid updates' });
    }

    const report = await Report.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    updates.forEach(update => {
      report[update] = req.body[update];
    });

    await report.save();
    res.json(report);
  } catch (error) {
    console.error('Error updating report:', error);
    res.status(500).json({
      success: false,
      message: "Failed to update report",
      error: error.message || "Internal server error"
    });
  }
};

// Add comment to report
const addComment = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const report = await Report.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    report.comments.push({
      userId: req.user._id,
      text: req.body.text
    });

    await report.save();
    res.json(report);
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({
      success: false,
      message: "Failed to add comment",
      error: error.message || "Internal server error"
    });
  }
};

// Resolve report
const resolveReport = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const report = await Report.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    report.status = 'resolvido';
    report.resolution = {
      description: req.body.description,
      resolvedAt: new Date(),
      resolvedBy: req.user._id
    };

    await report.save();
    res.json(report);
  } catch (error) {
    console.error('Error resolving report:', error);
    res.status(500).json({
      success: false,
      message: "Failed to resolve report",
      error: error.message || "Internal server error"
    });
  }
};

// Get report statistics
const getReportStats = async (req, res) => {
  try {
    const stats = await Report.aggregate([
      {
        $group: {
          _id: {
            type: '$type',
            status: '$status',
            priority: '$priority'
          },
          count: { $sum: 1 }
        }
      }
    ]);

    const impactStats = await Report.aggregate([
      {
        $group: {
          _id: '$impact',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      byTypeAndStatus: stats,
      byImpact: impactStats
    });
  } catch (error) {
    console.error('Error fetching report statistics:', error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch report statistics",
      error: error.message || "Internal server error"
    });
  }
};

module.exports = {
  createReport,
  getReports,
  getReportById,
  updateReport,
  addComment,
  resolveReport,
  getReportStats
}; 