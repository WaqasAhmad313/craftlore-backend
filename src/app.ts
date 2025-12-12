import express, { type Application } from "express";
import scraperRoute from "./Scraper/route.ts";

const app: Application = express();

app.use(express.json());
app.use("/api/scraper", scraperRoute);
app.get("/", (req, res) => {
  res.send("Craftlore backend is running!");
});


export default app;
