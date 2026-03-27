import { useState } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Loader2, Server, Database } from "lucide-react";

const token = () => localStorage.getItem("auth_token");
const authHeaders = () => ({ Authorization: `Bearer ${token()}` });

interface ServiceField {
  id: number;
  fieldName: string;
  fieldLabel: string;
  fieldType: string;
  isRequired: boolean;
  sortOrder: number;
}

interface ServiceDefinition {
  id: number;
  name: string;
  slug: string;
  isBuiltIn: boolean;
  fields: ServiceField[];
}

interface ServiceData {
  definition: ServiceDefinition;
  records: Record<string, any>[];
}

async function fetchServiceData(slug: string): Promise<ServiceData> {
  const res = await fetch(`/api/services/${slug}`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Service not found");
  return res.json();
}

async function createRecord(slug: string, data: Record<string, any>): Promise<any> {
  const res = await fetch(`/api/services/${slug}/records`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create record");
  return res.json();
}

async function updateRecord(slug: string, id: number, data: Record<string, any>): Promise<any> {
  const res = await fetch(`/api/services/${slug}/records/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update record");
  return res.json();
}

async function deleteRecord(slug: string, id: number): Promise<void> {
  const res = await fetch(`/api/services/${slug}/records/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to delete record");
}

export default function DynamicService() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug || "";
  const { toast } = useToast();
  const qc = useQueryClient();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});

  const { data, isLoading, error } = useQuery<ServiceData>({
    queryKey: ["/api/services", slug],
    queryFn: () => fetchServiceData(slug),
    enabled: !!slug,
  });

  const createMutation = useMutation({
    mutationFn: (d: Record<string, any>) => createRecord(slug, d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/services", slug] });
      toast({ title: "Record added" });
      setIsFormOpen(false);
    },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, d }: { id: number; d: Record<string, any> }) => updateRecord(slug, id, d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/services", slug] });
      toast({ title: "Record updated" });
      setIsFormOpen(false);
    },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteRecord(slug, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/services", slug] });
      toast({ title: "Record deleted" });
    },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const definition = data?.definition;
  const records = data?.records ?? [];
  const fields = definition?.fields ?? [];

  const handleOpenForm = (record?: Record<string, any>) => {
    if (record) {
      setEditingId(record.id);
      const fd: Record<string, string> = {};
      fields.forEach(f => { fd[f.fieldName] = String(record[f.fieldName] ?? ""); });
      setFormData(fd);
    } else {
      setEditingId(null);
      const fd: Record<string, string> = {};
      fields.forEach(f => { fd[f.fieldName] = ""; });
      setFormData(fd);
    }
    setIsFormOpen(true);
  };

  const handleSave = () => {
    const payload: Record<string, any> = {};
    fields.forEach(f => { payload[f.fieldName] = formData[f.fieldName] || null; });
    if (editingId) {
      updateMutation.mutate({ id: editingId, d: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleDelete = (id: number) => {
    if (!confirm("Delete this record?")) return;
    deleteMutation.mutate(id);
  };

  if (isLoading) {
    return (
      <AppLayout title="Service">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (error || !definition) {
    return (
      <AppLayout title="Service">
        <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground">
          <Database className="w-12 h-12 opacity-30" />
          <p>Service not found or unavailable.</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={definition.name}>
      <div className="bg-card rounded-2xl shadow-sm border border-border/50 p-6 flex flex-col" style={{ minHeight: "calc(100vh - 120px)" }}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Server className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-base">{definition.name}</h3>
              <p className="text-xs text-muted-foreground font-mono">table: {definition.slug}</p>
            </div>
            {definition.isBuiltIn && (
              <Badge variant="outline" className="text-xs text-muted-foreground">Built-in</Badge>
            )}
          </div>
          <Button size="sm" className="h-9 shadow-sm shadow-primary/20" onClick={() => handleOpenForm()}>
            <Plus className="w-4 h-4 mr-1.5" /> Add Record
          </Button>
        </div>

        <div className="flex-1 overflow-auto border rounded-xl">
          <Table>
            <TableHeader className="bg-muted/50 sticky top-0 z-10">
              <TableRow>
                <TableHead className="w-10">#</TableHead>
                {fields.map(f => (
                  <TableHead key={f.id}>{f.fieldLabel}</TableHead>
                ))}
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={fields.length + 2} className="h-32 text-center text-muted-foreground">
                    No records yet. Add one using the button above.
                  </TableCell>
                </TableRow>
              ) : records.map((rec, idx) => (
                <TableRow key={rec.id} className="hover:bg-muted/30">
                  <TableCell className="text-muted-foreground text-sm">{idx + 1}</TableCell>
                  {fields.map(f => (
                    <TableCell key={f.id} className="text-sm">{rec[f.fieldName] ?? "—"}</TableCell>
                  ))}
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-600 bg-amber-50 hover:bg-amber-100"
                        title="Edit" onClick={() => handleOpenForm(rec)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-600 bg-rose-50 hover:bg-rose-100"
                        title="Delete" onClick={() => handleDelete(rec.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={isFormOpen} onOpenChange={v => { if (!v) setIsFormOpen(false); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Record" : "Add Record"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {fields.map(f => (
              <div key={f.id} className="space-y-1.5">
                <Label className="flex items-center gap-1">
                  {f.fieldLabel}
                  {f.isRequired && <span className="text-rose-500 text-xs">*</span>}
                </Label>
                <Input
                  type={f.fieldType === "email" ? "email" : f.fieldType === "number" ? "number" : f.fieldType === "date" ? "date" : "text"}
                  value={formData[f.fieldName] || ""}
                  onChange={e => setFormData(p => ({ ...p, [f.fieldName]: e.target.value }))}
                  placeholder={f.fieldLabel}
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
              {(createMutation.isPending || updateMutation.isPending)
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</>
                : "Save Record"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
