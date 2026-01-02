import { Router } from "express";
import { HeroController } from "./controller.ts";

const router = Router();

router.put("/", HeroController.upsertHero);
router.get("/", HeroController.getAllHeroes);
router.post("/claim", HeroController.claimHero);
router.get("/claimed", HeroController.getClaimedHeroes);
router.get("/:id", HeroController.getHeroById);
router.delete("/:id", HeroController.deleteHero);

export default router;
