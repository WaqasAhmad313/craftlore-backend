import { Router } from "express";
import { CsemeController } from "./controller.ts";

const router = Router();

/* ===== CRAFTS ===== */

// Get all crafts
router.get("/crafts", CsemeController.getAllCrafts);

// Create a new craft
router.post("/crafts", CsemeController.createCraft);

// Get a specific craft by ID
router.get("/crafts/:craftId", CsemeController.getCraft);

// Update a craft
router.patch("/crafts/:craftId", CsemeController.updateCraft);

// Delete a craft
router.delete("/crafts/:craftId", CsemeController.deleteCraft);

/* ===== DATASETS ===== */

// Get all datasets
router.get("/datasets", CsemeController.getAllDatasets);

// Get the currently published dataset
router.get("/datasets/published", CsemeController.getPublishedDataset);

// Create a new dataset
router.post("/datasets", CsemeController.createDataset);

// Get a specific dataset by ID
router.get("/datasets/:datasetId", CsemeController.getDataset);

// Publish a dataset (moves it from draft → published)
router.patch("/datasets/:datasetId/publish", CsemeController.publishDataset);

// Delete a dataset (only draft datasets can be deleted)
router.delete("/datasets/:datasetId", CsemeController.deleteDataset);

/* ===== ECON DATA (Admin - per dataset) ===== */

// Get all econ data for a specific dataset
router.get("/datasets/:datasetId/data", CsemeController.getEconDataByDataset);

// Add econ data to a dataset
router.post("/datasets/:datasetId/data", CsemeController.createEconData);

// Get econ data for a specific craft within a dataset
router.get(
  "/datasets/:datasetId/data/craft/:craftId",
  CsemeController.getEconDataByCraftAndDataset
);

// Get a specific econ data record by ID
router.get("/data/:econId", CsemeController.getEconData);

// Update a specific econ data record
router.patch("/data/:econId", CsemeController.updateEconData);

// Delete a specific econ data record
router.delete("/data/:econId", CsemeController.deleteEconData);

/* ===== DASHBOARD (Frontend - reads from published dataset) ===== */

// Get dashboard summary — used by the main dashboard overview tab
// Optional query param: ?fy_label=2024-25
router.get("/dashboard/summary", CsemeController.getDashboardSummary);

// Get all econ data from published dataset — used by Production, Export,
// Productivity, Supply Stability tabs
router.get("/dashboard/econ-data", CsemeController.getPublishedEconData);

// Get list of available financial years in published dataset
router.get("/dashboard/fy-labels", CsemeController.getAvailableFyLabels);

export default router;