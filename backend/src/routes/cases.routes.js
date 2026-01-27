import { Router } from 'express';
import casesController from '../controllers/cases.controller.js';

const router = Router();

// GET /api/cases/search - Search cases
router.get('/search', casesController.search);

// GET /api/cases/:id - Get a single case
router.get('/:id', casesController.getById);

// PATCH /api/cases/:id - Update a case
router.patch('/:id', casesController.update);

export default router;
