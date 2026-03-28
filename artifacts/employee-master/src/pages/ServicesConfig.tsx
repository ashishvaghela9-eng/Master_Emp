import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, ChevronRight, Server, Shield, Database, Loader2, Info, X, ArrowUp, ArrowDown, Table2, Pencil, CheckSquare } from "lucide-react";

const token = () => localStorage.getItem("auth_token");
const authHeaders = () => ({ Authorization: `Bearer ${token()}` });

interface ServiceField { id: number; serviceId: number; fieldName: string; fieldLabel: string; fieldType: string; isRequired: boolean; sortOrder: number; }
interface ServiceDefinition { id: number; name: string; slug: string; isBuiltIn: boolean; hasTable: boolean; createdAt: string; fields: ServiceField[]; }
interface NewField { fieldName: string; fieldLabel: string; fieldType: string; isRequired: boolean; }
interface ServiceRecord { id: number; [key: string]: any; }

const FIELD_TYPES = [
  { value: "text", label: "Text" },
  { value: "email", label: "Email" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
];
const FIELD_TYPE_COLORS: Record<string, string> = {
  text: "bg-blue-50 text-blue-700 border-blue-200",
  email: "bg-purple-50 text-purple-700 border-purple-200",
  number: "bg-amber-50 text-amber-700 border-amber-200",
  date: "bg-green-50 text-green-700 border-green-200",
};
const EMPTY_FIELD: NewField = { fieldName: "", fieldLabel: "", fieldType: "text", isRequired: false };

async function fetchServiceDefs(): Promise<ServiceDefinition[]> {
  const res = await fetch("/api/service-definitions", { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed");
  return res.json();
}
async function fetchServiceData(slug: string): Promise<{ definition: ServiceDefinition & { fields: ServiceField[] }; records: ServiceRecord[] }> {
  const res = await fetch(`/api/services/${slug}`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to fetch service data");
  return res.json();
}
async function createService(data: { name: string; fields: NewField[]; createTable: boolean }): Promise<ServiceDefinition> {
  const res = await fetch("/api/service-definitions", { method: "POST", headers: { "Content-Type": "application/json", ...authHeaders() }, body: JSON.stringify(data) });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Failed to create service");
  return json;
}
async function updateServiceName(id: number, name: string): Promise<ServiceDefinition> {
  const res = await fetch(`/api/service-definitions/${id}`, { method: "PUT", headers: { "Content-Type": "application/json", ...authHeaders() }, body: JSON.stringify({ name }) });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Failed to update service");
  return json;
}
async function deleteService(id: number): Promise<void> {
  const res = await fetch(`/api/service-definitions/${id}`, { method: "DELETE", headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to delete service");
}
async function addField(serviceId: number, field: NewField): Promise<ServiceField> {
  const res = await fetch(`/api/service-definitions/${serviceId}/fields`, { method: "POST", headers: { "Content-Type": "application/json", ...authHeaders() }, body: JSON.stringify(field) });
  if (!res.ok) throw new Error("Failed to add field");
  return res.json();
}
async function deleteField(serviceId: number, fieldId: number): Promise<void> {
  const res = await fetch(`/api/service-definitions/${serviceId}/fields/${fieldId}`, { method: "DELETE", headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to delete field");
}
async function reorderFields(serviceId: number, fieldIds: number[]): Promise<void> {
  const res = await fetch(`/api/service-definitions/${serviceId}/fields/reorder`, { method: "PATCH", headers: { "Content-Type": "application/json", ...authHeaders() }, body: JSON.stringify({ fieldIds }) });
  if (!res.ok) throw new Error("Failed to reorder fields");
}
async function addRecord(slug: string, data: Record<string, any>): Promise<ServiceRecord> {
  const res = await fetch(`/api/services/${slug}/records`, { method: "POST", headers: { "Content-Type": "application/json", ...authHeaders() }, body: JSON.stringify(data) });
  if (!res.ok) throw new Error("Failed to add record");
  return res.json();
}
async function updateRecord(slug: string, id: number, data: Record<string, any>): Promise<ServiceRecord> {
  const res = await fetch(`/api/services/${slug}/records/${id}`, { method: "PUT", headers: { "Content-Type": "application/json", ...authHeaders() }, body: JSON.stringify(data) });
  if (!res.ok) throw new Error("Failed to update record");
  return res.json();
}
async function deleteRecord(slug: string, id: number): Promise<void> {
  const res = await fetch(`/api/services/${slug}/records/${id}`, { method: "DELETE", headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to delete record");
}

// ─── Shared Field Row ────────────────────────────────────────────────────────
function FieldRow({ field, isBuiltIn, onDelete, onMoveUp, onMoveDown, isFirst, isLast }: {
  field: ServiceField; isBuiltIn: boolean; onDelete: () => void;
  onMoveUp: () => void; onMoveDown: () => void; isFirst: boolean; isLast: boolean;
}) {
  const [confirmDel, setConfirmDel] = useState(false);
  return (
    <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border bg-muted/10 hover:bg-muted/20 transition-colors group">
      <div className="flex flex-col gap-0.5 flex-shrink-0">
        <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground hover:text-foreground disabled:opacity-30" disabled={isFirst} onClick={onMoveUp}><ArrowUp className="w-3 h-3" /></Button>
        <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground hover:text-foreground disabled:opacity-30" disabled={isLast} onClick={onMoveDown}><ArrowDown className="w-3 h-3" /></Button>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{field.fieldLabel}</span>
          {field.isRequired && <Badge variant="outline" className="text-xs px-1.5 py-0 border-rose-200 text-rose-600">required</Badge>}
        </div>
        <span className="text-xs text-muted-foreground font-mono">{field.fieldName}</span>
      </div>
      <Badge variant="outline" className={`text-xs ${FIELD_TYPE_COLORS[field.fieldType] || FIELD_TYPE_COLORS.text}`}>{field.fieldType}</Badge>
      {!isBuiltIn && (confirmDel ? (
        <div className="flex items-center gap-1 animate-in fade-in slide-in-from-right-2">
          <Button variant="destructive" size="sm" className="h-6 text-xs px-2" onClick={() => { setConfirmDel(false); onDelete(); }}>Yes</Button>
          <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={() => setConfirmDel(false)}>No</Button>
        </div>
      ) : (
        <Button variant="ghost" size="icon" className="h-7 w-7 text-rose-500 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => setConfirmDel(true)}><Trash2 className="w-3.5 h-3.5" /></Button>
      ))}
      {isBuiltIn && (
        <Button variant="ghost" size="icon" className="h-7 w-7 text-rose-500 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => { if (window.confirm("Remove this field? This will drop the column from the database.")) onDelete(); }}>
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      )}
    </div>
  );
}

// ─── Add Field Form ──────────────────────────────────────────────────────────
function AddFieldForm({ serviceId, onAdded }: { serviceId: number; onAdded: () => void }) {
  const [field, setField] = useState<NewField>({ ...EMPTY_FIELD });
  const { toast } = useToast();
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => addField(serviceId, { ...field, fieldName: field.fieldLabel.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_") }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/service-definitions"] }); toast({ title: "Field added" }); setField({ ...EMPTY_FIELD }); onAdded(); },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });
  return (
    <div className="border border-primary/20 rounded-xl p-4 bg-primary/5 space-y-3">
      <p className="text-sm font-semibold text-primary">Add New Field</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1.5 sm:col-span-1">
          <Label className="text-xs">Field Label *</Label>
          <Input value={field.fieldLabel} onChange={e => setField(p => ({ ...p, fieldLabel: e.target.value }))} placeholder="e.g. Full Name" className="h-9" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Type</Label>
          <Select value={field.fieldType} onValueChange={v => setField(p => ({ ...p, fieldType: v }))}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>{FIELD_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Required?</Label>
          <div className="flex items-center gap-2 h-9">
            <Switch checked={field.isRequired} onCheckedChange={v => setField(p => ({ ...p, isRequired: v }))} />
            <span className="text-xs text-muted-foreground">{field.isRequired ? "Yes" : "No"}</span>
          </div>
        </div>
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={() => mutation.mutate()} disabled={!field.fieldLabel.trim() || mutation.isPending} className="h-8">
          {mutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Plus className="w-3.5 h-3.5 mr-1" />} Add Field
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setField({ ...EMPTY_FIELD })} className="h-8"><X className="w-3.5 h-3.5 mr-1" /> Clear</Button>
      </div>
    </div>
  );
}

// ─── Fields Panel (used in "Create Service with Table" tab) ──────────────────
function FieldsPanel({ svc, onDeleteService }: { svc: ServiceDefinition; onDeleteService?: () => void }) {
  const [showAddField, setShowAddField] = useState(false);
  const { toast } = useToast();
  const qc = useQueryClient();

  const deleteFieldMutation = useMutation({
    mutationFn: (fieldId: number) => deleteField(svc.id, fieldId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/service-definitions"] }); toast({ title: "Field removed" }); },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });
  const reorderMutation = useMutation({
    mutationFn: (fieldIds: number[]) => reorderFields(svc.id, fieldIds),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/service-definitions"] }),
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });
  const handleMove = (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= svc.fields.length) return;
    const arr = [...svc.fields];
    const [m] = arr.splice(fromIdx, 1);
    arr.splice(toIdx, 0, m);
    reorderMutation.mutate(arr.map(f => f.id));
  };

  return (
    <div className="space-y-3 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Fields ({svc.fields.length})</p>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setShowAddField(p => !p)}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Add Field
          </Button>
          {onDeleteService && !svc.isBuiltIn && (
            <Button size="sm" variant="outline" className="h-8 text-xs text-rose-600 border-rose-200 hover:bg-rose-50" onClick={onDeleteService}>
              <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete Service
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2">
        {showAddField && <AddFieldForm serviceId={svc.id} onAdded={() => setShowAddField(false)} />}
        {svc.fields.length === 0 ? (
          <div className="text-center py-8 border border-dashed rounded-xl text-muted-foreground text-sm">No fields defined yet.</div>
        ) : svc.fields.map((field, idx) => (
          <FieldRow key={field.id} field={field} isBuiltIn={svc.isBuiltIn}
            isFirst={idx === 0} isLast={idx === svc.fields.length - 1}
            onDelete={() => deleteFieldMutation.mutate(field.id)}
            onMoveUp={() => handleMove(idx, idx - 1)}
            onMoveDown={() => handleMove(idx, idx + 1)}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Records Panel ───────────────────────────────────────────────────────────
function RecordsPanel({ svc }: { svc: ServiceDefinition }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<ServiceRecord | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["/api/services", svc.slug],
    queryFn: () => fetchServiceData(svc.slug),
    enabled: !!svc.slug,
  });

  const fields = (data?.definition?.fields ?? svc.fields).filter(
    f => f.fieldName !== "id" && f.fieldName !== "created_at" && f.fieldName !== "updated_at"
  );
  const records: ServiceRecord[] = data?.records ?? [];

  const addMutation = useMutation({
    mutationFn: () => addRecord(svc.slug, formData),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/services", svc.slug] });
      toast({ title: "Entry added" }); setAddOpen(false); setFormData({});
    },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });
  const editMutation = useMutation({
    mutationFn: () => updateRecord(svc.slug, editRecord!.id, formData),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/services", svc.slug] });
      toast({ title: "Entry updated" }); setEditRecord(null); setFormData({});
    },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteRecord(svc.slug, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/services", svc.slug] });
      toast({ title: "Entry deleted" }); setDeleteConfirmId(null);
    },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const openAdd = () => { setFormData({}); setAddOpen(true); };
  const openEdit = (rec: ServiceRecord) => {
    const d: Record<string, string> = {};
    fields.forEach(f => { d[f.fieldName] = rec[f.fieldName] != null ? String(rec[f.fieldName]) : ""; });
    setFormData(d); setEditRecord(rec);
  };

  const RecordFormDialog = ({ open, onClose, onSave, saving, title }: { open: boolean; onClose: () => void; onSave: () => void; saving: boolean; title: string }) => (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Plus className="w-5 h-5 text-primary" />{title} — {svc.name}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          {fields.length === 0 ? (
            <p className="text-sm text-muted-foreground">No fields defined for this service.</p>
          ) : fields.map(f => (
            <div key={f.id} className="space-y-1.5">
              <Label className="text-sm">{f.fieldLabel}{f.isRequired && <span className="text-rose-500 ml-1">*</span>}</Label>
              <Input
                type={f.fieldType === "date" ? "date" : f.fieldType === "email" ? "email" : f.fieldType === "number" ? "number" : "text"}
                value={formData[f.fieldName] ?? ""}
                onChange={e => setFormData(p => ({ ...p, [f.fieldName]: e.target.value }))}
                placeholder={f.fieldLabel}
                className="h-10"
              />
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={onSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />} Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="space-y-3 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Entries ({records.length})
        </p>
        <Button size="sm" className="h-8 text-xs" onClick={openAdd}>
          <Plus className="w-3.5 h-3.5 mr-1" /> Add Entry
        </Button>
      </div>

      <div className="flex-1 overflow-auto border rounded-xl">
        {isLoading ? (
          <div className="flex items-center justify-center h-32"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : fields.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground text-sm">No fields defined — add fields in the Fields tab first.</div>
        ) : records.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground text-sm">No entries yet. Click "Add Entry" to create the first record.</div>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-muted/50">
                <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide border-b w-10">#</th>
                {fields.map(f => <th key={f.id} className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide border-b whitespace-nowrap">{f.fieldLabel}</th>)}
                <th className="px-3 py-2 border-b w-20 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {records.map((rec, idx) => (
                <tr key={rec.id} className="hover:bg-muted/20 border-b last:border-b-0">
                  <td className="px-3 py-2 text-muted-foreground text-xs">{idx + 1}</td>
                  {fields.map(f => (
                    <td key={f.id} className="px-3 py-2 max-w-[180px] truncate" title={String(rec[f.fieldName] ?? "")}>
                      {rec[f.fieldName] != null ? String(rec[f.fieldName]) : <span className="text-muted-foreground/40">—</span>}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-right">
                    {deleteConfirmId === rec.id ? (
                      <div className="flex items-center gap-1 justify-end">
                        <Button variant="destructive" size="sm" className="h-6 text-xs px-2" onClick={() => deleteMutation.mutate(rec.id)} disabled={deleteMutation.isPending}>Yes</Button>
                        <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={() => setDeleteConfirmId(null)}>No</Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 justify-end">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => openEdit(rec)}><Pencil className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-rose-500 hover:bg-rose-50" onClick={() => setDeleteConfirmId(rec.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <RecordFormDialog open={addOpen} onClose={() => { setAddOpen(false); setFormData({}); }} onSave={() => addMutation.mutate()} saving={addMutation.isPending} title="Add Entry" />
      <RecordFormDialog open={!!editRecord} onClose={() => { setEditRecord(null); setFormData({}); }} onSave={() => editMutation.mutate()} saving={editMutation.isPending} title="Edit Entry" />
    </div>
  );
}

// ─── Right panel for "Create Service with Table" tab ─────────────────────────
function TableServicePanel({ svc, onDeleteService }: { svc: ServiceDefinition; onDeleteService?: () => void }) {
  const [activeInner, setActiveInner] = useState<"entries" | "fields">("entries");

  return (
    <div className="bg-card rounded-xl border h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center"><Table2 className="w-5 h-5 text-primary" /></div>
          <div>
            <h3 className="font-semibold text-base">{svc.name}</h3>
            <p className="text-xs text-muted-foreground font-mono">table: {svc.slug}</p>
          </div>
          {svc.isBuiltIn && <Badge className="bg-slate-100 text-slate-600 border-slate-200 ml-1"><Shield className="w-3 h-3 mr-1" />Built-in</Badge>}
        </div>
        {!svc.isBuiltIn && onDeleteService && (
          <Button size="sm" variant="outline" className="h-8 text-xs text-rose-600 border-rose-200 hover:bg-rose-50" onClick={onDeleteService}>
            <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
          </Button>
        )}
      </div>

      {/* DB info */}
      <div className="px-5 py-2.5 border-b bg-muted/10 flex items-center gap-2 text-xs text-muted-foreground">
        <Database className="w-3.5 h-3.5 text-primary" />
        <span>Table: <code className="font-mono bg-muted px-1 py-0.5 rounded">{svc.slug}</code></span>
        <span className="text-border">·</span>
        <span>{svc.fields.length} columns</span>
        {svc.isBuiltIn && <><span className="text-border">·</span><Info className="w-3.5 h-3.5 text-amber-500" /><span className="text-amber-600">Built-in service</span></>}
      </div>

      {/* Inner tabs — only for table-backed services */}
      {svc.hasTable && (
        <div className="px-5 pt-3 pb-0 border-b flex gap-4">
          <button
            onClick={() => setActiveInner("entries")}
            className={`pb-2.5 text-sm font-medium border-b-2 transition-colors ${activeInner === "entries" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            Entries
          </button>
          <button
            onClick={() => setActiveInner("fields")}
            className={`pb-2.5 text-sm font-medium border-b-2 transition-colors ${activeInner === "fields" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            Fields
          </button>
        </div>
      )}

      {/* Inner content */}
      <div className="flex-1 overflow-hidden p-5">
        {activeInner === "entries" ? (
          <RecordsPanel svc={svc} />
        ) : (
          <FieldsPanel svc={svc} onDeleteService={onDeleteService} />
        )}
      </div>
    </div>
  );
}

// ─── Right panel for "Create Service" tab (simple: name + edit + delete) ─────
function StandaloneServicePanel({ svc, onDeleteService, onRename }: {
  svc: ServiceDefinition;
  onDeleteService: () => void;
  onRename: () => void;
}) {
  return (
    <div className="bg-card rounded-xl border h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Server className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-base">{svc.name}</h3>
            <p className="text-xs text-muted-foreground font-mono">{svc.slug}</p>
          </div>
        </div>
        <Badge variant="outline" className="text-xs text-amber-600 border-amber-200">Standalone</Badge>
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6 p-10 text-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <CheckSquare className="w-8 h-8 text-primary" />
        </div>
        <div className="space-y-2 max-w-sm">
          <p className="font-semibold text-lg">{svc.name}</p>
          <p className="text-sm text-muted-foreground">
            This service is tracked as an <strong>access toggle</strong> on employee profiles. It does not have a dedicated database table.
          </p>
        </div>
        <Badge variant="outline" className="text-blue-600 border-blue-200">Access-tracked only</Badge>

        {/* Action buttons */}
        <div className="flex gap-3 mt-2">
          <Button variant="outline" className="gap-2" onClick={onRename}>
            <Pencil className="w-4 h-4" /> Edit Name
          </Button>
          <Button variant="outline" className="gap-2 text-rose-600 border-rose-200 hover:bg-rose-50" onClick={onDeleteService}>
            <Trash2 className="w-4 h-4" /> Remove Service
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Built-in access-only panel ───────────────────────────────────────────────
function BuiltInAccessPanel({ svc }: { svc: ServiceDefinition }) {
  return (
    <div className="bg-card rounded-xl border h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Server className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-base">{svc.name}</h3>
            <p className="text-xs text-muted-foreground font-mono">{svc.slug}</p>
          </div>
        </div>
        <Badge className="bg-slate-100 text-slate-600 border-slate-200"><Shield className="w-3 h-3 mr-1" />Built-in</Badge>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center gap-4 p-10 text-center">
        <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center">
          <CheckSquare className="w-7 h-7 text-blue-500" />
        </div>
        <div className="space-y-2 max-w-sm">
          <p className="font-semibold text-base">{svc.name}</p>
          <p className="text-sm text-muted-foreground">
            This is a built-in service tracked as an <strong>access toggle</strong> on employee profiles. It cannot be removed.
          </p>
        </div>
        <Badge variant="outline" className="text-blue-600 border-blue-200">Access-tracked only</Badge>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function ServicesConfig() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<"standalone" | "with-table">("standalone");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // Standalone create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [newSvcName, setNewSvcName] = useState("");

  // Rename dialog
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameSvc, setRenameSvc] = useState<ServiceDefinition | null>(null);
  const [renameValue, setRenameValue] = useState("");

  // Table create dialog
  const [tableCreateOpen, setTableCreateOpen] = useState(false);
  const [tableNewSvcName, setTableNewSvcName] = useState("");
  const [tableNewSvcFields, setTableNewSvcFields] = useState<NewField[]>([{ ...EMPTY_FIELD }]);

  const [deleteConfirm, setDeleteConfirm] = useState<ServiceDefinition | null>(null);

  const { data: services = [], isLoading } = useQuery<ServiceDefinition[]>({
    queryKey: ["/api/service-definitions"],
    queryFn: fetchServiceDefs,
  });

  // Tab 1: ALL services without a table
  const standaloneServices = services.filter(s => !s.hasTable);
  // Tab 2: ONLY table-backed services
  const tableServices = services.filter(s => s.hasTable);

  const currentList = activeTab === "standalone" ? standaloneServices : tableServices;
  const selectedSvc = services.find(s => s.id === selectedId) || null;

  const createStandaloneMutation = useMutation({
    mutationFn: (name: string) => createService({ name, fields: [], createTable: false }),
    onSuccess: (svc) => {
      qc.invalidateQueries({ queryKey: ["/api/service-definitions"] });
      qc.invalidateQueries({ queryKey: ["/api/config"] });
      toast({ title: "Service created", description: `${svc.name} has been created.` });
      setCreateOpen(false); setNewSvcName(""); setSelectedId(svc.id);
    },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const createTableMutation = useMutation({
    mutationFn: (data: { name: string; fields: NewField[] }) => createService({ name: data.name, fields: data.fields, createTable: true }),
    onSuccess: (svc) => {
      qc.invalidateQueries({ queryKey: ["/api/service-definitions"] });
      qc.invalidateQueries({ queryKey: ["/api/config"] });
      toast({ title: "Service created", description: `${svc.name} has been created and added to the sidebar.` });
      setTableCreateOpen(false); setTableNewSvcName(""); setTableNewSvcFields([{ ...EMPTY_FIELD }]); setSelectedId(svc.id);
    },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const renameMutation = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) => updateServiceName(id, name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/service-definitions"] });
      toast({ title: "Service renamed" }); setRenameOpen(false); setRenameSvc(null); setRenameValue("");
    },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteService(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/service-definitions"] });
      qc.invalidateQueries({ queryKey: ["/api/config"] });
      toast({ title: "Service deleted" }); setDeleteConfirm(null); setSelectedId(null);
    },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const handleTableFieldChange = (idx: number, key: keyof NewField, value: any) =>
    setTableNewSvcFields(p => p.map((f, i) => i === idx ? { ...f, [key]: value } : f));
  const addTableField = () => setTableNewSvcFields(p => [...p, { ...EMPTY_FIELD }]);
  const removeTableField = (idx: number) => setTableNewSvcFields(p => p.filter((_, i) => i !== idx));

  const handleTabChange = (tab: "standalone" | "with-table") => {
    setActiveTab(tab); setSelectedId(null);
  };

  const openRename = (svc: ServiceDefinition) => {
    setRenameSvc(svc); setRenameValue(svc.name); setRenameOpen(true);
  };

  return (
    <AppLayout title="Add Services">
      <div className="space-y-4 h-full" style={{ minHeight: "calc(100vh - 130px)" }}>

        {/* Top tabs */}
        <div className="flex gap-1 bg-muted/40 p-1 rounded-xl w-fit border">
          <button
            onClick={() => handleTabChange("standalone")}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === "standalone" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Server className="w-4 h-4 inline mr-2 -mt-0.5" />Create Services
          </button>
          <button
            onClick={() => handleTabChange("with-table")}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === "with-table" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Table2 className="w-4 h-4 inline mr-2 -mt-0.5" />Create Services with Table
          </button>
        </div>

        {/* Two-panel layout */}
        <div className="flex gap-4" style={{ height: "calc(100vh - 210px)" }}>

          {/* Left — service list */}
          <div className="w-72 flex-shrink-0 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm text-foreground">
                {activeTab === "standalone" ? "Standalone Services" : "Services with Table"}
              </h3>
              {activeTab === "standalone" && (
                <Button size="sm" className="h-8 text-xs" onClick={() => setCreateOpen(true)}>
                  <Plus className="w-3.5 h-3.5 mr-1" /> New
                </Button>
              )}
              {activeTab === "with-table" && (
                <Button size="sm" className="h-8 text-xs" onClick={() => setTableCreateOpen(true)}>
                  <Plus className="w-3.5 h-3.5 mr-1" /> New
                </Button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 bg-card border rounded-xl p-2">
              {isLoading ? (
                <div className="flex items-center justify-center h-24"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
              ) : currentList.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground px-3">
                  {activeTab === "standalone" ? "No standalone services yet. Click 'New' to create one." : "No table services yet. Click 'New' to create one."}
                </div>
              ) : currentList.map(svc => (
                <button
                  key={svc.id}
                  onClick={() => setSelectedId(svc.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${selectedId === svc.id ? "bg-primary/10 text-primary" : "hover:bg-muted/40"}`}
                >
                  {activeTab === "with-table" ? <Table2 className="w-4 h-4 flex-shrink-0" /> : <Server className="w-4 h-4 flex-shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{svc.name}</p>
                  </div>
                  {svc.isBuiltIn && <Badge variant="outline" className="text-xs px-1.5 py-0 text-muted-foreground flex-shrink-0">Built-in</Badge>}
                  <ChevronRight className={`w-4 h-4 flex-shrink-0 transition-opacity ${selectedId === svc.id ? "opacity-100 text-primary" : "opacity-0"}`} />
                </button>
              ))}
            </div>
          </div>

          {/* Right — detail panel */}
          <div className="flex-1 min-w-0">
            {!selectedSvc ? (
              <div className="flex flex-col items-center justify-center h-full text-center gap-3 bg-card rounded-xl border p-10">
                {activeTab === "standalone" ? <Server className="w-12 h-12 text-muted-foreground/30" /> : <Table2 className="w-12 h-12 text-muted-foreground/30" />}
                <p className="text-muted-foreground font-medium">
                  {activeTab === "standalone" ? "Select a service to view or manage it" : "Select a service to manage its entries and fields"}
                </p>
                <p className="text-xs text-muted-foreground">Or create a new service using the button on the left</p>
              </div>
            ) : activeTab === "standalone" ? (
              selectedSvc.isBuiltIn ? (
                <BuiltInAccessPanel svc={selectedSvc} />
              ) : (
                <StandaloneServicePanel
                  svc={selectedSvc}
                  onDeleteService={() => setDeleteConfirm(selectedSvc)}
                  onRename={() => openRename(selectedSvc)}
                />
              )
            ) : (
              <TableServicePanel svc={selectedSvc} onDeleteService={!selectedSvc.isBuiltIn ? () => setDeleteConfirm(selectedSvc) : undefined} />
            )}
          </div>
        </div>
      </div>

      {/* Create standalone service dialog */}
      <Dialog open={createOpen} onOpenChange={v => { if (!v) { setCreateOpen(false); setNewSvcName(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" />
              Create Service
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              Add a service tracked as an access toggle on employee profiles.
            </p>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Service Name *</Label>
              <Input
                value={newSvcName}
                onChange={e => setNewSvcName(e.target.value)}
                placeholder="e.g. Sophos, Salesforce..."
                className="h-11"
                onKeyDown={e => e.key === "Enter" && newSvcName.trim() && createStandaloneMutation.mutate(newSvcName.trim())}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button
              onClick={() => createStandaloneMutation.mutate(newSvcName.trim())}
              disabled={!newSvcName.trim() || createStandaloneMutation.isPending}
            >
              {createStandaloneMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              Create Service
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename dialog */}
      <Dialog open={renameOpen} onOpenChange={v => { if (!v) { setRenameOpen(false); setRenameSvc(null); setRenameValue(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-5 h-5 text-primary" />
              Edit Service Name
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Service Name *</Label>
              <Input
                value={renameValue}
                onChange={e => setRenameValue(e.target.value)}
                placeholder="Service name"
                className="h-11"
                onKeyDown={e => e.key === "Enter" && renameValue.trim() && renameSvc && renameMutation.mutate({ id: renameSvc.id, name: renameValue.trim() })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameOpen(false)}>Cancel</Button>
            <Button
              onClick={() => renameSvc && renameMutation.mutate({ id: renameSvc.id, name: renameValue.trim() })}
              disabled={!renameValue.trim() || renameValue === renameSvc?.name || renameMutation.isPending}
            >
              {renameMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Pencil className="w-4 h-4 mr-2" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create service with table dialog */}
      <Dialog open={tableCreateOpen} onOpenChange={v => { if (!v) { setTableCreateOpen(false); setTableNewSvcName(""); setTableNewSvcFields([{ ...EMPTY_FIELD }]); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Table2 className="w-5 h-5 text-primary" />
              Create Service with Table
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              A new database table will be created. The service will automatically appear in the sidebar.
            </p>
          </DialogHeader>
          <div className="space-y-5 py-2">
            <div className="space-y-1.5">
              <Label>Service Name *</Label>
              <Input value={tableNewSvcName} onChange={e => setTableNewSvcName(e.target.value)} placeholder="e.g. Sophos, Salesforce..." className="h-11" />
              {tableNewSvcName && (
                <p className="text-xs text-muted-foreground">
                  Slug: <code className="font-mono bg-muted px-1 rounded">svc_{tableNewSvcName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_")}</code>
                </p>
              )}
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Fields <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={addTableField}><Plus className="w-3 h-3 mr-1" /> Add Field</Button>
              </div>
              <div className="space-y-3">
                {tableNewSvcFields.map((field, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-start p-3 rounded-xl bg-muted/10 border">
                    <div className="col-span-4 space-y-1">
                      <Label className="text-xs">Label *</Label>
                      <Input value={field.fieldLabel} onChange={e => handleTableFieldChange(idx, "fieldLabel", e.target.value)} placeholder="Field label" className="h-9 text-sm" />
                    </div>
                    <div className="col-span-3 space-y-1">
                      <Label className="text-xs">Type</Label>
                      <Select value={field.fieldType} onValueChange={v => handleTableFieldChange(idx, "fieldType", v)}>
                        <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>{FIELD_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-3 space-y-1">
                      <Label className="text-xs">Required?</Label>
                      <div className="flex items-center gap-2 h-9">
                        <Switch checked={field.isRequired} onCheckedChange={v => handleTableFieldChange(idx, "isRequired", v)} />
                        <span className="text-xs">{field.isRequired ? "Yes" : "No"}</span>
                      </div>
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs opacity-0">Del</Label>
                      <Button variant="ghost" size="icon" className="h-9 w-9 text-rose-500 hover:bg-rose-50" onClick={() => removeTableField(idx)} disabled={tableNewSvcFields.length === 1}><X className="w-4 h-4" /></Button>
                    </div>
                    {field.fieldLabel && <div className="col-span-12"><p className="text-xs text-muted-foreground font-mono">DB column: {field.fieldLabel.toLowerCase().replace(/[^a-z0-9]+/g, "_")}</p></div>}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setTableCreateOpen(false)} className="sm:mr-auto">Cancel</Button>
            <Button
              onClick={() => createTableMutation.mutate({ name: tableNewSvcName.trim(), fields: tableNewSvcFields.filter(f => f.fieldLabel.trim()) })}
              disabled={!tableNewSvcName.trim() || createTableMutation.isPending}
            >
              {createTableMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Table2 className="w-4 h-4 mr-2" />}
              Create Service with Table
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={v => { if (!v) setDeleteConfirm(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="text-rose-600">Delete Service</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently delete <strong>{deleteConfirm?.name}</strong>
            {deleteConfirm?.hasTable ? " and drop its database table. All data will be lost." : "."}
            {" "}This action cannot be undone.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && deleteMutation.mutate(deleteConfirm.id)} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />} Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
