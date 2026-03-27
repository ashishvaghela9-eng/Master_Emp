import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Building2, MapPin, Settings2, Upload } from "lucide-react";

const token = () => localStorage.getItem("auth_token");
const authHeaders = () => ({ Authorization: `Bearer ${token()}` });

interface ConfigItem { id: number; type: string; value: string; }

async function fetchConfig(): Promise<ConfigItem[]> {
  const res = await fetch("/api/config", { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to fetch config");
  return res.json();
}

async function addConfig(data: { type: string; value: string }): Promise<ConfigItem> {
  const res = await fetch("/api/config", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to add item");
  return res.json();
}

async function bulkAddConfig(data: { type: string; values: string[] }) {
  const res = await fetch("/api/config/bulk", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to bulk add");
  return res.json();
}

async function deleteConfig(id: number): Promise<void> {
  const res = await fetch(`/api/config/${id}`, { method: "DELETE", headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to delete item");
}

function BulkUploadDialog({
  open, onClose, type, onBulkAdd,
}: { open: boolean; onClose: () => void; type: string; onBulkAdd: (values: string[]) => void; }) {
  const [text, setText] = useState("");
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  const handleAdd = () => {
    if (!lines.length) return;
    onBulkAdd(lines);
    setText("");
    onClose();
  };
  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Bulk Add {type.charAt(0).toUpperCase() + type.slice(1)}s</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <p className="text-sm text-muted-foreground">Enter one value per line. Duplicates will be skipped automatically.</p>
          <Textarea value={text} onChange={e => setText(e.target.value)} placeholder={`Mumbai\nDelhi\nBangalore\n...`} rows={8} className="font-mono text-sm resize-none" />
          {lines.length > 0 && <p className="text-xs text-primary font-medium">{lines.length} item{lines.length !== 1 ? "s" : ""} ready to add</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleAdd} disabled={!lines.length}>Add {lines.length || ""} Items</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ConfigSection({ label, icon: Icon, type, items, onAdd, onBulkAdd, onDelete, isAdding }: {
  label: string; icon: any; type: string; items: ConfigItem[];
  onAdd: (value: string) => void; onBulkAdd: (values: string[]) => void;
  onDelete: (id: number) => void; isAdding: boolean;
}) {
  const [newValue, setNewValue] = useState("");
  const [bulkOpen, setBulkOpen] = useState(false);
  const handleAdd = () => {
    const trimmed = newValue.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setNewValue("");
  };
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-base">{label}</h3>
        <Badge variant="outline" className="ml-auto">{items.length} items</Badge>
      </div>
      <div className="flex gap-2">
        <Input value={newValue} onChange={e => setNewValue(e.target.value)} placeholder={`Add new ${label.toLowerCase()}...`} onKeyDown={e => e.key === "Enter" && handleAdd()} className="h-10" />
        <Button onClick={handleAdd} disabled={isAdding || !newValue.trim()} className="h-10 px-4"><Plus className="w-4 h-4 mr-1" /> Add</Button>
        <Button variant="outline" onClick={() => setBulkOpen(true)} className="h-10 px-3" title="Bulk upload"><Upload className="w-4 h-4" /></Button>
      </div>
      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6 border border-dashed rounded-xl">No {label.toLowerCase()}s added yet</p>
        ) : items.map(item => (
          <div key={item.id} className="flex items-center justify-between px-4 py-2.5 rounded-xl border bg-muted/20 hover:bg-muted/40 transition-colors">
            <span className="text-sm font-medium">{item.value}</span>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-rose-500 hover:bg-rose-50 hover:text-rose-600" onClick={() => onDelete(item.id)}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        ))}
      </div>
      <BulkUploadDialog open={bulkOpen} onClose={() => setBulkOpen(false)} type={type} onBulkAdd={onBulkAdd} />
    </div>
  );
}

export default function Settings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: config = [] } = useQuery<ConfigItem[]>({ queryKey: ["/api/config"], queryFn: fetchConfig });
  const branches = config.filter(c => c.type === "branch");
  const states   = config.filter(c => c.type === "state");

  const addMutation = useMutation({
    mutationFn: addConfig,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/config"] }); toast({ title: "Added successfully" }); },
    onError: () => toast({ title: "Failed to add", variant: "destructive" }),
  });
  const bulkMutation = useMutation({
    mutationFn: bulkAddConfig,
    onSuccess: (data) => { queryClient.invalidateQueries({ queryKey: ["/api/config"] }); toast({ title: "Bulk add complete", description: `Added ${data.inserted}, skipped ${data.skipped} duplicates` }); },
    onError: () => toast({ title: "Bulk add failed", variant: "destructive" }),
  });
  const deleteMutation = useMutation({
    mutationFn: deleteConfig,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/config"] }); toast({ title: "Removed" }); },
    onError: () => toast({ title: "Failed to remove", variant: "destructive" }),
  });

  return (
    <AppLayout title="Configuration">
      <div className="max-w-3xl mx-auto space-y-6 mt-4">
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-primary" />
              Branch / State Configuration
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Manage the dropdown options used across the application. Use the{" "}
              <Upload className="inline w-3.5 h-3.5 mb-0.5" /> button to bulk add multiple values at once.
            </p>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="branch">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="branch" className="gap-1.5"><Building2 className="w-4 h-4" /> Branches</TabsTrigger>
                <TabsTrigger value="state" className="gap-1.5"><MapPin className="w-4 h-4" /> States</TabsTrigger>
              </TabsList>
              <TabsContent value="branch">
                <ConfigSection label="Branch" icon={Building2} type="branch" items={branches}
                  onAdd={v => addMutation.mutate({ type: "branch", value: v })}
                  onBulkAdd={vs => bulkMutation.mutate({ type: "branch", values: vs })}
                  onDelete={id => deleteMutation.mutate(id)} isAdding={addMutation.isPending} />
              </TabsContent>
              <TabsContent value="state">
                <ConfigSection label="State" icon={MapPin} type="state" items={states}
                  onAdd={v => addMutation.mutate({ type: "state", value: v })}
                  onBulkAdd={vs => bulkMutation.mutate({ type: "state", values: vs })}
                  onDelete={id => deleteMutation.mutate(id)} isAdding={addMutation.isPending} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
