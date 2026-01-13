import { Router } from "express";
import BlacklistController from "./controller.ts";

const router = Router();

// Block/Unblock entity routes (combined operations)
router.post("/craft-entities/:id/block", BlacklistController.blockEntity);
router.post("/craft-entities/:id/unblock", BlacklistController.unblockEntity);

// Blacklist CRUD routes
router.get("/blacklist", BlacklistController.getAllBlacklist);
router.get("/blacklist/:id", BlacklistController.getBlacklistById);
router.get("/blacklist/craft/:craft_id", BlacklistController.getBlacklistByCraftId);
router.patch("/blacklist/:id/status", BlacklistController.updateBlacklistStatus);
router.delete("/blacklist/:id", BlacklistController.deleteBlacklist);

export default router;