import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth';
import {
  createIncidentController,
  getIncidentsController,
  getIncidentByIdController,
  updateIncidentStatusController,
  checkWeatherRiskController
} from '../controllers/incident.controller';

const router = Router();
router.use(authenticate);
router.use(authorize('admin', 'reception', 'doctor', 'nurse'));

router.get('/', getIncidentsController);
router.post('/', authorize('admin', 'reception', 'nurse'), createIncidentController);
router.post('/check-weather', authorize('admin', 'reception', 'nurse'), checkWeatherRiskController);
router.get('/:id', getIncidentByIdController);
router.patch('/:id/status', authorize('admin', 'reception', 'nurse'), updateIncidentStatusController);

export default router;
