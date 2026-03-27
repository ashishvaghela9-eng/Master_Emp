import { useState } from "react";
import { useListEmployees } from "@workspace/api-client-react";
import type { Employee } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { FileBarChart, Download, Loader2, CheckCircle2, XCircle, ChevronRight } from "lucide-react";
import { ACCESS_ITEMS } from "@/lib/access-items";
import * as XLSX from "xlsx";

interface ConfigItem { id: number; type: string; value: string; }

async function fetchConfig(): Promise<ConfigItem[]> {
  const token = localStorage.getItem("auth_token");
  const res = await fetch("/api/config", { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error("Failed to fetch config");
  return res.json();
}

export default function Reports() {
  const [tab,         setTab]         = useState<"Active" | "Exited">("Active");
  const [detailEmp,   setDetailEmp]   = useState<Employee | null>(null);

  const { data: employees, isLoading } = useListEmployees();

  const { data: config = [] } = useQuery<ConfigItem[]>({
    queryKey: ["/api/config"],
    queryFn: fetchConfig,
  });

  const configServices = config.filter(c => c.type === "service");
  const staticLabels   = new Set(ACCESS_ITEMS.map(i => i.label.toLowerCase()));
  const dynamicItems   = configServices
    .filter(s => !staticLabels.has(s.value.toLowerCase()))
    .map(s => ({
      key: s.value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, ""),
      label: s.value,
    }));
  const allServiceItems = [...ACCESS_ITEMS, ...dynamicItems];

  const filteredData = (employees || []).filter(e =>
    tab === "Active"
      ? e.status !== "Inactive" && e.userExitStatus !== "Yes"
      : e.status === "Inactive" || e.userExitStatus === "Yes"
  );

  const getServiceValue = (emp: Employee, key: string): boolean =>
    tab === "Active" ? !!((emp.access as any)?.[key]) : false;

  const handleExport = () => {
    if (!filteredData.length) return;
    const rows = filteredData.map((e, idx) => {
      const row: Record<string, any> = {
        "#":             idx + 1,
        "Employee Code": e.employeeCode,
        "Name":          e.name,
        "Status":        e.status,
        "Department":    e.department  || "",
        "Designation":   e.designation || "",
        "Branch":        e.branch      || "",
        "State":         e.state       || "",
        "Joining Date":  e.joiningDate || "",
        "Exit Date":     e.exitDate    || "",
        "Exit Status":   e.userExitStatus || "No",
      };
      allServiceItems.forEach(({ key, label }) => {
        row[label] = getServiceValue(e, key) ? "Yes" : "No";
      });
      return row;
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, tab === "Active" ? "Active Employees" : "Exited Employees");
    XLSX.writeFile(wb, `${tab}_Employees_Report.xlsx`);
  };

  const detailAccessCount = detailEmp
    ? allServiceItems.filter(({ key }) => getServiceValue(detailEmp, key)).length
    : 0;

  return (
    <AppLayout title="Reports & Analytics">
      <div className="bg-card rounded-2xl shadow-sm border border-border/50 p-6 flex flex-col" style={{ minHeight: "calc(100vh - 120px)" }}>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 border-b pb-4">
          <div className="flex space-x-1 bg-muted p-1 rounded-xl">
            {(["Active", "Exited"] as const).map(t => (
              <button
                key={t}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                onClick={() => setTab(t)}
              >
                {t === "Active" ? "Active Employees" : "Exited Employees"}
                {employees && (
                  <span className={`ml-2 text-xs rounded-full px-1.5 py-0.5 font-semibold
                    ${t === tab ? "bg-primary text-primary-foreground" : "bg-muted-foreground/20 text-muted-foreground"}`}>
                    {(employees || []).filter(e =>
                      t === "Active"
                        ? e.status !== "Inactive" && e.userExitStatus !== "Yes"
                        : e.status === "Inactive" || e.userExitStatus === "Yes"
                    ).length}
                  </span>
                )}
              </button>
            ))}
          </div>
          <Button onClick={handleExport} variant="outline" className="h-10 border-primary/20 text-primary hover:bg-primary/10">
            <Download className="w-4 h-4 mr-2" /> Export XLSX
          </Button>
        </div>

        <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
          <FileBarChart className="w-3.5 h-3.5" />
          {tab === "Active"
            ? "Services show actual access status. Click any row to view full details."
            : "Exit report — all services show No (access revoked on exit). Click any row for details."}
        </div>

        <div className="flex-1 overflow-auto border rounded-xl">
          <Table>
            <TableHeader className="bg-muted/50 sticky top-0 z-10">
              <TableRow>
                <TableHead className="w-8">#</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Joining</TableHead>
                {tab === "Exited" && <TableHead>Exit Date</TableHead>}
                <TableHead>Status</TableHead>
                {allServiceItems.map(({ label }) => (
                  <TableHead key={label} className="text-center whitespace-nowrap text-xs">{label}</TableHead>
                ))}
                <TableHead className="w-8"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={30} className="h-32 text-center">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                </TableCell></TableRow>
              ) : filteredData.length === 0 ? (
                <TableRow><TableCell colSpan={30} className="h-32 text-center text-muted-foreground">
                  No records found.
                </TableCell></TableRow>
              ) : filteredData.map((emp, idx) => (
                <TableRow
                  key={emp.id}
                  className="hover:bg-muted/30 cursor-pointer"
                  onClick={() => setDetailEmp(emp)}
                >
                  <TableCell className="text-muted-foreground text-xs">{idx + 1}</TableCell>
                  <TableCell className="font-mono text-xs font-medium">{emp.employeeCode}</TableCell>
                  <TableCell className="font-medium whitespace-nowrap">{emp.name}</TableCell>
                  <TableCell className="whitespace-nowrap">{emp.department || "—"}</TableCell>
                  <TableCell className="whitespace-nowrap">{emp.branch || "—"}</TableCell>
                  <TableCell className="whitespace-nowrap">{emp.joiningDate || "—"}</TableCell>
                  {tab === "Exited" && <TableCell className="whitespace-nowrap">{emp.exitDate || "—"}</TableCell>}
                  <TableCell>
                    <Badge variant="outline" className={
                      emp.status === "Active"     ? "text-emerald-600 border-emerald-500/20 bg-emerald-50" :
                      emp.status === "In Service" ? "text-blue-600 border-blue-500/20 bg-blue-50" :
                                                    "text-rose-600 border-rose-500/20 bg-rose-50"
                    }>
                      {emp.status}
                    </Badge>
                  </TableCell>
                  {allServiceItems.map(({ key }) => {
                    const has = getServiceValue(emp, key);
                    return (
                      <TableCell key={key} className="text-center px-2">
                        {has
                          ? <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" />
                          : <XCircle      className="w-4 h-4 text-muted-foreground/40 mx-auto" />}
                      </TableCell>
                    );
                  })}
                  <TableCell>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Employee Detail Dialog */}
      <Dialog open={!!detailEmp} onOpenChange={v => { if (!v) setDetailEmp(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {detailEmp?.name}
              <Badge variant="outline" className={
                detailEmp?.status === "Active"     ? "text-emerald-600 border-emerald-500/20" :
                detailEmp?.status === "In Service" ? "text-blue-600 border-blue-500/20" :
                                                     "text-rose-600 border-rose-500/20"
              }>
                {detailEmp?.status}
              </Badge>
            </DialogTitle>
          </DialogHeader>

          {detailEmp && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                {[
                  ["Employee Code", detailEmp.employeeCode],
                  ["Department",    detailEmp.department],
                  ["Designation",   detailEmp.designation],
                  ["Branch",        detailEmp.branch],
                  ["State",         detailEmp.state],
                  ["Contact",       detailEmp.contactNumber],
                  ["Email",         detailEmp.email],
                  ["Joining Date",  detailEmp.joiningDate],
                  ["Exit Date",     detailEmp.exitDate],
                  ["Exit Status",   detailEmp.userExitStatus],
                ].map(([k, v]) => v ? (
                  <div key={k}>
                    <span className="text-muted-foreground">{k}:</span>
                    <span className="ml-2 font-medium">{v}</span>
                  </div>
                ) : null)}
              </div>

              <Separator />

              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold">Service Access</p>
                  <Badge variant="outline" className={detailAccessCount > 0 ? "text-primary border-primary/30" : "text-muted-foreground"}>
                    {tab === "Active" ? `${detailAccessCount} / ${allServiceItems.length} active` : "All revoked (exited)"}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {allServiceItems.map(({ key, label }) => {
                    const has = getServiceValue(detailEmp, key);
                    return (
                      <div key={key} className={`flex items-center gap-2 p-2.5 rounded-lg border text-sm
                        ${has ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-muted/20 border-border text-muted-foreground"}`}>
                        {has
                          ? <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                          : <XCircle      className="w-4 h-4 text-muted-foreground/50 flex-shrink-0" />}
                        <span className="leading-tight text-xs">{label}</span>
                        <span className={`ml-auto text-xs font-medium ${has ? "text-emerald-600" : "text-muted-foreground/60"}`}>
                          {has ? "Yes" : "No"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
