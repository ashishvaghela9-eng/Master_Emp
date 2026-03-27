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
import { Plus, Trash2, ChevronRight, Server, Shield, Database, Loader2, Info, X, ArrowUp, ArrowDown } from "lucide-react";

const token = () => localStorage.getItem("auth_token");
const authHeaders = () => ({ Authorization: `Bearer ${token()}` });

interface ServiceField {
  id: number;
  serviceId: number;
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
  createdAt: string;
  fields: ServiceField[];
}

interface NewField {
  fieldName: string;
  fieldLabel: string;
  fieldType: string;
  isRequired: boolean;
}

const FIELD_TYPES = [
  { value: "text",   label: "Text" },
  { value: "email",  label: "Email" },
  { value: "number", label: "Number" },
  { value: "date",   label: "Date" },
];

const FIELD_TYPE_COLORS: Record<string, string> = {
  text:   "bg-blue-50 text-blue-700 border-blue-200",
  email:  "bg-purple-50 text-purple-700 border-purple-200",
  number: "bg-amber-50 text-amber-700 border-amber-200",
  date:   "bg-green-50 text-green-700 border-green-200",
};

async function fetchServiceDefs(): Promise<ServiceDefinition[]> {
  const res = await fetch("/api/service-definitions", { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed");
  return res.json();
}

async function createService(data: { name: string; fields: NewField[]; createTable: boolean }): Promise<ServiceDefinition> {
  const res = await fetch("/api/service-definitions", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Failed to create service");
  return json;
}

async function deleteService(id: number): Promise<void> {
  const res = await fetch(`/api/service-definitions/${id}`, { method: "DELETE", headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to delete service");
}

async function addField(serviceId: number, field: NewField): Promise<ServiceField> {
  const res = await fetch(`/api/service-definitions/${serviceId}/fields`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(field),
  });
  if (!res.ok) throw new Error("Failed to add field");
  return res.json();
}

async function deleteField(serviceId: number, fieldId: number): Promise<void> {
  const res = await fetch(`/api/service-definitions/${serviceId}/fields/${fieldId}`, { method: "DELETE", headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to delete field");
}

async function reorderFields(serviceId: number, fieldIds: number[]): Promise<void> {
  const res = await fetch(`/api/service-definitions/${serviceId}/fields/reorder`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ fieldIds }),
  });
  if (!res.ok) throw new Error("Failed to reorder fields");
}

const EMPTY_FIELD: NewField = { fieldName: "", fieldLabel: "", fieldType: "text", isRequired: false };

function FieldRow({ field, isBuiltIn, onDelete, onMoveUp, onMoveDown, isFirst, isLast }: {
  field: ServiceField; isBuiltIn: boolean; onDelete: () => void;
  onMoveUp: () => void; onMoveDown: () => void; isFirst: boolean; isLast: boolean;
}) {
  const [confirmDel, setConfirmDel] = useState(false);
  return (
    <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border bg-muted/10 hover:bg-muted/20 transition-colors group">
      <div className="flex flex-col gap-0.5 flex-shrink-0">
        <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground hover:text-foreground disabled:opacity-30"
          disabled={isFirst} onClick={onMoveUp} title="Move up">
          <ArrowUp className="w-3 h-3" />
        </Button>
        <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground hover:text-foreground disabled:opacity-30"
          disabled={isLast} onClick={onMoveDown} title="Move down">
          <ArrowDown className="w-3 h-3" />
        </Button>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{field.fieldLabel}</span>
          {field.isRequired && <Badge variant="outline" className="text-xs px-1.5 py-0 border-rose-200 text-rose-600">required</Badge>}
        </div>
        <span className="text-xs text-muted-foreground font-mono">{field.fieldName}</span>
      </div>
      <Badge variant="outline" className={`text-xs ${FIELD_TYPE_COLORS[field.fieldType] || FIELD_TYPE_COLORS.text}`}>
        {field.fieldType}
      </Badge>
      {!isBuiltIn && (
        confirmDel ? (
          <div className="flex items-center gap-1 animate-in fade-in slide-in-from-right-2">
            <Button variant="destructive" size="sm" className="h-6 text-xs px-2" onClick={() => { setConfirmDel(false); onDelete(); }}>Yes</Button>
            <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={() => setConfirmDel(false)}>No</Button>
          </div>
        ) : (
          <Button variant="ghost" size="icon" className="h-7 w-7 text-rose-500 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => setConfirmDel(true)}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        )
      )}
      {isBuiltIn && (
        <Button variant="ghost" size="icon" className="h-7 w-7 text-rose-500 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-opacity"
          title="Remove field from this service"
          onClick={() => { if (window.confirm("Remove this field? This will drop the column from the database.")) onDelete(); }}>
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      )}
    </div>
  );
}

function AddFieldForm({ serviceId, onAdded }: { serviceId: number; onAdded: () => void }) {
  const [field, setField] = useState<NewField>({ ...EMPTY_FIELD });
  const { toast } = useToast();
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => addField(serviceId, {
      ...field,
      fieldName: field.fieldLabel.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_"),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/service-definitions"] });
      toast({ title: "Field added", description: `${field.fieldLabel} added and database updated.` });
      setField({ ...EMPTY_FIELD });
      onAdded();
    },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="border border-primary/20 rounded-xl p-4 bg-primary/5 space-y-3">
      <p className="text-sm font-semibold text-primary">Add New Field</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1.5 sm:col-span-1">
          <Label className="text-xs">Field Label *</Label>
          <Input value={field.fieldLabel} onChange={e => setField(p => ({ ...p, fieldLabel: e.target.value }))}
            placeholder="e.g. Full Name" className="h-9" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Type</Label>
          <Select value={field.fieldType} onValueChange={v => setField(p => ({ ...p, fieldType: v }))}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {FIELD_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
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
          {mutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Plus className="w-3.5 h-3.5 mr-1" />}
          Add Field
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setField({ ...EMPTY_FIELD })} className="h-8">
          <X className="w-3.5 h-3.5 mr-1" /> Clear
        </Button>
      </div>
    </div>
  );
}

export default function ServicesConfig() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<number | null>(null);
  const [showAddField, setShowAddField] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [newSvcName, setNewSvcName] = useState("");
  const [newSvcFields, setNewSvcFields] = useState<NewField[]>([{ ...EMPTY_FIELD }]);
  const [deleteConfirm, setDeleteConfirm] = useState<ServiceDefinition | null>(null);

  const { data: services = [], isLoading } = useQuery<ServiceDefinition[]>({
    queryKey: ["/api/service-definitions"],
    queryFn: fetchServiceDefs,
  });

  const selectedSvc = services.find(s => s.id === selected) || null;

  const createMutation = useMutation({
    mutationFn: createService,
    onSuccess: (svc, vars) => {
      qc.invalidateQueries({ queryKey: ["/api/service-definitions"] });
      const msg = vars.createTable ? `${svc.name} was created with a new database table.` : `${svc.name} was added as a tracked service (no database table).`;
      toast({ title: "Service created", description: msg });
      setCreateOpen(false);
      setNewSvcName("");
      setNewSvcFields([{ ...EMPTY_FIELD }]);
      setSelected(svc.id);
    },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteService(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/service-definitions"] });
      toast({ title: "Service deleted" });
      setDeleteConfirm(null);
      setSelected(null);
    },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const deleteFieldMutation = useMutation({
    mutationFn: ({ serviceId, fieldId }: { serviceId: number; fieldId: number }) => deleteField(serviceId, fieldId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/service-definitions"] });
      toast({ title: "Field removed", description: "Column dropped from the database." });
    },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const reorderMutation = useMutation({
    mutationFn: ({ serviceId, fieldIds }: { serviceId: number; fieldIds: number[] }) => reorderFields(serviceId, fieldIds),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/service-definitions"] });
      toast({ title: "Fields reordered" });
    },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const handleMoveField = (serviceId: number, fields: ServiceField[], fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= fields.length) return;
    const reordered = [...fields];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);
    reorderMutation.mutate({ serviceId, fieldIds: reordered.map(f => f.id) });
  };

  const handleCreateFieldChange = (idx: number, key: keyof NewField, value: any) => {
    setNewSvcFields(p => p.map((f, i) => i === idx ? { ...f, [key]: value } : f));
  };
  const addCreateField = () => setNewSvcFields(p => [...p, { ...EMPTY_FIELD }]);
  const removeCreateField = (idx: number) => setNewSvcFields(p => p.filter((_, i) => i !== idx));

  return (
    <AppLayout title="Add Services">
      <div className="flex gap-4 h-full" style={{ minHeight: "calc(100vh - 130px)" }}>

        {/* Left panel — service list */}
        <div className="w-72 flex-shrink-0 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm text-foreground">All Services</h3>
            <Button size="sm" className="h-8 text-xs" onClick={() => setCreateOpen(true)}>
              <Plus className="w-3.5 h-3.5 mr-1" /> New Service
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1.5 bg-card border rounded-xl p-2">
            {isLoading ? (
              <div className="flex items-center justify-center h-24"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
            ) : services.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">No services yet</div>
            ) : services.map(svc => (
              <button
                key={svc.id}
                onClick={() => { setSelected(svc.id); setShowAddField(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${selected === svc.id ? "bg-primary/10 text-primary" : "hover:bg-muted/40"}`}
              >
                <Server className="w-4 h-4 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{svc.name}</p>
                  <p className="text-xs text-muted-foreground">{svc.fields.length} fields</p>
                </div>
                {svc.isBuiltIn && <Badge variant="outline" className="text-xs px-1.5 py-0 text-muted-foreground flex-shrink-0">Built-in</Badge>}
                {!svc.isBuiltIn && !(svc as any).hasTable && <Badge variant="outline" className="text-xs px-1.5 py-0 text-amber-600 border-amber-200 flex-shrink-0">No Table</Badge>}
                <ChevronRight className={`w-4 h-4 flex-shrink-0 transition-opacity ${selected === svc.id ? "opacity-100 text-primary" : "opacity-0"}`} />
              </button>
            ))}
          </div>
        </div>

        {/* Right panel — fields detail */}
        <div className="flex-1 min-w-0">
          {!selectedSvc ? (
            <div className="flex flex-col items-center justify-center h-full text-center gap-3 bg-card rounded-xl border p-10">
              <Server className="w-12 h-12 text-muted-foreground/30" />
              <p className="text-muted-foreground font-medium">Select a service to view its fields</p>
              <p className="text-xs text-muted-foreground">Or create a new service using the button on the left</p>
            </div>
          ) : (
            <div className="bg-card rounded-xl border h-full flex flex-col overflow-hidden">
              {/* Service header */}
              <div className="flex items-center justify-between px-5 py-4 border-b">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Server className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-base">{selectedSvc.name}</h3>
                    <p className="text-xs text-muted-foreground font-mono">table: {selectedSvc.slug}</p>
                  </div>
                  {selectedSvc.isBuiltIn && (
                    <Badge className="bg-slate-100 text-slate-600 border-slate-200 ml-1">
                      <Shield className="w-3 h-3 mr-1" /> Built-in
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setShowAddField(p => !p)}>
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add Field
                  </Button>
                  {!selectedSvc.isBuiltIn && (
                    <Button size="sm" variant="outline" className="h-8 text-xs text-rose-600 border-rose-200 hover:bg-rose-50"
                      onClick={() => setDeleteConfirm(selectedSvc)}>
                      <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete Service
                    </Button>
                  )}
                </div>
              </div>

              {/* DB info banner */}
              <div className="px-5 py-3 border-b bg-muted/10 flex items-center gap-2 text-xs text-muted-foreground">
                <Database className="w-3.5 h-3.5 text-primary" />
                <span>Database table: <code className="font-mono bg-muted px-1 py-0.5 rounded">{selectedSvc.slug}</code></span>
                <span className="text-border">·</span>
                <span>{selectedSvc.fields.length} columns defined</span>
                {selectedSvc.isBuiltIn && (
                  <>
                    <span className="text-border">·</span>
                    <Info className="w-3.5 h-3.5 text-amber-500" />
                    <span className="text-amber-600">Built-in service — changes are applied directly to the existing table</span>
                  </>
                )}
              </div>

              {/* Fields list */}
              <div className="flex-1 overflow-y-auto p-5 space-y-3">
                {showAddField && (
                  <AddFieldForm serviceId={selectedSvc.id} onAdded={() => setShowAddField(false)} />
                )}

                {selectedSvc.fields.length === 0 ? (
                  <div className="text-center py-8 border border-dashed rounded-xl text-muted-foreground text-sm">
                    No fields defined. Add a field above to get started.
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Fields ({selectedSvc.fields.length})</p>
                    </div>
                    {selectedSvc.fields.map((field, idx) => (
                      <FieldRow
                        key={field.id}
                        field={field}
                        isBuiltIn={selectedSvc.isBuiltIn}
                        isFirst={idx === 0}
                        isLast={idx === selectedSvc.fields.length - 1}
                        onDelete={() => deleteFieldMutation.mutate({ serviceId: selectedSvc.id, fieldId: field.id })}
                        onMoveUp={() => handleMoveField(selectedSvc.id, selectedSvc.fields, idx, idx - 1)}
                        onMoveDown={() => handleMoveField(selectedSvc.id, selectedSvc.fields, idx, idx + 1)}
                      />
                    ))}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create new service dialog */}
      <Dialog open={createOpen} onOpenChange={v => { if (!v) { setCreateOpen(false); setNewSvcName(""); setNewSvcFields([{ ...EMPTY_FIELD }]); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" /> Create New Service
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              A new database table will be created with the fields you define below.
            </p>
          </DialogHeader>

          <div className="space-y-5 py-2">
            <div className="space-y-1.5">
              <Label>Service Name *</Label>
              <Input value={newSvcName} onChange={e => setNewSvcName(e.target.value)} placeholder="e.g. Sophos, Salesforce, Google Workspace..." className="h-11" />
              {newSvcName && (
                <p className="text-xs text-muted-foreground">Table name: <code className="font-mono bg-muted px-1 rounded">svc_{newSvcName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_")}</code></p>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Fields</Label>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={addCreateField}>
                  <Plus className="w-3 h-3 mr-1" /> Add Field
                </Button>
              </div>

              <div className="space-y-3">
                {newSvcFields.map((field, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-start p-3 rounded-xl bg-muted/10 border">
                    <div className="col-span-4 space-y-1">
                      <Label className="text-xs">Label *</Label>
                      <Input value={field.fieldLabel} onChange={e => handleCreateFieldChange(idx, "fieldLabel", e.target.value)}
                        placeholder="Field label" className="h-9 text-sm" />
                    </div>
                    <div className="col-span-3 space-y-1">
                      <Label className="text-xs">Type</Label>
                      <Select value={field.fieldType} onValueChange={v => handleCreateFieldChange(idx, "fieldType", v)}>
                        <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {FIELD_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-3 space-y-1">
                      <Label className="text-xs">Required?</Label>
                      <div className="flex items-center gap-2 h-9">
                        <Switch checked={field.isRequired} onCheckedChange={v => handleCreateFieldChange(idx, "isRequired", v)} />
                        <span className="text-xs">{field.isRequired ? "Yes" : "No"}</span>
                      </div>
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs opacity-0">Del</Label>
                      <Button variant="ghost" size="icon" className="h-9 w-9 text-rose-500 hover:bg-rose-50"
                        onClick={() => removeCreateField(idx)} disabled={newSvcFields.length === 1}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    {field.fieldLabel && (
                      <div className="col-span-12">
                        <p className="text-xs text-muted-foreground font-mono">DB column: {field.fieldLabel.toLowerCase().replace(/[^a-z0-9]+/g, "_")}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setCreateOpen(false)} className="sm:mr-auto">Cancel</Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => createMutation.mutate({ name: newSvcName.trim(), fields: newSvcFields.filter(f => f.fieldLabel.trim()), createTable: false })}
                disabled={!newSvcName.trim() || createMutation.isPending}
                title="Add service for access tracking only — no database table will be created"
              >
                {createMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Server className="w-4 h-4 mr-2" />}
                Create Service
              </Button>
              <Button
                onClick={() => createMutation.mutate({ name: newSvcName.trim(), fields: newSvcFields.filter(f => f.fieldLabel.trim()), createTable: true })}
                disabled={!newSvcName.trim() || createMutation.isPending}
                title="Add service and create a new database table for storing service records"
              >
                {createMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Database className="w-4 h-4 mr-2" />}
                Create Service & Table
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete service confirm */}
      <Dialog open={!!deleteConfirm} onOpenChange={v => { if (!v) setDeleteConfirm(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Service</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-2">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete <span className="font-semibold text-foreground">"{deleteConfirm?.name}"</span>?
            </p>
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-700">
              ⚠ This will permanently <strong>DROP</strong> the database table <code className="font-mono bg-rose-100 px-1 rounded">{deleteConfirm?.slug}</code> and all its data.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && deleteMutation.mutate(deleteConfirm.id)} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Delete & Drop Table
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
