import authService from '../services/authService.js';
import Joi from 'joi';

class AuthController {
  // Validation schemas
  registerSchema = Joi.object({
    username: Joi.string().min(3).max(50).required().messages({
      'string.min': 'Username must be at least 3 characters',
      'string.max': 'Username cannot exceed 50 characters',
      'any.required': 'Username is required'
    }),
    email: Joi.string().email().required().messages({
      'string.email': 'Please provide a valid email',
      'any.required': 'Email is required'
    }),
    password: Joi.string().min(6).required().messages({
      'string.min': 'Password must be at least 6 characters',
      'any.required': 'Password is required'
    }),
    confirmPassword: Joi.string().valid(Joi.ref('password')).required().messages({
      'any.only': 'Passwords do not match',
      'any.required': 'Confirm password is required'
    })
  });

  loginSchema = Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'Please provide a valid email',
      'any.required': 'Email is required'
    }),
    password: Joi.string().required().messages({
      'any.required': 'Password is required'
    })
  });

  updateProfileSchema = Joi.object({
    username: Joi.string().min(3).max(50).optional(),
    avatar_id: Joi.number().integer().optional()
  });

  // Register new user
  // AuthController.js içindeki register fonksiyonu

async register(req, res) {
  // EKLENECEK KOD 1: Gelen isteğin body'sini görelim
  console.log('--- YENİ KAYIT İSTEĞİ GELDİ ---');
  console.log('Request Body:', req.body);

  try {
    // Validate request body
    const { error, value } = this.registerSchema.validate(req.body);

    // EKLENECEK KOD 2: Joi'nin sonucunu görelim
    console.log('Joi Validation Sonucu:', { error: error ? error.details[0].message : null, value });

    if (error) {
      console.log('Hata bulundu, 400 cevabı dönülüyor.'); // Hata bloğuna girip girmediğini görelim
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message)
      });
    }

    console.log('Doğrulama başarılı. "value" destructure edilecek.'); // Bu satırı görüyorsak sorun yok demektir.

    // Remove confirmPassword before passing to service
    const { confirmPassword, ...userData } = value;

    console.log('Servise gönderilecek veri:', userData); // Servise ne gönderdiğimizi görelim

    const result = await authService.register(userData);

    return res.status(201).json(result);
  } catch (error) {
    // EKLENECEK KOD 3: Eğer kod çökerse hatayı terminalde de görelim
    console.error('!!! CATCH BLOĞUNA DÜŞTÜ !!!', error); 

    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
}
  // Login user
  async login(req, res) {
    try {
      // Validate request body
      const { error, value } = this.loginSchema.validate(req.body);
      
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.details.map(detail => detail.message)
        });
      }

      const { email, password } = value;
      const result = await authService.login(email, password);

      return res.status(200).json(result);
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get current user profile
  async getProfile(req, res) {
    try {
      const result = await authService.getProfile(req.user.id);
      return res.status(200).json(result);
    } catch (error) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
  }

  // Update user profile
  async updateProfile(req, res) {
    try {
      // Validate request body
      const { error, value } = this.updateProfileSchema.validate(req.body);
      
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.details.map(detail => detail.message)
        });
      }

      const result = await authService.updateProfile(req.user.id, value);
      return res.status(200).json(result);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Logout (client-side token removal)
  async logout(req, res) {
    return res.status(200).json({
      success: true,
      message: 'Logout successful'
    });
  }
}

export default new AuthController();