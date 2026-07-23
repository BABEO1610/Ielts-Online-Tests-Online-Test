const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const AppError = require('../../utils/AppError');

const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const CRITERIA = [
  'fluency_coherence',
  'lexical_resource',
  'grammatical_range_accuracy',
  'pronunciation',
];

const calibrationError = (message, code) => new AppError(message, 503, code);
const hash = (value) => crypto.createHash('sha256').update(value).digest('hex');

const deepFreeze = (value) => {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
};

const validateCriterionGate = (value) => value
  && Number.isInteger(value.minimum_speakers)
  && value.minimum_speakers > 0
  && Number.isFinite(value.minimum_lower_95_ci)
  && value.minimum_lower_95_ci >= 0
  && value.minimum_lower_95_ci <= 1;

const validateBundleShape = (bundle) => {
  const valid = bundle?.schema_version === 1
    && typeof bundle.version === 'string'
    && SHA256_PATTERN.test(bundle.scoring_config_sha256 || '')
    && typeof bundle.population === 'string'
    && !Number.isNaN(Date.parse(bundle.approved_at))
    && Array.isArray(bundle.approved_by)
    && bundle.approved_by.length >= 2
    && CRITERIA.every((key) => validateCriterionGate(bundle.criteria?.[key]));
  if (!valid) throw calibrationError('Calibration bundle không đúng schema.', 'CALIBRATION_SCHEMA_INVALID');
};

const verifySignature = ({ raw, publicKey, signature }) => {
  if (!publicKey || !signature) {
    throw calibrationError('Calibration bundle thiếu chữ ký phát hành.', 'CALIBRATION_SIGNATURE_REQUIRED');
  }
  const valid = crypto.verify(null, raw, publicKey, Buffer.from(signature, 'base64'));
  if (!valid) throw calibrationError('Chữ ký calibration bundle không hợp lệ.', 'CALIBRATION_SIGNATURE_INVALID');
};

const loadCalibrationBundle = async ({
  bundlePath,
  expectedSha256,
  expectedScoringConfigSha256,
  publicKey,
  signature,
  requireSignature = true,
} = {}) => {
  if (!bundlePath || !expectedSha256) return null;
  const raw = await fs.readFile(bundlePath);
  if (hash(raw) !== expectedSha256) {
    throw calibrationError('Digest calibration bundle không khớp.', 'CALIBRATION_DIGEST_MISMATCH');
  }
  if (requireSignature) verifySignature({ raw, publicKey, signature });
  let bundle;
  try {
    bundle = JSON.parse(raw.toString('utf8'));
  } catch {
    throw calibrationError('Calibration bundle không phải JSON hợp lệ.', 'CALIBRATION_SCHEMA_INVALID');
  }
  validateBundleShape(bundle);
  if (expectedScoringConfigSha256 && bundle.scoring_config_sha256 !== expectedScoringConfigSha256) {
    throw calibrationError('Calibration bundle không khớp scoring config.', 'CALIBRATION_BINDING_MISMATCH');
  }
  return deepFreeze(bundle);
};

const calibrationGate = ({ publishEnabled, bundle, scoringConfigSha256 }) => {
  if (!publishEnabled) return { allowed: false, reason: 'FEATURE_FLAG_DISABLED' };
  if (!bundle) return { allowed: false, reason: 'CALIBRATION_BUNDLE_MISSING' };
  if (bundle.scoring_config_sha256 !== scoringConfigSha256) {
    return { allowed: false, reason: 'CALIBRATION_BINDING_MISMATCH' };
  }
  return { allowed: true, reason: null };
};

module.exports = { calibrationGate, loadCalibrationBundle, validateBundleShape };
