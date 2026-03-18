// import { Router } from "express";
// import { HeroController } from "./controller.ts";

// const router = Router();

// router.put("/", HeroController.upsertHero);
// router.get("/", HeroController.getAllHeroes);
// router.post("/claim", HeroController.claimHero);
// router.get("/claimed", HeroController.getClaimedHeroes);
// router.get("/:id", HeroController.getHeroById);
// router.delete("/:id", HeroController.deleteHero);

// export default router;


import { Router } from "express";
import { HeroController } from "./controller.ts";
import { isInternalRequest } from "../../middleware/internalMiddleware.ts";
import { authMiddleware } from "../../middleware/authMiddleware.ts";
import { requirePermission } from "../../middleware/permissionMiddleware.ts";
import { pendingInterceptor } from "../../middleware/pendingMiddleware.ts";
import { logActivity } from "../../middleware/activityLogMiddleware.ts";

const router = Router();

// ── Untouched ────────────────────────────────────────────────
router.put("/", HeroController.upsertHero);
router.get("/", HeroController.getAllHeroes);
router.post("/claim", HeroController.claimHero);
router.get("/claimed", HeroController.getClaimedHeroes);
router.get("/:id", HeroController.getHeroById);

// ── Dashboard: DELETE /:id ───────────────────────────────────
router.delete(
  "/:id",
  isInternalRequest,
  authMiddleware,
  requirePermission("cgis", "delete"),
  pendingInterceptor({
    module:    "cgis",
    operation: "delete",
    extractPayload: async (req) => ({
      entityId: req.params["id"] ?? null,
      payload: {
        new: null,
      },
    }),
  }),
  logActivity({
    module: "cgis",
    action: "delete",
    extractMeta: (req) => ({
      entityId: req.params["id"] ?? null,
    }),
  }),
  HeroController.deleteHero
);

export default router;