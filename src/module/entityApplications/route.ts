import { Router } from 'express';
import EntityApplicationController from './controller.ts';

const router: Router = Router();

router.post('/', EntityApplicationController.createApplication);

export default router;
