import mongoose from 'mongoose';
import dns from 'dns';
import { config } from './env.js';

/**
 * Sanitize MongoDB URI to conceal sensitive authentication credentials in logs
 */
export const sanitizeMongoUri = (uri) => {
  if (!uri || typeof uri !== 'string') return '';
  return uri.replace(/(mongodb(?:\+srv)?:\/\/[^:]+:)([^@]+)(@.+)/i, '$1****$3');
};

/**
 * Sanitize error messages to ensure no credentials or raw URIs leak in stack traces
 */
export const sanitizeError = (err) => {
  if (!err) return '';
  const msg = err.message || (typeof err === 'string' ? err : JSON.stringify(err));
  return msg.replace(/(mongodb(?:\+srv)?:\/\/[^:]+:)([^@]+)(@.+)/gi, '$1****$3');
};

/**
 * Safely extract the host name from the connection or URI without exposing auth info
 */
export const extractHost = (conn, uri) => {
  if (conn?.host) return conn.host;
  if (conn?.connection?.host) return conn.connection.host;
  try {
    const clean = (uri || '').replace(/^mongodb(?:\+srv)?:\/\//, '');
    const withoutAuth = clean.includes('@') ? clean.split('@')[1] : clean;
    return withoutAuth.split('/')[0].split('?')[0];
  } catch {
    return 'unknown-host';
  }
};

/**
 * Safely extract database name from connection or URI
 */
export const extractDbName = (conn, uri) => {
  if (conn?.name) return conn.name;
  if (conn?.connection?.name) return conn.connection.name;
  try {
    const clean = (uri || '').replace(/^mongodb(?:\+srv)?:\/\//, '');
    const pathPart = clean.includes('/') ? clean.split('/')[1] : '';
    return pathPart.split('?')[0] || 'ktu-activity-points';
  } catch {
    return 'ktu-activity-points';
  }
};

/**
 * Connect exclusively to the configured MongoDB URI.
 * Automatic fallback to in-memory databases is completely disabled.
 */
export const connectDB = async () => {
  const uri = config.mongoUri;

  if (!uri || uri.trim() === '') {
    const errMessage = 'MONGODB_URI is not defined in environment variables (server/.env).';
    console.error(`\n❌ MongoDB Configuration Error: ${errMessage}`);
    console.error('⛔ Connection aborted: Server will NOT start without a valid MongoDB URI.\n');
    if (config.nodeEnv !== 'test') {
      process.exit(1);
    }
    throw new Error(errMessage);
  }

  // Configure public DNS resolvers for mongodb+srv:// to resolve SRV records reliably across all environments
  if (uri.startsWith('mongodb+srv://')) {
    try {
      dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
    } catch {
      // If setting custom DNS servers is not permitted, proceed with system DNS
    }
  }

  mongoose.set('strictQuery', false);

  // If already connected, return existing connection
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  const isAtlas = uri.startsWith('mongodb+srv://') || uri.includes('mongodb.net');
  const targetType = isAtlas ? 'Atlas' : (uri.includes('localhost') || uri.includes('127.0.0.1') ? 'Local' : 'Remote');

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 15000
    });

    const host = extractHost(conn, uri);
    const dbName = extractDbName(conn, uri);

    console.log('\n==================================================');
    console.log(`MongoDB target: ${targetType}`);
    console.log(`Host: ${host}`);
    console.log(`Database: ${dbName}`);
    console.log('==================================================');
    if (isAtlas) {
      console.log('✅ MongoDB Atlas connected\n');
    } else {
      console.log(`✅ MongoDB ${targetType} connected\n`);
    }

    return conn;
  } catch (err) {
    console.error('\n❌ MongoDB Connection Failed!');
    console.error(`   Underlying Error: ${sanitizeError(err)}`);
    if (err.name) console.error(`   Error Name: ${err.name}`);
    if (err.code) console.error(`   Error Code: ${err.code}`);
    if (err.cause) console.error(`   Error Cause: ${sanitizeError(err.cause)}`);
    console.error(`   Target URI: ${sanitizeMongoUri(uri)}`);
    console.error('⛔ In-memory fallback is disabled. Server will NOT start.\n');

    if (config.nodeEnv !== 'test') {
      process.exit(1);
    }
    throw err;
  }
};

/**
 * Disconnect cleanly from MongoDB
 */
export const disconnectDB = async () => {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    console.log('🔌 MongoDB Disconnected cleanly.');
  } catch (err) {
    console.error(`Error disconnecting MongoDB: ${sanitizeError(err)}`);
  }
};

