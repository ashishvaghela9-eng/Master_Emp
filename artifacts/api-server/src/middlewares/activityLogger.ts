import type { Request, Response, NextFunction } from "express";
import { db, activityLogsTable } from "@workspace/db";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "employee-master-secret-2024";
const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

const ENTITY_MODULE_MAP: Record<string, string> = {
  employees:              "Employee Master",
  employee:               "Employee Master",
  config:                 "Configuration",
  "system-users":         "System Users",
  "system_users":         "System Users",
  auth:                   "Authentication",
  "activity-logs":        "Activity Logs",
  "service-definitions":  "Services",
  services:               "Services",
  "branch-file-station":  "Branch File Station",
  assetcuez:              "Assetcuez",
  vpn:                    "VPN",
  jira:                   "Jira",
  mailvault:              "MailVault",
  ftp:                    "FTP",
  acronis:                "Acronis Backup",
  "tata-tele":            "Tata Tele",
  dashboard:              "Dashboard",
  reports:                "Reports",
};

function getEntityFromPath(path: string): { entity: string; entityId?: string; subEntity?: string } {
  const parts = path.split("/").filter(Boolean);
  if (parts[0] === "api") parts.shift();
  const entity = parts[0] || "unknown";
  const entityId = parts[1] && !isNaN(Number(parts[1])) ? parts[1] : undefined;
  const subEntity = entityId && parts[2] ? parts[2] : undefined;
  return { entity, entityId, subEntity };
}

function getModuleName(entity: string): string {
  return ENTITY_MODULE_MAP[entity] || entity.replace(/[-_]/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function getActionLabel(method: string, path: string): string {
  if (method === "POST" && path.includes("/import")) return "IMPORT";
  switch (method) {
    case "POST": return "CREATE";
    case "PUT":
    case "PATCH": return "UPDATE";
    case "DELETE": return "DELETE";
    default: return method;
  }
}

function getEventType(action: string, entity: string): string {
  const module = getModuleName(entity);
  if (action === "CREATE") return `Create ${module}`;
  if (action === "UPDATE") return `Update ${module}`;
  if (action === "DELETE") return `Delete ${module}`;
  if (action === "IMPORT") return `Import ${module}`;
  return action;
}

function buildDescription(action: string, entity: string, entityId: string | undefined, subEntity: string | undefined, body: any): string {
  const module = getModuleName(entity);
  const name: string =
    body?.name || body?.username || body?.employeeName || body?.title || "";

  if (action === "IMPORT") {
    const count = Array.isArray(body?.employees) ? body.employees.length : "";
    return `Imported ${count ? `${count} records into` : ""} ${module}`;
  }

  if (subEntity === "fields") {
    const fieldLabel = body?.fieldLabel || body?.fieldName || "";
    if (action === "CREATE") return `Added field "${fieldLabel}" to ${module} service`;
    if (action === "DELETE") return `Removed a field from ${module} service`;
    if (action === "UPDATE") return `Reordered fields in ${module} service`;
  }

  if (entity === "service-definitions" || entity === "services") {
    const svcName = body?.name || "";
    if (action === "CREATE") return `Created service "${svcName}"`;
    if (action === "UPDATE") return `Updated service "${svcName || `#${entityId}`}"`;
    if (action === "DELETE") return `Deleted service #${entityId}`;
  }

  if (entity === "system-users") {
    if (action === "CREATE") return `Created system user${name ? ` "${name}"` : ""}`;
    if (action === "UPDATE") return `Updated system user${name ? ` "${name}"` : entityId ? ` #${entityId}` : ""}`;
    if (action === "DELETE") return `Deleted system user #${entityId}`;
  }

  if (entity === "config") {
    const val = body?.value || body?.type || "";
    if (action === "CREATE") return `Added configuration value "${val}"`;
    if (action === "DELETE") return `Removed configuration #${entityId}`;
    return `Updated configuration`;
  }

  if (entity === "employees") {
    if (action === "CREATE") return `Added employee${name ? ` "${name}"` : ""}`;
    if (action === "UPDATE") return `Updated employee${name ? ` "${name}"` : entityId ? ` #${entityId}` : ""}`;
    if (action === "DELETE") return `Deleted employee #${entityId}`;
  }

  if (name) return `${action.charAt(0) + action.slice(1).toLowerCase()} ${module} — "${name}"`;
  if (entityId) return `${action.charAt(0) + action.slice(1).toLowerCase()} ${module} #${entityId}`;
  return `${action.charAt(0) + action.slice(1).toLowerCase()} ${module}`;
}

export function parseBrowser(ua: string): string {
  if (/edg\//i.test(ua)) return "Edge";
  if (/opr\//i.test(ua) || /opera/i.test(ua)) return "Opera";
  if (/firefox\//i.test(ua)) return "Firefox";
  if (/chrome\//i.test(ua)) return "Chrome";
  if (/safari\//i.test(ua)) return "Safari";
  if (/webkit/i.test(ua)) return "WebKit";
  return "Unknown";
}

export function parseDevice(ua: string): string {
  if (/windows/i.test(ua)) return "Windows";
  if (/iphone|ipad|ipod/i.test(ua)) return "iOS";
  if (/android/i.test(ua)) return "Android";
  if (/macintosh|mac os/i.test(ua)) return "Mac";
  if (/linux/i.test(ua)) return "Linux";
  return "Unknown";
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    const ips = (Array.isArray(forwarded) ? forwarded[0] : forwarded).split(",");
    return ips[0].trim();
  }
  return req.socket?.remoteAddress || req.ip || "Unknown";
}

export function activityLogger(req: Request, res: Response, next: NextFunction) {
  if (!WRITE_METHODS.has(req.method)) return next();
  if (req.path.includes("/auth/")) return next();

  let userId: number | undefined;
  let userEmail: string | undefined;

  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    try {
      const decoded = jwt.verify(authHeader.slice(7), JWT_SECRET) as any;
      userId = decoded.userId;
      userEmail = decoded.email;
    } catch {}
  }

  const ua = req.headers["user-agent"] || "";
  const browser = parseBrowser(ua);
  const device = parseDevice(ua);
  const browserIp = getClientIp(req);
  const body = req.body || {};

  const originalSend = res.send.bind(res);
  res.send = function (responseBody?: any) {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      const { entity, entityId, subEntity } = getEntityFromPath(req.path);
      const action = getActionLabel(req.method, req.path);
      const eventType = getEventType(action, entity);
      const module = getModuleName(entity);
      const description = buildDescription(action, entity, entityId, subEntity, body);

      db.insert(activityLogsTable)
        .values({
          userId: userId ?? null,
          userEmail: userEmail ?? null,
          action,
          eventType,
          entity: module,
          entityId: entityId ?? null,
          description,
          browser,
          device,
          browserIp,
        })
        .catch(console.error);
    }
    return originalSend(responseBody);
  };

  next();
}
