import express, { type Application } from "express";
import cors from "cors";

import scraperRoute from "./module/scraper/Product_Scraper/route.ts";
import { scraperLimiter } from "./module/scraper/ipLimit/ipLimit.ts";
import { rateLimitLogger } from "./util/rateLimitLogger.ts";
import giRoute from "./module/gi/route.ts";

const app: Application = express();

app.use(cors({
  origin: "http://localhost:5173",
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"],
}));

app.use(express.json());
app.use("/api/gi", giRoute);
app.use(
  "/api/scraper",
  scraperLimiter,
  rateLimitLogger,
  scraperRoute
);

app.get("/", (req, res) => {
  res.send("Craftlore backend is running!");
});

export default app;
