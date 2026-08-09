import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getPermissionsForRole, hasPermission, type PermissionAction, type PermissionMap, type PermissionModule } from '@shared/permissions';

export interface AuthenticatedUser {
  id: number;
  email: string;
  username: string;
  role: string;
  organizationId: string;
  permissions?: PermissionMap;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-in-production-use-env-var';

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const token = authHeader.substring(7);
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as AuthenticatedUser;
      req.user = decoded;
      next();
    } catch (jwtError: any) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({ message: "Token expired" });
      }
      return res.status(401).json({ message: "Invalid token" });
    }
  } catch (error) {
    console.error("Authentication error:", error);
    return res.status(500).json({ message: "Authentication failed" });
  }
}

export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as AuthenticatedUser;
        req.user = decoded;
      } catch (jwtError) {
        // Invalid token, but don't reject the request
      }
    }
    
    next();
  } catch (error) {
    // Continue without user
    next();
  }
}

export function signToken(payload: AuthenticatedUser): string {
  return jwt.sign({
    ...payload,
    permissions: payload.permissions || getPermissionsForRole(payload.role),
  }, JWT_SECRET, { expiresIn: '24h' });
}

export function requirePermission(module: PermissionModule, action: PermissionAction = 'read') {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;

    if (!user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const permissions = user.permissions || getPermissionsForRole(user.role);

    if (!hasPermission(permissions, module, action)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    next();
  };
}
