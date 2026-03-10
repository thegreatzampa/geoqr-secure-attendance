import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, MapPin, Wifi, Ruler, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Org {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  allowed_radius_meters: number;
  allowed_ip: string | null;
}

export default function Organizations() {
  const { user } = useAuth();
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [open, setOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Org | null>(null);
  const [form, setForm] = useState({ name: "", latitude: "", longitude: "", radius: "100", ip: "" });

  const fetchOrgs = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("organizations")
      .select("*")
      .eq("admin_id", user.id)
      .order("created_at", { ascending: false });
    if (data) setOrgs(data);
  };

  useEffect(() => { fetchOrgs(); }, [user]);

  const resetForm = () => {
    setForm({ name: "", latitude: "", longitude: "", radius: "100", ip: "" });
    setEditingOrg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const payload = {
      name: form.name.trim(),
      latitude: parseFloat(form.latitude),
      longitude: parseFloat(form.longitude),
      allowed_radius_meters: parseInt(form.radius),
      allowed_ip: form.ip.trim() || null,
      admin_id: user.id,
    };

    if (isNaN(payload.latitude) || isNaN(payload.longitude)) {
      toast.error("Invalid coordinates");
      return;
    }

    let error;
    if (editingOrg) {
      ({ error } = await supabase.from("organizations").update(payload).eq("id", editingOrg.id));
    } else {
      ({ error } = await supabase.from("organizations").insert(payload));
    }

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(editingOrg ? "Organization updated" : "Organization created");
      setOpen(false);
      resetForm();
      fetchOrgs();
    }
  };

  const handleEdit = (org: Org) => {
    setEditingOrg(org);
    setForm({
      name: org.name,
      latitude: org.latitude.toString(),
      longitude: org.longitude.toString(),
      radius: org.allowed_radius_meters.toString(),
      ip: org.allowed_ip || "",
    });
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("organizations").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Organization deleted");
      fetchOrgs();
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-heading font-bold text-foreground">Organizations</h1>
            <p className="text-muted-foreground">Configure attendance locations</p>
          </div>
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" /> Add Organization</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingOrg ? "Edit" : "Create"} Organization</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="Office HQ" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Latitude</Label>
                    <Input type="number" step="any" value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} required placeholder="37.7749" />
                  </div>
                  <div className="space-y-2">
                    <Label>Longitude</Label>
                    <Input type="number" step="any" value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} required placeholder="-122.4194" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Allowed Radius (meters)</Label>
                  <Input type="number" value={form.radius} onChange={(e) => setForm({ ...form, radius: e.target.value })} required min="10" />
                </div>
                <div className="space-y-2">
                  <Label>Allowed WiFi IP (optional)</Label>
                  <Input value={form.ip} onChange={(e) => setForm({ ...form, ip: e.target.value })} placeholder="203.0.113.1" />
                </div>
                <Button type="submit" className="w-full">{editingOrg ? "Update" : "Create"}</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {orgs.length === 0 ? (
          <Card className="glass-card">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No organizations yet. Create one to get started.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {orgs.map((org) => (
              <Card key={org.id} className="glass-card">
                <CardHeader className="flex flex-row items-start justify-between pb-2">
                  <CardTitle className="text-lg font-heading">{org.name}</CardTitle>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(org)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(org.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1"><MapPin className="h-4 w-4" /> {org.latitude.toFixed(4)}, {org.longitude.toFixed(4)}</span>
                  <span className="flex items-center gap-1"><Ruler className="h-4 w-4" /> {org.allowed_radius_meters}m radius</span>
                  {org.allowed_ip && <span className="flex items-center gap-1"><Wifi className="h-4 w-4" /> {org.allowed_ip}</span>}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
