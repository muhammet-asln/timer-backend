import express from 'express';
import studySessionController from '../controller/studySessionController.js';
import { authenticate } from '../middlewares/authMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/sessions
 * @desc    Create a new study session
 * @access  Private
 * @body    { session_type, duration_seconds, subject? }
 */
router.post('/', studySessionController.createSession.bind(studySessionController));

/**
 * @route   GET /api/sessions
 * @desc    Get user's study sessions
 * @access  Private
 * @query   { session_type?, start_date?, end_date?, limit? }
 */
router.get('/', studySessionController.getUserSessions.bind(studySessionController));

/**
 * @route   GET /api/sessions/statistics
 * @desc    Get user's study statistics
 * @access  Private
 */
router.get('/statistics', studySessionController.getStatistics.bind(studySessionController));

/**
 * @route   DELETE /api/sessions/:id
 * @desc    Delete a study session
 * @access  Private
 */
router.delete('/:id', studySessionController.deleteSession.bind(studySessionController));

export default router;
