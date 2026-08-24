import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth';
import {
  generateRecommendationsController,
  getRecommendationsController,
  getRecommendationByIdController,
  approveRecommendationController,
  overrideRecommendationController,
} from '../controllers/recommendation.controller';

const router = Router();
router.use(authenticate);

router.post(
  '/generate',
  authorize('admin', 'doctor', 'nurse'),
  generateRecommendationsController
);

router.get(
  '/',
  authorize('admin', 'reception', 'doctor', 'nurse'),
  getRecommendationsController
);

router.get(
  '/:id',
  authorize('admin', 'reception', 'doctor', 'nurse'),
  getRecommendationByIdController
);

router.post(
  '/:id/approve',
  authorize('admin', 'doctor', 'nurse'),
  approveRecommendationController
);

router.post(
  '/:id/override',
  authorize('admin', 'doctor', 'nurse'),
  overrideRecommendationController
);

export default router;
