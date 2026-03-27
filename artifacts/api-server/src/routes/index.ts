import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import employeesRouter from "./employees";
import dashboardRouter from "./dashboard";
import modulesRouter from "./modules";
import systemUsersRouter from "./systemUsers";
import configRouter from "./config";
import activityLogsRouter from "./activityLogs";
import serviceDefinitionsRouter from "./serviceDefinitions";
import dynamicServiceRouter from "./dynamicService";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/employees", employeesRouter);
router.use("/dashboard", dashboardRouter);
router.use(modulesRouter);
router.use("/system-users", systemUsersRouter);
router.use("/config", configRouter);
router.use("/activity-logs", activityLogsRouter);
router.use("/service-definitions", serviceDefinitionsRouter);
router.use("/services", dynamicServiceRouter);

export default router;
