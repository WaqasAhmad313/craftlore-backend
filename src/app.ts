import express, { type Application } from "express";
import cors from "cors";
import morgan from "morgan"; 
import scraperRoute from "./module/scraper/Product_Scraper/route.ts";
import { scraperLimiter } from "./module/scraper/ipLimit/ipLimit.ts";
import { rateLimitLogger } from "./util/rateLimitLogger.ts";
import giRoute from "./module/gi/route.ts";
import entityApplicationRoutes from './module/entityApplications/route.ts';
import counterfeitReportRoutes from './module/report/route.ts';
import heroRoutes from './module/hero/route.ts';
import authScrape from './module/scraper/Auth_Scraper/route.ts'

const app: Application = express();

app.use(morgan("dev"));
app.use(cors({
  origin: "http://localhost:5173",
  methods: ['GET','POST','PUT','DELETE','OPTIONS', 'PATCH'],
  allowedHeaders: ["Content-Type"],
}));

app.use(express.json());
app.use("/api/auth-scrape", authScrape);
app.use("/api", counterfeitReportRoutes);
app.use("/api/heroes", heroRoutes);
app.use("/api/gi-crafts", giRoute);
app.use("/api/entity-applications", entityApplicationRoutes);
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
