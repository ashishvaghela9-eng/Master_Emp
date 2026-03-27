import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Loader2, Download, ChevronDown, X, Search, FileBarChart } from "lucide-react";
import * as XLSX from "xlsx";

interface ActivityLog {
  id: number;
  userId: number | null;
  userEmail: string | null;
  action: string;
  eventType: string | null;
  entity: string;
  entityId: string | null;
  description: string | null;
  browser: string | null;
  device: string | null;
  browserIp: string | null;
  createdAt: string;
}

const token = () => localStorage.getItem("auth_token");
const authHeaders = () => ({ Authorization: `Bearer ${token()}` });

function getModuleLabel(entity: string): string {
  if (!entity) return "—";
  return entity;
}

async function fetchActivityLogs(params: Record<string, string>): Promise<ActivityLog[]> {
  const qs = new URLSearchParams({ limit: "500", ...params }).toString();
  const res = await fetch(`/api/activity-logs?${qs}`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to fetch logs");
  return res.json();
}

async function fetchEventTypes(): Promise<string[]> {
  const res = await fetch("/api/activity-logs/event-types", { headers: authHeaders() });
  if (!res.ok) return [];
  return res.json();
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("en-IN", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: true,
  });
}

function toInputDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

export default function ActivityLogs() {
  const today = new Date();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 7);

  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [email, setEmail] = useState("");
  const [module, setModule] = useState("");
  const [startDate, setStartDate] = useState(toInputDate(sevenDaysAgo));
  const [endDate, setEndDate] = useState(toInputDate(today));
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({
    startDate: toInputDate(sevenDaysAgo),
    endDate: toInputDate(today),
  });
  const [typeDropOpen, setTypeDropOpen] = useState(false);

  const { data: eventTypes = [] } = useQuery<string[]>({
    queryKey: ["/api/activity-logs/event-types"],
    queryFn: fetchEventTypes,
  });

  const { data: allLogs = [], isLoading } = useQuery<ActivityLog[]>({
    queryKey: ["/api/activity-logs", activeFilters],
    queryFn: () => fetchActivityLogs(activeFilters),
  });

  const logs = module.trim()
    ? allLogs.filter(l => getModuleLabel(l.entity).toLowerCase().includes(module.trim().toLowerCase()))
    : allLogs;

  const handleSearch = () => {
    const filters: Record<string, string> = {};
    if (selectedTypes.length > 0) filters.eventType = selectedTypes.join(",");
    if (email.trim()) filters.email = email.trim();
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;
    setActiveFilters(filters);
  };

  const removeType = (t: string) => setSelectedTypes(p => p.filter(x => x !== t));
  const toggleType = (t: string) => setSelectedTypes(p => p.includes(t) ? p.filter(x => x !== t) : [...p, t]);

  const handleGenerateReport = () => {
    if (!logs.length) return;
    const rows = logs.map((log, idx) => ({
      "S.NO": idx + 1,
      "Event Type": log.eventType || log.action,
      "Module": getModuleLabel(log.entity),
      "Username": log.userEmail || "System",
      "Description": log.description || "—",
      "Event Date & Time": formatDate(log.createdAt),
      "Browser": log.browser || "—",
      "Device": log.device || "—",
      "Browser IP": log.browserIp || "—",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Activity Logs");
    XLSX.writeFile(wb, `Activity_Logs_${toInputDate(new Date())}.xlsx`);
  };

  return (
    <AppLayout title="Activity Logs">
      <div className="space-y-4">
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-6">

          {/* Top action buttons */}
          <div className="flex justify-end gap-2 mb-4">
            <Button onClick={handleGenerateReport} className="h-9 bg-primary hover:bg-primary/90 gap-2">
              <Download className="w-4 h-4" /> Generate Report
            </Button>
            <Button variant="outline" onClick={handleGenerateReport} className="h-9 gap-2">
              <FileBarChart className="w-4 h-4" /> View Download
            </Button>
          </div>

          {/* Search Filters */}
          <div className="border border-border/60 rounded-xl p-4 mb-4 bg-muted/10">
            <p className="text-sm font-semibold text-foreground mb-3">Search Filter By</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">

              {/* Event Type multi-select */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Event Type</label>
                <Popover open={typeDropOpen} onOpenChange={setTypeDropOpen}>
                  <PopoverTrigger asChild>
                    <button className="w-full min-h-[40px] flex flex-wrap gap-1 items-center border border-input rounded-lg px-3 py-2 bg-background text-sm hover:bg-muted/30 transition-colors text-left">
                      {selectedTypes.length === 0 ? (
                        <span className="text-muted-foreground">Select types...</span>
                      ) : (
                        selectedTypes.map(t => (
                          <span key={t} className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs rounded-full px-2 py-0.5">
                            {t}
                            <button onClick={e => { e.stopPropagation(); removeType(t); }} className="hover:text-primary/60">
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))
                      )}
                      <ChevronDown className="w-4 h-4 text-muted-foreground ml-auto flex-shrink-0" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-2" align="start">
                    <div className="space-y-1 max-h-52 overflow-y-auto">
                      {eventTypes.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-3">No event types yet</p>
                      ) : eventTypes.map(t => (
                        <button
                          key={t}
                          onClick={() => toggleType(t)}
                          className={`w-full text-left text-sm px-3 py-2 rounded-lg transition-colors ${selectedTypes.includes(t) ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted/40"}`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Module filter */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Module</label>
                <Input
                  placeholder="e.g. Employee Master..."
                  value={module}
                  onChange={e => setModule(e.target.value)}
                  className="h-10"
                />
              </div>

              {/* Email filter */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Username / Email</label>
                <Input
                  placeholder="Email address"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSearch()}
                  className="h-10"
                />
              </div>

              {/* Start Date */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Start Date</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="h-10"
                />
              </div>

              {/* End Date + Search */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">End Date</label>
                <div className="flex gap-2">
                  <Input
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="h-10 flex-1"
                  />
                  <Button onClick={handleSearch} className="h-10 px-4">
                    <Search className="w-4 h-4 mr-1" /> Search
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="border rounded-xl overflow-auto">
            <Table>
              <TableHeader className="bg-muted/50 sticky top-0 z-10">
                <TableRow>
                  <TableHead className="w-12">S.NO</TableHead>
                  <TableHead>Event Type</TableHead>
                  <TableHead>Module</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Event Date & Time</TableHead>
                  <TableHead>Browser</TableHead>
                  <TableHead>Device</TableHead>
                  <TableHead>Browser IP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-32 text-center">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                    </TableCell>
                  </TableRow>
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                      No activity logs found for the selected filters.
                    </TableCell>
                  </TableRow>
                ) : logs.map((log, idx) => (
                  <TableRow key={log.id} className="hover:bg-muted/20">
                    <TableCell className="text-muted-foreground text-sm">{idx + 1}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-medium text-primary border-primary/30 bg-primary/5 whitespace-nowrap">
                        {log.eventType || log.action}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-medium text-foreground whitespace-nowrap">
                        {getModuleLabel(log.entity)}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">{log.userEmail || "System"}</TableCell>
                    <TableCell className="text-sm max-w-xs truncate" title={log.description || ""}>
                      {log.description || "—"}
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap">{formatDate(log.createdAt)}</TableCell>
                    <TableCell className="text-sm">{log.browser || "—"}</TableCell>
                    <TableCell className="text-sm">{log.device || "—"}</TableCell>
                    <TableCell className="text-sm font-mono text-primary">{log.browserIp || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {logs.length > 0 && (
            <p className="text-xs text-muted-foreground mt-2 text-right">{logs.length} record{logs.length !== 1 ? "s" : ""} found</p>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
