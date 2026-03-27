import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import router from "./routes";
import { activityLogger } from "./middlewares/activityLogger";

const app: Express = express();

app.use(cors({ origin: true, credentials: true }));

app.use(express.json({ type: ["application/json", "text/plain", "*/*"] }));
app.use(express.urlencoded({ extended: true }));

app.use((req: Request, _res: Response, next: NextFunction) => {
  if (req.body === undefined && req.method !== "GET" && req.method !== "HEAD") {
    req.body = {};
  }
  next();
});

app.use(activityLogger);

app.use("/api", router);

export default app;
