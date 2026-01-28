import { Router } from "express";
import pamRoutes from "./pam/route.ts";
import fveRoutes from "./fve/route.ts";
import mreRoutes from "./mre/route.ts";

const router = Router();

router.use("/pam", pamRoutes);
router.use("/fve", fveRoutes);
router.use("/mre", mreRoutes);

export default router;
