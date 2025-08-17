import jwt from 'jsonwebtoken';

interface TokenPayload {
  sub: string;
  role?: string;
}

export const generateToken = (userId: string, role?: string): string => {
  return jwt.sign(
    { sub: userId, role },
    process.env.JWT_SECRET!,
    { expiresIn: '15m' } // Short-lived token
  );
};

export const verifyToken = (token: string): TokenPayload => {
  return jwt.verify(token, process.env.JWT_SECRET!) as TokenPayload;
};