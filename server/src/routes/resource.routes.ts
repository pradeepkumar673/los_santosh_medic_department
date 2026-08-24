import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth';
import { 
  getResources, 
  updateResourceStatusController, 
  reserveResourceController, 
  releaseResourceController, 
  forecastVentilators, 
  getShortageRiskController 
} from '../controllers/resource.controller';

const router = Router();
router.use(authenticate);
router.use(authorize('admin', 'reception', 'doctor', 'nurse'));

router.get('/', getResources);
router.get('/forecast/:hospitalId/ventilators', forecastVentilators);
router.get('/shortage-risk/:hospitalId/:type', getShortageRiskController);
router.patch('/:id/status', updateResourceStatusController);
router.post('/:id/reserve', reserveResourceController);
router.post('/:id/release', releaseResourceController);

export default router;
