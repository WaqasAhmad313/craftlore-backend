import express, { Router } from 'express';
import GICraftController from "./controller.ts";

const router: Router = express.Router();

router.get('/', GICraftController.getAllCrafts);
router.get('/categories', GICraftController.getAllCategories);
router.get('/:identifier', GICraftController.getCraftByIdentifier);
router.delete('/:id', GICraftController.deleteCraftById);

export default router;

