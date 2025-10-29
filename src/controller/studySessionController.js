import studySessionService from '../services/studySessionService.js';
import Joi from 'joi';

class StudySessionController {
  // Validation schemas
  createSessionSchema = Joi.object({
    session_type: Joi.string().valid('pomodoro', 'stopwatch', 'timer').required().messages({
      'any.only': 'Session type must be pomodoro, stopwatch, or timer',
      'any.required': 'Session type is required'
    }),
    duration_seconds: Joi.number().integer().min(1).required().messages({
      'number.min': 'Duration must be at least 1 second',
      'any.required': 'Duration is required'
    }),
    subject: Joi.string().max(100).allow(null, '').optional().messages({
      'string.max': 'Subject cannot exceed 100 characters'
    })
  });

  getSessionsSchema = Joi.object({
    session_type: Joi.string().valid('pomodoro', 'stopwatch', 'timer').optional(),
    start_date: Joi.date().iso().optional(),
    end_date: Joi.date().iso().optional(),
    limit: Joi.number().integer().min(1).max(1000).optional()
  });

  // Create new study session
  async createSession(req, res) {
    try {
      // Validate request body
      const { error, value } = this.createSessionSchema.validate(req.body);
      
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.details.map(detail => detail.message)
        });
      }

      const result = await studySessionService.createSession(req.user.id, value);

      return res.status(201).json(result);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get user's sessions
  async getUserSessions(req, res) {
    try {
      // Validate query params
      const { error, value } = this.getSessionsSchema.validate(req.query);
      
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.details.map(detail => detail.message)
        });
      }

      const result = await studySessionService.getUserSessions(req.user.id, value);

      return res.status(200).json(result);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get statistics
  async getStatistics(req, res) {
    try {
      const result = await studySessionService.getStatistics(req.user.id);

      return res.status(200).json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Delete session
  async deleteSession(req, res) {
    try {
      const sessionId = parseInt(req.params.id);

      if (isNaN(sessionId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid session ID'
        });
      }

      const result = await studySessionService.deleteSession(req.user.id, sessionId);

      return res.status(200).json(result);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
}

export default new StudySessionController();
