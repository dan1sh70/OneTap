const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Public upload storage for listing images and campaign creatives
const publicStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/public');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `img-${uniqueSuffix}${ext}`);
  },
});

// Private upload storage for KYC & identity verification documents (never exposed statically)
const privateStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/private');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `doc-${uniqueSuffix}${ext}`);
  },
});

const imageFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|webp/;
  const ext = allowed.test(path.extname(file.originalname).toLowerCase());
  const mime = allowed.test(file.mimetype);

  if (ext && mime) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, and WebP image formats are permitted!'));
  }
};

const docFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|pdf/;
  const ext = allowed.test(path.extname(file.originalname).toLowerCase());

  if (ext) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF and image document formats are accepted!'));
  }
};

const uploadPublic = multer({
  storage: publicStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max per image
  fileFilter: imageFilter,
});

const uploadPrivate = multer({
  storage: privateStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max per document
  fileFilter: docFilter,
});

module.exports = {
  uploadPublic,
  uploadPrivate,
};
