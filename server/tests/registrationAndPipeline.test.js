import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { User } from '../src/models/User.js';
import { StudentProfile } from '../src/models/StudentProfile.js';
import { Certificate } from '../src/models/Certificate.js';
import { SchemeResolver } from '../src/services/scheme/SchemeResolver.js';
import { certificatePipeline } from '../src/services/pipeline/CertificateProcessingPipeline.js';
import { certificateStorage } from '../src/services/storage/CertificateStorageService.js';
import { calculateFileHash } from '../src/utils/fileHash.js';
import { PROCESSING_STATUS } from '../src/config/constants.js';

describe('Student Registration & Certificate Pipeline End-to-End Test Suite', () => {
  let createdUserId = null;
  let createdProfileId = null;
  let createdCertId = null;

  before(async () => {
    await connectDB();
  });

  after(async () => {
    if (createdCertId) {
      await Certificate.findByIdAndDelete(createdCertId).catch(() => {});
    }
    if (createdProfileId) {
      await StudentProfile.findByIdAndDelete(createdProfileId).catch(() => {});
    }
    if (createdUserId) {
      await User.findByIdAndDelete(createdUserId).catch(() => {});
    }
    await disconnectDB();
  });

  test('Step 1-5: Registers a brand-new student, creates User & StudentProfile atomically with matching userId and resolved scheme', async () => {
    const timestamp = Date.now();
    const testEmail = `test_student_${timestamp}@ktu.edu.in`;
    const testRegNo = `TCR${timestamp.toString().slice(-4)}CS001`;
    const passwordHash = await User.hashPassword('SuperSecret123!');

    // 1. Resolve scheme
    const resolvedScheme = SchemeResolver.resolveScheme({
      admissionYear: 2022,
      entryType: 'regular',
      program: 'B.Tech',
      branch: 'Computer Science and Engineering'
    });

    assert.strictEqual(resolvedScheme.scheme, '2019');
    assert.strictEqual(resolvedScheme.requiredPoints, 100);

    // 2. Create User
    const user = await User.create({
      name: 'Integration Test Student',
      email: testEmail,
      passwordHash
    });
    createdUserId = user._id;
    assert.ok(user._id);

    // 3. Create StudentProfile linked to user._id
    const profile = await StudentProfile.create({
      userId: user._id,
      registerNumber: testRegNo,
      program: 'B.Tech',
      branch: 'Computer Science and Engineering',
      admissionYear: 2022,
      entryType: resolvedScheme.entryType,
      scheme: resolvedScheme.scheme,
      ruleVersion: resolvedScheme.ruleVersion,
      requiredPoints: resolvedScheme.requiredPoints,
      maximumPoints: resolvedScheme.maximumPoints
    });
    createdProfileId = profile._id;

    // 4. Verify StudentProfile.userId matches User._id exactly
    assert.strictEqual(profile.userId.toString(), user._id.toString());
    assert.strictEqual(profile.scheme, '2019');
    assert.strictEqual(profile.entryType, 'regular');
    assert.strictEqual(profile.requiredPoints, 100);

    // 5. Query MongoDB directly to confirm persistence
    const fetchedProfile = await StudentProfile.findOne({ userId: user._id });
    assert.ok(fetchedProfile);
    assert.strictEqual(fetchedProfile.registerNumber, testRegNo);
  });

  test('Step 6-11: Uploads certificate, locates StudentProfile by userId, runs AI pipeline, calls certificate.save(), and persists result', async () => {
    assert.ok(createdUserId, 'User must exist from previous step');

    // Create a mock certificate PDF buffer
    const mockPdfBuffer = Buffer.from(
      '%PDF-1.4\n1 0 obj\n<< /Title (National Level Hackathon Winner Certificate) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF'
    );
    const fileHash = calculateFileHash(mockPdfBuffer);

    const { storageKey } = await certificateStorage.saveCertificate({
      buffer: mockPdfBuffer,
      filename: 'national_hackathon_award.pdf',
      mimeType: 'application/pdf',
      userId: createdUserId.toString()
    });

    // Create Certificate document in MongoDB
    const initialCert = await Certificate.create({
      userId: createdUserId,
      originalFilename: 'national_hackathon_award.pdf',
      storageKey,
      fileHash,
      mimeType: 'application/pdf',
      fileSizeBytes: mockPdfBuffer.length,
      processingStatus: PROCESSING_STATUS.PROCESSING,
      statusReason: 'Uploaded for testing.'
    });
    createdCertId = initialCert._id;

    // Execute pipeline passing the Mongoose document
    const processedDoc = await certificatePipeline.process(initialCert);

    // Verify pipeline result
    assert.ok(processedDoc, 'Processed document must be returned');
    assert.ok(processedDoc._id, 'Processed document must have _id');
    assert.notStrictEqual(
      processedDoc.processingStatus,
      PROCESSING_STATUS.PROCESSING,
      'Status must no longer be PROCESSING'
    );

    // Query database to ensure certificate.save() persisted cleanly
    const savedInDb = await Certificate.findById(createdCertId);
    assert.ok(savedInDb);
    assert.strictEqual(savedInDb.userId.toString(), createdUserId.toString());
    assert.ok(savedInDb.processedAt instanceof Date);
    assert.ok(
      [
        PROCESSING_STATUS.COUNTED,
        PROCESSING_STATUS.NOT_ELIGIBLE,
        PROCESSING_STATUS.INSUFFICIENT_EVIDENCE,
        PROCESSING_STATUS.DUPLICATE,
        PROCESSING_STATUS.FAILED
      ].includes(savedInDb.processingStatus)
    );
  });

  test('Step 12: Pipeline handles ObjectId and string ID arguments safely without throwing TypeError: certificate.save is not a function', async () => {
    assert.ok(createdUserId);

    const mockBuffer = Buffer.from('mock certificate content for string id test');
    const fileHash = calculateFileHash(mockBuffer);

    const { storageKey } = await certificateStorage.saveCertificate({
      buffer: mockBuffer,
      filename: 'test_id_passing.pdf',
      mimeType: 'application/pdf',
      userId: createdUserId.toString()
    });

    const cert = await Certificate.create({
      userId: createdUserId,
      originalFilename: 'test_id_passing.pdf',
      storageKey,
      fileHash,
      mimeType: 'application/pdf',
      fileSizeBytes: mockBuffer.length,
      processingStatus: PROCESSING_STATUS.PROCESSING
    });

    // Pass string ID (like from route params or queued job)
    const resultFromString = await certificatePipeline.process(cert._id.toString());
    assert.ok(resultFromString);
    assert.ok(resultFromString._id);
    assert.strictEqual(typeof resultFromString.save, 'function');

    await Certificate.findByIdAndDelete(cert._id).catch(() => {});
  });
});
