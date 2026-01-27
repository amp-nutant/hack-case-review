import { Router } from 'express';
import multer from 'multer';
import uploadController from '../controllers/upload.controller.js';

const router = Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/json',
    ];
    
    const ext = file.originalname.split('.').pop().toLowerCase();
    const allowedExts = ['csv', 'xlsx', 'xls', 'json'];
    
    if (allowedTypes.includes(file.mimetype) || allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Supported: CSV, Excel, JSON'), false);
    }
  },
});

// POST /api/upload - Upload a file
router.post('/', upload.single('file'), uploadController.uploadFile);

// GET /api/upload/:id/status - Get upload/processing status
router.get('/:id/status', uploadController.getStatus);

export default router;
