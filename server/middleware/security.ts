import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { body, validationResult } from 'express-validator';
import CryptoJS from 'crypto-js';
import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';

// Rate limiting configurations
export const rateLimiters = {
  general: rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute
    message: { error: 'Too many requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
  }),

  auth: rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 5, // 5 auth attempts per minute
    message: { error: 'Too many authentication attempts, please try again later.' },
    skipSuccessfulRequests: true,
  }),

  sync: rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 10, // 10 sync requests per minute
    message: { error: 'Contact sync rate limit exceeded.' },
  }),

  webhooks: rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 1000, // 1000 webhook requests per minute
    skip: (req) => !req.path.includes('/api/twilio/'),
  }),
};

// Security headers middleware
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "wss:", "ws:"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
});

// Data encryption utilities
export class DataEncryption {
  private static readonly key = process.env.ENCRYPTION_KEY || 'default-key-change-in-production';

  static encrypt(text: string): string {
    try {
      return CryptoJS.AES.encrypt(text, this.key).toString();
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  static decrypt(encryptedText: string): string {
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedText, this.key);
      return bytes.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  static hashPhoneNumber(phoneNumber: string): string {
    return CryptoJS.SHA256(phoneNumber + this.key).toString();
  }
}

// Input validation schemas
export const validators = {
  contact: [
    body('firstName')
      .optional()
      .isLength({ min: 1, max: 50 })
      .matches(/^[a-zA-Z\s'-]+$/)
      .withMessage('Invalid first name format'),
    
    body('lastName')
      .optional()
      .isLength({ min: 1, max: 50 })
      .matches(/^[a-zA-Z\s'-]+$/)
      .withMessage('Invalid last name format'),
    
    body('phoneNumbers')
      .isArray({ min: 1 })
      .withMessage('At least one phone number required'),
    
    body('phoneNumbers.*')
      .matches(/^\+[1-9]\d{1,14}$/)
      .withMessage('Invalid phone number format'),
    
    body('email')
      .optional()
      .isEmail()
      .normalizeEmail()
      .withMessage('Invalid email format'),
    
    body('company')
      .optional()
      .isLength({ max: 100 })
      .escape(),
  ],

  contactRoute: [
    body('contactId')
      .isInt({ min: 1 })
      .withMessage('Valid contact ID required'),
    
    body('action')
      .isIn(['ai', 'forward', 'voicemail', 'block'])
      .withMessage('Invalid action type'),
    
    body('forwardTo')
      .optional()
      .matches(/^\+[1-9]\d{1,14}$/)
      .withMessage('Invalid forward number format'),
    
    body('priority')
      .optional()
      .isInt({ min: 1, max: 10 })
      .withMessage('Priority must be between 1 and 10'),
  ],

  aiConfig: [
    body('greeting')
      .isLength({ min: 10, max: 500 })
      .escape()
      .withMessage('Greeting must be 10-500 characters'),
    
    body('businessHours.start')
      .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
      .withMessage('Invalid start time format'),
    
    body('businessHours.end')
      .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
      .withMessage('Invalid end time format'),
  ],
};

// Validation error handler
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input data',
        details: errors.array()
      }
    });
  }
  next();
};

// Request sanitization middleware
export const sanitizeRequest = (req: Request, res: Response, next: NextFunction) => {
  const sanitize = (obj: any): any => {
    if (typeof obj === 'string') {
      return obj.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                .replace(/javascript:/gi, '')
                .replace(/on\w+\s*=/gi, '');
    }
    
    if (Array.isArray(obj)) {
      return obj.map(sanitize);
    }
    
    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const key in obj) {
        sanitized[key] = sanitize(obj[key]);
      }
      return sanitized;
    }
    
    return obj;
  };

  req.body = sanitize(req.body);
  req.query = sanitize(req.query);
  next();
};

// Security event logging
interface SecurityEvent {
  type: 'auth_failure' | 'rate_limit' | 'suspicious_activity' | 'validation_error';
  ip: string;
  userAgent?: string;
  userId?: string;
  details?: any;
  timestamp: Date;
}

class SecurityLogger {
  private events: SecurityEvent[] = [];

  log(event: Omit<SecurityEvent, 'timestamp'>) {
    const securityEvent: SecurityEvent = {
      ...event,
      timestamp: new Date(),
    };
    
    this.events.push(securityEvent);
    console.warn('Security Event:', securityEvent);
    
    if (event.type === 'suspicious_activity') {
      this.alertSecurityTeam(securityEvent);
    }
  }

  private alertSecurityTeam(event: SecurityEvent) {
    console.error('SECURITY ALERT:', event);
  }

  getRecentEvents(limit = 100): SecurityEvent[] {
    return this.events.slice(-limit);
  }
}

export const securityLogger = new SecurityLogger();

// Security monitoring middleware
export const securityMonitoring = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  const ip = req.ip || req.connection.remoteAddress;
  const userAgent = req.get('User-Agent');
  
  // Check for suspicious user agents
  if (userAgent && /curl|wget|python|ruby|java|golang/i.test(userAgent)) {
    securityLogger.log({
      type: 'suspicious_activity',
      ip: ip || 'unknown',
      userAgent,
      details: { suspiciousUserAgent: true }
    });
  }
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    if (res.statusCode >= 400) {
      securityLogger.log({
        type: res.statusCode === 401 ? 'auth_failure' : 'validation_error',
        ip: ip || 'unknown',
        userAgent,
        details: {
          statusCode: res.statusCode,
          path: req.path,
          method: req.method,
          duration
        }
      });
    }
  });
  
  next();
};