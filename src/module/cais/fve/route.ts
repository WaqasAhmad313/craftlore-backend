import { Router } from "express";
import FveController from "./controller.ts";

const router = Router();

router.get("/valuations/:appraisalId", FveController.getByAppraisal);
router.post("/valuations/recalculate", FveController.recalculate);

export default router;
