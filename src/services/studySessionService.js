import StudySession from '../models/studySession.js';
import { sequelize } from '../config/db.js';
import { Op } from 'sequelize';

class StudySessionService {
  // Create new study session
  async createSession(userId, sessionData) {
    try {
      const session = await StudySession.create({
        user_id: userId,
        session_type: sessionData.session_type,
        duration_seconds: sessionData.duration_seconds,
        subject: sessionData.subject || null
      });

      return {
        success: true,
        message: 'Study session saved successfully',
        data: session
      };
    } catch (error) {
      throw error;
    }
  }

  // Get user's all sessions
  async getUserSessions(userId, filters = {}) {
    try {
      const whereClause = { user_id: userId };

      // Filter by session type
      if (filters.session_type) {
        whereClause.session_type = filters.session_type;
      }

      // Filter by date range
      if (filters.start_date || filters.end_date) {
        whereClause.created_at = {};
        if (filters.start_date) {
          whereClause.created_at[Op.gte] = new Date(filters.start_date);
        }
        if (filters.end_date) {
          whereClause.created_at[Op.lte] = new Date(filters.end_date);
        }
      }

      const sessions = await StudySession.findAll({
        where: whereClause,
        order: [['created_at', 'DESC']],
        limit: filters.limit || 100
      });

      return {
        success: true,
        data: sessions
      };
    } catch (error) {
      throw error;
    }
  }

  // Get statistics
  async getStatistics(userId) {
    try {
      // Total focus time
      const totalResult = await StudySession.findOne({
        where: { user_id: userId },
        attributes: [
          [sequelize.fn('SUM', sequelize.col('duration_seconds')), 'total_seconds']
        ],
        raw: true
      });

      const totalFocusSeconds = parseInt(totalResult.total_seconds) || 0;

      // Weekly data (last 7 days)
      const weeklyData = await this.getWeeklyData(userId);

      // Monthly data (current month)
      const monthlyData = await this.getMonthlyData(userId);

      // Subject breakdown
      const subjectData = await this.getSubjectBreakdown(userId);

      // Session type breakdown
      const sessionTypeData = await this.getSessionTypeBreakdown(userId);

      return {
        success: true,
        data: {
          total_focus_seconds: totalFocusSeconds,
          total_focus_formatted: this.formatSeconds(totalFocusSeconds),
          weekly_chart_data: weeklyData,
          monthly_chart_data: monthlyData,
          subject_pie_chart: subjectData,
          session_type_breakdown: sessionTypeData
        }
      };
    } catch (error) {
      throw error;
    }
  }

  // Get weekly data (last 7 days)
  async getWeeklyData(userId) {
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 6);

    const sessions = await StudySession.findAll({
      where: {
        user_id: userId,
        created_at: {
          [Op.gte]: sevenDaysAgo
        }
      },
      attributes: [
        [sequelize.fn('DATE', sequelize.col('created_at')), 'date'],
        [sequelize.fn('SUM', sequelize.col('duration_seconds')), 'total_seconds']
      ],
      group: [sequelize.fn('DATE', sequelize.col('created_at'))],
      raw: true
    });

    // Create array for all 7 days
    const dayNames = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
    const weekData = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayData = sessions.find(s => s.date === dateStr);
      
      weekData.push({
        day: dayNames[date.getDay()],
        date: dateStr,
        total_seconds: dayData ? parseInt(dayData.total_seconds) : 0
      });
    }

    return weekData;
  }

  // Get monthly data (current month, all days)
  async getMonthlyData(userId) {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const sessions = await StudySession.findAll({
      where: {
        user_id: userId,
        created_at: {
          [Op.gte]: firstDayOfMonth,
          [Op.lte]: lastDayOfMonth
        }
      },
      attributes: [
        [sequelize.fn('DATE', sequelize.col('created_at')), 'date'],
        [sequelize.fn('SUM', sequelize.col('duration_seconds')), 'total_seconds']
      ],
      group: [sequelize.fn('DATE', sequelize.col('created_at'))],
      raw: true
    });

    const monthData = [];
    const daysInMonth = lastDayOfMonth.getDate();

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(today.getFullYear(), today.getMonth(), day);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayData = sessions.find(s => s.date === dateStr);
      
      monthData.push({
        date: dateStr,
        day: day,
        total_seconds: dayData ? parseInt(dayData.total_seconds) : 0
      });
    }

    return monthData;
  }

  // Get subject breakdown
  async getSubjectBreakdown(userId) {
    const sessions = await StudySession.findAll({
      where: { user_id: userId },
      attributes: [
        'subject',
        [sequelize.fn('SUM', sequelize.col('duration_seconds')), 'total_seconds']
      ],
      group: ['subject'],
      raw: true
    });

    const colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'];
    let colorIndex = 0;

    return sessions.map(session => ({
      subject: session.subject || 'Diğer',
      total_seconds: parseInt(session.total_seconds),
      color: colors[colorIndex++ % colors.length]
    }));
  }

  // Get session type breakdown
  async getSessionTypeBreakdown(userId) {
    const sessions = await StudySession.findAll({
      where: { user_id: userId },
      attributes: [
        'session_type',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('SUM', sequelize.col('duration_seconds')), 'total_seconds']
      ],
      group: ['session_type'],
      raw: true
    });

    return sessions.map(session => ({
      type: session.session_type,
      count: parseInt(session.count),
      total_seconds: parseInt(session.total_seconds)
    }));
  }

  // Delete session
  async deleteSession(userId, sessionId) {
    try {
      const session = await StudySession.findOne({
        where: {
          id: sessionId,
          user_id: userId
        }
      });

      if (!session) {
        throw new Error('Session not found or unauthorized');
      }

      await session.destroy();

      return {
        success: true,
        message: 'Session deleted successfully'
      };
    } catch (error) {
      throw error;
    }
  }

  // Helper: Format seconds to readable format
  formatSeconds(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return {
      hours,
      minutes,
      seconds: secs,
      formatted: `${hours}s ${minutes}d ${secs}sn`
    };
  }
}

export default new StudySessionService();