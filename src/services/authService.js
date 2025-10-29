import jwt from 'jsonwebtoken';
import User from '../models/user.js';

class AuthService {
  // Generate JWT Token
  generateToken(userId) {
    return jwt.sign(
      { id: userId },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );
  }

  // Register new user
  async register(userData) {
    try {
      // Check if user already exists
      const existingUser = await User.findOne({
        where: {
          email: userData.email
        }
      });

      if (existingUser) {
        throw new Error('User with this email already exists');
      }

      const existingUsername = await User.findOne({
        where: {
          username: userData.username
        }
      });

      if (existingUsername) {
        throw new Error('Username already taken');
      }

      // Create new user
      const user = await User.create({
        username: userData.username,
        email: userData.email,
        password: userData.password,
        role: userData.role || 'user',
        provider: 'local'
      });

      // Generate token
      const token = this.generateToken(user.id);

      return {
        success: true,
        message: 'User registered successfully',
        data: {
          user: user.toSafeObject(),
          token
        }
      };
    } catch (error) {
      throw error;
    }
  }

  // Login user
  async login(email, password) {
    try {
      // Find user by email
      const user = await User.findOne({
        where: { email }
      });

      if (!user) {
        throw new Error('Invalid credentials');
      }

      // Check if user is local provider
      if (user.provider !== 'local') {
        throw new Error(`Please login with ${user.provider}`);
      }

      // Verify password
      const isPasswordValid = await user.comparePassword(password);

      if (!isPasswordValid) {
        throw new Error('Invalid credentials');
      }

      // Generate token
      const token = this.generateToken(user.id);

      return {
        success: true,
        message: 'Login successful',
        data: {
          user: user.toSafeObject(),
          token
        }
      };
    } catch (error) {
      throw error;
    }
  }

  // Get current user profile
  async getProfile(userId) {
    try {
      const user = await User.findByPk(userId, {
        attributes: { exclude: ['password'] }
      });

      if (!user) {
        throw new Error('User not found');
      }

      return {
        success: true,
        data: user
      };
    } catch (error) {
      throw error;
    }
  }

  // Update user profile
  async updateProfile(userId, updateData) {
    try {
      const user = await User.findByPk(userId);

      if (!user) {
        throw new Error('User not found');
      }

      // Only allow updating certain fields
      const allowedUpdates = ['username', 'avatar_id'];
      const updates = {};

      allowedUpdates.forEach(field => {
        if (updateData[field] !== undefined) {
          updates[field] = updateData[field];
        }
      });

      await user.update(updates);

      return {
        success: true,
        message: 'Profile updated successfully',
        data: user.toSafeObject()
      };
    } catch (error) {
      throw error;
    }
  }
}

export default new AuthService();