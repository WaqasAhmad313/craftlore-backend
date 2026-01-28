import express, { type Application } from "express";
import cors from "cors";
import morgan from "morgan";
import scraperRoute from "./module/scraper/Product_Scraper/route.ts";
import { scraperLimiter } from "./module/scraper/ipLimit/ipLimit.ts";
import { rateLimitLogger } from "./util/rateLimitLogger.ts";
import giRoute from "./module/gi/route.ts";
import entityApplicationRoutes from "./module/entityApplications/route.ts";
import counterfeitReportRoutes from "./module/report/route.ts";
import heroRoutes from "./module/hero/route.ts";
import authScrape from "./module/scraper/Auth_Scraper/route.ts";
import blacklist from "./module/blocklist/route.ts";
import evaluation from "./module/evaluation/route.ts"
import course from "./module/courses/route.ts";
import authRoute from "./module/auth/route.ts";
import cookieParser from 'cookie-parser';
import clieRoute from "./module/clie/route.ts";
import ambassadorRoute from "./module/ambassador/route.ts";
import carbonRoute from "./module/carbon_footprint/route.ts";
import caisRoutes from "./module/cais/index.ts";

const app: Application = express();

app.use(morgan("dev"));
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(cookieParser());
app.use("/api/carbon", carbonRoute);
app.use("/api/cais", caisRoutes);
app.use("/api/auth-scrape", authScrape);
app.use("/api/ambassadors", ambassadorRoute);
app.use("/api/clie", clieRoute);
app.use("/api/courses", course);
app.use("/api/evaluations", evaluation);
app.use("/api/auth", authRoute);
app.use("/api/blacklist", blacklist);
app.use("/api", counterfeitReportRoutes);
app.use("/api/heroes", heroRoutes);
app.use("/api/gi-crafts", giRoute);
app.use("/api/craft-entities", entityApplicationRoutes);
app.use("/api/scraper", scraperLimiter, rateLimitLogger, scraperRoute);

app.get("/", (req, res) => {
  res.send("Craftlore backend is running!");
});

export default app;
