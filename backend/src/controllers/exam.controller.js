const { validationResult } = require('express-validator');
const Exam = require('../models/exam.model');
const { upload, handleUploadError } = require('../middlewares/upload.middleware');
const fs = require('fs').promises;
const path = require('path');
const supabase = require('../lib/supabase');
const { v4: uuidv4 } = require('uuid');

// Upload exam
const uploadExam = async (req, res) => {
  try {
    // First handle the file upload
    upload.single('examFile')(req, res, async (err) => {
      if (err) {
        console.error('Upload Error:', err);
        return handleUploadError(err, req, res, () => {});
      }

      // Now validate the request body
      const { type, description, performedAt, expiresAt } = req.body;
      
      // Manual validation since we're not using express-validator middleware
      const errors = [];
      
      // Validate type
      const validTypes = ['blood', 'urine', 'xray', 'mri', 'ct', 'other'];
      if (!type || !validTypes.includes(type)) {
        errors.push({
          type: 'field',
          value: type,
          msg: 'Invalid exam type',
          path: 'type',
          location: 'body'
        });
      }
      
      // Validate performedAt
      let performedDate;
      if (!performedAt) {
        errors.push({
          type: 'field',
          value: performedAt,
          msg: 'Performed date is required',
          path: 'performedAt',
          location: 'body'
        });
      } else {
        performedDate = new Date(performedAt);
        if (isNaN(performedDate.getTime())) {
          errors.push({
            type: 'field',
            value: performedAt,
            msg: 'Invalid performed date format',
            path: 'performedAt',
            location: 'body'
          });
        } else if (performedDate > new Date()) {
          errors.push({
            type: 'field',
            value: performedAt,
            msg: 'Performed date cannot be in the future',
            path: 'performedAt',
            location: 'body'
          });
        }
      }
      
      // Validate expiresAt
      let expiresDate;
      if (!expiresAt) {
        errors.push({
          type: 'field',
          value: expiresAt,
          msg: 'Expiration date is required',
          path: 'expiresAt',
          location: 'body'
        });
      } else {
        expiresDate = new Date(expiresAt);
        if (isNaN(expiresDate.getTime())) {
          errors.push({
            type: 'field',
            value: expiresAt,
            msg: 'Invalid expiration date format',
            path: 'expiresAt',
            location: 'body'
          });
        } else if (performedDate && expiresDate <= performedDate) {
          errors.push({
            type: 'field',
            value: expiresAt,
            msg: 'Expiration date must be after performed date',
            path: 'expiresAt',
            location: 'body'
          });
        }
      }
      
      // Check if there are any validation errors
      if (errors.length > 0) {
        console.log('Validation Errors:', errors);
        // Clean up uploaded file if validation fails
        if (req.file) {
          try {
            await fs.unlink(req.file.path);
          } catch (cleanupErr) {
            console.error('Error cleaning up file:', cleanupErr);
          }
        }
        return res.status(400).json({ errors });
      }
      
      // Validate description length if provided
      if (description && description.length > 500) {
        errors.push({
          type: 'field',
          value: description,
          msg: 'Description must be less than 500 characters',
          path: 'description',
          location: 'body'
        });
        
        if (req.file) {
          try {
            await fs.unlink(req.file.path);
          } catch (cleanupErr) {
            console.error('Error cleaning up file:', cleanupErr);
          }
        }
        return res.status(400).json({ errors });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      try {
        // Read the file buffer
        const fileBuffer = await fs.readFile(req.file.path);
        const fileExt = path.extname(req.file.originalname);
        const fileName = `${uuidv4()}${fileExt}`;
        const bucket = 'oris';

        // Upload to Supabase Storage
        const { data, error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(fileName, fileBuffer, {
            contentType: req.file.mimetype,
            upsert: false,
          });

        if (uploadError) {
          console.error('Error uploading to Supabase:', uploadError);
          return res.status(500).json({ error: 'Error uploading file to Supabase' });
        }

        // Get the public URL
        const { data: publicUrlData } = supabase.storage
          .from(bucket)
          .getPublicUrl(fileName);

        if (!publicUrlData || !publicUrlData.publicUrl) {
          return res.status(500).json({ error: 'Error generating public URL for file' });
        }

        // Create exam record
        const exam = new Exam({
          userId: req.user._id,
          type,
          description,
          performedAt: new Date(performedAt),
          expiresAt: new Date(expiresAt),
          file: {
            url: publicUrlData.publicUrl,
            originalName: req.file.originalname,
            mimeType: req.file.mimetype,
            size: req.file.size
          }
        });

        await exam.save();

        // Clean up local file
        await fs.unlink(req.file.path);

        res.status(201).json({
          message: 'Exam uploaded successfully',
          exam
        });
      } catch (error) {
        console.error('Error saving exam:', error);
        // If file doesn't exist or there's an error, clean up
        if (req.file) {
          try {
            await fs.unlink(req.file.path);
          } catch (unlinkError) {
            console.error('Error deleting file:', unlinkError);
          }
        }
        throw error;
      }
    });
  } catch (error) {
    console.error('Error in uploadExam:', error);
    res.status(500).json({ error: 'Error uploading exam' });
  }
};

// Get user's exams
const getUserExams = async (req, res) => {
  try {
    const exams = await Exam.find({ userId: req.user._id })
      .sort({ performedAt: -1 });

    // Verify if files exist
    const examsWithFileStatus = await Promise.all(exams.map(async (exam) => {
      const examObj = exam.toObject();
      try {
        await fs.access(exam.file.path);
        examObj.fileExists = true;
      } catch (error) {
        examObj.fileExists = false;
      }
      return examObj;
    }));

    res.json(examsWithFileStatus);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch exams",
      error: error.message || "Internal server error"
    });
  }
};

// Get single exam
const getExam = async (req, res) => {
  try {
    const exam = await Exam.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!exam) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    // Verify if file exists
    const examObj = exam.toObject();
    try {
      await fs.access(exam.file.path);
      examObj.fileExists = true;
    } catch (error) {
      examObj.fileExists = false;
    }

    res.json(examObj);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch exam",
      error: error.message || "Internal server error"
    });
  }
};

// Delete exam
const deleteExam = async (req, res) => {
  try {
    const exam = await Exam.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!exam) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    // Delete file from storage if it exists
    try {
      await fs.access(exam.file.path);
      await fs.unlink(exam.file.path);
    } catch (error) {
      console.error('Error deleting file:', error);
      // Continue with exam deletion even if file doesn't exist
    }
    
    // Delete exam from database
    await exam.deleteOne();

    res.json({ message: 'Exam deleted successfully' });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete exam",
      error: error.message || "Internal server error"
    });
  }
};

// Update exam status (admin only)
const updateExamStatus = async (req, res) => {
  try {
    const { status, results, doctorNotes } = req.body;

    const exam = await Exam.findById(req.params.id);
    if (!exam) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    exam.status = status;
    if (results) exam.results = results;
    if (doctorNotes) exam.doctorNotes = doctorNotes;

    await exam.save();

    res.json({
      message: 'Exam status updated successfully',
      exam
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update exam status",
      error: error.message || "Internal server error"
    });
  }
};

// Checar status dos exames por tipo
const getExamStatus = async (req, res) => {
  const examTypes = ['blood', 'urine', 'xray', 'mri', 'ct', 'other'];
  try {
    const exams = await Exam.find({ userId: req.user._id });
    const now = new Date();
    const status = {};
    examTypes.forEach(type => {
      // Filtra exames válidos desse tipo
      const validExams = exams.filter(
        exam => exam.type === type && exam.expiresAt > now
      );
      if (validExams.length > 0) {
        // Pega o exame com a maior data de expiração
        const latest = validExams.reduce((a, b) => a.expiresAt > b.expiresAt ? a : b);
        status[type] = {
          valid: true,
          expiresAt: latest.expiresAt
        };
      } else {
        status[type] = {
          valid: false,
          expiresAt: null
        };
      }
    });
    res.json(status);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to check exam status",
      error: error.message || "Internal server error"
    });
  }
};

// Buscar exames do usuário por tipo
const getExamsByType = async (req, res) => {
  const { type } = req.params;
  const validTypes = ['blood', 'urine', 'xray', 'mri', 'ct', 'other'];
  if (!validTypes.includes(type)) {
    return res.status(400).json({ error: 'Tipo de exame inválido' });
  }
  try {
    const exams = await Exam.find({ userId: req.user._id, type })
      .sort({ performedAt: -1 });
    res.json(exams);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch exams by type",
      error: error.message || "Internal server error"
    });
  }
};

module.exports = {
  uploadExam,
  getUserExams,
  getExam,
  deleteExam,
  updateExamStatus,
  getExamStatus,
  getExamsByType
}; 