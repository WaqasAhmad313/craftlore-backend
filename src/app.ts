import express, { type Application } from "express";
import scraperRoute from "./Scraper/route.ts";
import { scraperLimiter } from "./ipLimit/ipLimit.ts";
import { rateLimitLogger } from "./util/rateLimitLogger.ts";

const app: Application = express();

app.use(express.json());
app.use("/api/scraper", scraperLimiter, rateLimitLogger , scraperRoute);
app.get("/", (req, res) => {
  res.send("Craftlore backend is running!");
});


export default app;
