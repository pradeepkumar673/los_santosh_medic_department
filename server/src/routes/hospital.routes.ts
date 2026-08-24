import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth';
import { getHospitals, getHospitalById, createHospitalController } from '../controllers/hospital.controller';

const router = Router();
router.use(authenticate);

router.get('/', authorize('admin', 'reception', 'doctor', 'nurse'), getHospitals);
router.get('/:id', authorize('admin', 'reception', 'doctor', 'nurse'), getHospitalById);
router.post('/', authorize('admin'), createHospitalController);

export default router;
