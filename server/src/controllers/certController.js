import path from 'path';
import { Certificate } from '../models/Certificate.js';
import { certificateStorage } from '../services/storage/CertificateStorageService.js';
import { calculateFileHash } from '../utils/fileHash.js';
import { certificatePipeline } from '../services/pipeline/CertificateProcessingPipeline.js';
import { PROCESSING_STATUS } from '../config/constants.js';

export const uploadCertificate = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please attach a valid certificate file (PDF, PNG, JPG).'
      });
    }

    const { buffer, originalname, mimetype, size } = req.file;
    const userId = req.user._id;

    // 1. Generate SHA-256 file hash
    const fileHash = calculateFileHash(buffer);

    // 2. Save original document to storage provider
    const { storageKey } = await certificateStorage.saveCertificate({
      buffer,
      filename: originalname,
      mimeType: mimetype,
      userId: userId.toString()
    });

    // 3. Create initial Certificate record in MongoDB
    const certificate = await Certificate.create({
      userId,
      originalFilename: originalname,
      storageKey,
      fileHash,
      mimeType: mimetype,
      fileSizeBytes: size,
      processingStatus: PROCESSING_STATUS.PROCESSING,
      statusReason: 'Document uploaded. Pipeline processing started.'
    });

    // 4. Trigger processing pipeline
    // Execute in background (or synchronously if requested)
    const isAsync = req.query.sync !== 'true';

    if (isAsync) {
      // Background non-blocking execution
      setImmediate(async () => {
        try {
          await certificatePipeline.process(certificate);
        } catch (err) {
          console.error(`Background processing error: ${err.message}`);
        }
      });

      return res.status(202).json({
        success: true,
        message: 'Certificate uploaded and queued for AI analysis.',
        certificate
      });
    } else {
      // Synchronous execution (direct response)
      const processedCert = await certificatePipeline.process(certificate);
      const isFailed = processedCert.processingStatus === PROCESSING_STATUS.FAILED;
      return res.status(isFailed ? 422 : 201).json({
        success: !isFailed,
        message: isFailed
          ? `Certificate processing completed with issues: ${processedCert.statusReason}`
          : 'Certificate processed successfully.',
        certificate: processedCert
      });
    }
  } catch (err) {
    next(err);
  }
};

export const getCertificates = async (req, res, next) => {
  try {
    const { category, status, search, sortBy = 'uploadedAt', sortOrder = 'desc' } = req.query;

    const query = { userId: req.user._id };

    if (category) {
      query.activityCategory = category;
    }

    if (status) {
      query.processingStatus = status;
    }

    if (search) {
      query.$or = [
        { certificateTitle: { $regex: search, $options: 'i' } },
        { eventName: { $regex: search, $options: 'i' } },
        { subcategory: { $regex: search, $options: 'i' } },
        { certificateNumber: { $regex: search, $options: 'i' } }
      ];
    }

    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const certificates = await Certificate.find(query).sort(sort).lean();

    res.status(200).json({
      success: true,
      count: certificates.length,
      certificates
    });
  } catch (err) {
    next(err);
  }
};

export const getCertificateById = async (req, res, next) => {
  try {
    const certificate = await Certificate.findById(req.params.id);

    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: 'Certificate not found.'
      });
    }

    // Strict ownership verification
    if (certificate.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized: You do not own this certificate.'
      });
    }

    res.status(200).json({
      success: true,
      certificate
    });
  } catch (err) {
    next(err);
  }
};

export const deleteCertificate = async (req, res, next) => {
  try {
    const certificate = await Certificate.findById(req.params.id);

    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: 'Certificate not found.'
      });
    }

    // Strict ownership verification
    if (certificate.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized: You do not own this certificate.'
      });
    }

    // Delete stored file
    await certificateStorage.deleteCertificate(certificate.storageKey);

    // Delete database record
    await certificate.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Certificate removed successfully.'
    });
  } catch (err) {
    next(err);
  }
};

export const reprocessCertificate = async (req, res, next) => {
  try {
    const certificate = await Certificate.findById(req.params.id);

    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: 'Certificate not found.'
      });
    }

    // Strict ownership check
    if (certificate.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized: You do not own this certificate.'
      });
    }

    certificate.processingStatus = PROCESSING_STATUS.PROCESSING;
    certificate.statusReason = 'Manual re-processing initiated.';
    await certificate.save();

    const processed = await certificatePipeline.process(certificate);

    res.status(200).json({
      success: true,
      message: 'Certificate re-processed.',
      certificate: processed
    });
  } catch (err) {
    next(err);
  }
};

export const streamCertificateFile = async (req, res, next) => {
  try {
    const certificate = await Certificate.findById(req.params.id);

    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: 'Certificate file not found.'
      });
    }

    // Strict ownership check
    if (certificate.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized: You do not have access to this certificate file.'
      });
    }

    const buffer = await certificateStorage.getCertificate(certificate.storageKey);
    if (!buffer) {
      return res.status(404).json({
        success: false,
        message: 'File not found on storage provider.'
      });
    }

    res.setHeader('Content-Type', certificate.mimeType);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${certificate.originalFilename}"`
    );
    res.send(buffer);
  } catch (err) {
    next(err);
  }
};
