import dotenv from 'dotenv';

dotenv.config();

export const env = {
  PORT: parseInt(process.env.PORT || '3001', 10),
  MONGODB_URI:
    process.env.MONGODB_URI ||
    'mongodb://umesh:umesh@192.168.29.225:27017/dropzone?authSource=admin&directConnection=true&replicaSet=rs0',
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
  JWT_SECRET: process.env.JWT_SECRET || 'dropzone-dev-secret-change-in-production',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '30d',
  NODE_ENV: process.env.NODE_ENV || 'development',
};
