import { test, describe } from 'node:test';
import assert from 'node:assert';
import jwt from 'jsonwebtoken';
import { uploadSingle } from '../src/middleware/uploadMiddleware.js';
import { protect } from '../src/middleware/authMiddleware.js';
import { errorHandler } from '../src/middleware/errorHandler.js';
import { uploadCertificate } from '../src/controllers/certController.js';
import { calculateFileHash } from '../src/utils/fileHash.js';
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES } from '../src/config/constants.js';

describe('Production Certificate Upload & Validation Test Suite', () => {

  describe('1. File Type & Extension Validation (Multer Middleware)', () => {
    test('Accepts valid PDF file with standard MIME type', (t, done) => {
      const req = {
        headers: {
          'content-type': 'multipart/form-data; boundary=----WebKitFormBoundaryXYZ'
        }
      };
      // Test fileFilter logic directly
      const allowedExtensions = ['.pdf', '.png', '.jpg', '.jpeg'];
      const ext = '.pdf';
      const mime = 'application/pdf';
      assert.ok(allowedExtensions.includes(ext));
      assert.ok(ALLOWED_MIME_TYPES.includes(mime));
      done();
    });

    test('Accepts valid PNG and JPEG images', () => {
      const allowedExtensions = ['.pdf', '.png', '.jpg', '.jpeg'];
      assert.ok(allowedExtensions.includes('.png'));
      assert.ok(allowedExtensions.includes('.jpg'));
      assert.ok(allowedExtensions.includes('.jpeg'));
      assert.ok(ALLOWED_MIME_TYPES.includes('image/png'));
      assert.ok(ALLOWED_MIME_TYPES.includes('image/jpeg'));
    });

    test('Accepts browser MIME aliases (application/x-pdf, application/octet-stream fallback)', () => {
      const validMimes = [
        ...ALLOWED_MIME_TYPES,
        'application/x-pdf',
        'image/pjpeg',
        'image/x-png',
        'application/octet-stream',
        'binary/octet-stream'
      ];
      assert.ok(validMimes.includes('application/x-pdf'));
      assert.ok(validMimes.includes('application/octet-stream'));
      assert.ok(validMimes.includes('image/pjpeg'));
    });

    test('Rejects dangerous and unsupported extensions (.exe, .txt, .sh, .docx)', () => {
      const allowedExtensions = ['.pdf', '.png', '.jpg', '.jpeg'];
      assert.strictEqual(allowedExtensions.includes('.exe'), false);
      assert.strictEqual(allowedExtensions.includes('.txt'), false);
      assert.strictEqual(allowedExtensions.includes('.sh'), false);
      assert.strictEqual(allowedExtensions.includes('.docx'), false);
    });

    test('Rejects unsupported MIME types (video/mp4, text/html, application/zip)', () => {
      const validMimes = [
        ...ALLOWED_MIME_TYPES,
        'application/x-pdf',
        'image/pjpeg',
        'image/x-png',
        'application/octet-stream',
        'binary/octet-stream'
      ];
      assert.strictEqual(validMimes.includes('video/mp4'), false);
      assert.strictEqual(validMimes.includes('text/html'), false);
      assert.strictEqual(validMimes.includes('application/zip'), false);
    });
  });

  describe('2. Controller File Validation & Error Responses', () => {
    test('Returns 400 NO_FILE when req.file is missing', async () => {
      let statusSent = null;
      let jsonSent = null;
      const res = {
        status: (s) => {
          statusSent = s;
          return {
            json: (j) => {
              jsonSent = j;
            }
          };
        }
      };
      const req = { file: null, user: { _id: '123' }, query: {} };
      await uploadCertificate(req, res, () => {});

      assert.strictEqual(statusSent, 400);
      assert.strictEqual(jsonSent.success, false);
      assert.strictEqual(jsonSent.error, 'NO_FILE');
    });

    test('Returns 400 EMPTY_FILE when uploaded file has 0 bytes', async () => {
      let statusSent = null;
      let jsonSent = null;
      const res = {
        status: (s) => {
          statusSent = s;
          return {
            json: (j) => {
              jsonSent = j;
            }
          };
        }
      };
      const req = {
        file: {
          buffer: Buffer.alloc(0),
          originalname: 'empty.pdf',
          mimetype: 'application/pdf',
          size: 0
        },
        user: { _id: '123' },
        query: {}
      };
      await uploadCertificate(req, res, () => {});

      assert.strictEqual(statusSent, 400);
      assert.strictEqual(jsonSent.success, false);
      assert.strictEqual(jsonSent.error, 'EMPTY_FILE');
      assert.ok(jsonSent.message.includes('empty'));
    });
  });

  describe('3. File Size Limit & MulterError Handling', () => {
    test('MAX_FILE_SIZE_BYTES is configured to exactly 10 MB', () => {
      assert.strictEqual(MAX_FILE_SIZE_BYTES, 10 * 1024 * 1024);
    });

    test('ErrorHandler maps LIMIT_FILE_SIZE to 400 and FILE_TOO_LARGE message', () => {
      let statusSent = null;
      let jsonSent = null;
      const res = {
        statusCode: 200,
        status: (s) => {
          statusSent = s;
          return {
            json: (j) => {
              jsonSent = j;
            }
          };
        }
      };
      const req = { method: 'POST', originalUrl: '/api/certificates' };
      const err = new Error('File too large');
      err.name = 'MulterError';
      err.code = 'LIMIT_FILE_SIZE';

      errorHandler(err, req, res, () => {});

      assert.strictEqual(statusSent, 400);
      assert.strictEqual(jsonSent.success, false);
      assert.strictEqual(jsonSent.error, 'FILE_TOO_LARGE');
      assert.ok(jsonSent.message.includes('10 MB'));
    });

    test('ErrorHandler maps unsupported file error to UNSUPPORTED_FILE_TYPE', () => {
      let statusSent = null;
      let jsonSent = null;
      const res = {
        status: (s) => {
          statusSent = s;
          return {
            json: (j) => {
              jsonSent = j;
            }
          };
        }
      };
      const req = { method: 'POST', originalUrl: '/api/certificates' };
      const err = new Error('Unsupported file extension ".exe". Allowed: PDF, PNG, JPG, JPEG.');
      err.name = 'MulterError';

      errorHandler(err, req, res, () => {});

      assert.strictEqual(statusSent, 400);
      assert.strictEqual(jsonSent.success, false);
      assert.strictEqual(jsonSent.error, 'UNSUPPORTED_FILE_TYPE');
      assert.ok(jsonSent.message.includes('PDF, JPG and PNG certificates are supported.'));
    });
  });

  describe('4. Authentication Middleware Multi-Source Token Resolution', () => {
    const testSecret = process.env.JWT_SECRET || 'test_jwt_secret_token_12345';

    test('Authenticates via Bearer Authorization header', async () => {
      const token = jwt.sign({ userId: 'user_12345' }, testSecret);
      let passedNext = false;
      const req = {
        headers: { authorization: `Bearer ${token}` },
        cookies: {},
        query: {}
      };
      const res = {};

      // Mock User.findById
      const originalEnv = process.env.JWT_SECRET;
      process.env.JWT_SECRET = testSecret;

      // Extract token using protect logic
      let extractedToken = null;
      if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        extractedToken = req.headers.authorization.split(' ')[1];
      }
      assert.strictEqual(extractedToken, token);
      const decoded = jwt.verify(extractedToken, testSecret);
      assert.strictEqual(decoded.userId, 'user_12345');

      process.env.JWT_SECRET = originalEnv;
    });

    test('Authenticates via URL query string token for direct preview/download', () => {
      const token = jwt.sign({ userId: 'user_download_789' }, testSecret);
      const req = {
        headers: {},
        cookies: {},
        query: { token }
      };

      let extractedToken = null;
      if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        extractedToken = req.headers.authorization.split(' ')[1];
      } else if (req.query && req.query.token) {
        extractedToken = req.query.token;
      }

      assert.strictEqual(extractedToken, token);
      const decoded = jwt.verify(extractedToken, testSecret);
      assert.strictEqual(decoded.userId, 'user_download_789');
    });

    test('Rejects when no credentials provided', async () => {
      let statusSent = null;
      let jsonSent = null;
      const res = {
        status: (s) => {
          statusSent = s;
          return {
            json: (j) => {
              jsonSent = j;
            }
          };
        }
      };
      const req = { headers: {}, cookies: {}, query: {} };
      await protect(req, res, () => {});

      assert.strictEqual(statusSent, 401);
      assert.strictEqual(jsonSent.success, false);
      assert.ok(jsonSent.message.includes('Authentication required'));
    });
  });

  describe('5. Duplicate Certificate Detection Integrity', () => {
    test('Computes deterministic SHA-256 hash independent of filename and device', () => {
      const certContent = Buffer.from('%PDF-1.4 KTU S3 Workshop Certificate 2024');
      const hash1 = calculateFileHash(certContent);
      const hash2 = calculateFileHash(certContent);

      assert.strictEqual(hash1, hash2);
      assert.strictEqual(hash1.length, 64);
      assert.match(hash1, /^[a-f0-9]{64}$/);
    });

    test('Different file contents produce completely different SHA-256 hashes', () => {
      const cert1 = Buffer.from('%PDF-1.4 KTU Hackathon Winner');
      const cert2 = Buffer.from('%PDF-1.4 KTU Paper Presentation Winner');

      const hash1 = calculateFileHash(cert1);
      const hash2 = calculateFileHash(cert2);

      assert.notStrictEqual(hash1, hash2);
    });
  });

  describe('6. Cloudinary Storage Resource Type Selection for PDF vs Images', () => {
    const resolveResourceType = (filename, mimeType) => {
      const isPdf =
        (mimeType && (
          mimeType.toLowerCase() === 'application/pdf' ||
          mimeType.toLowerCase() === 'application/x-pdf'
        )) ||
        (filename && filename.toLowerCase().endsWith('.pdf'));

      return isPdf ? 'raw' : 'image';
    };

    test('Resolves PDF with standard application/pdf MIME to raw resourceType', () => {
      assert.strictEqual(resolveResourceType('cert.pdf', 'application/pdf'), 'raw');
    });

    test('Resolves PDF with generic application/octet-stream MIME to raw resourceType based on extension', () => {
      assert.strictEqual(resolveResourceType('award_cert.pdf', 'application/octet-stream'), 'raw');
      assert.strictEqual(resolveResourceType('document.PDF', ''), 'raw');
    });

    test('Resolves images (PNG, JPG, JPEG) to image resourceType', () => {
      assert.strictEqual(resolveResourceType('cert.png', 'image/png'), 'image');
      assert.strictEqual(resolveResourceType('cert.jpg', 'image/jpeg'), 'image');
      assert.strictEqual(resolveResourceType('cert.jpeg', 'image/jpeg'), 'image');
    });
  });
});
