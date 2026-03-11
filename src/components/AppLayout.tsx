import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { QrCode, LayoutDashboard, Settings, History, LogOut, ScanLine, Users, UserPlus } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, signOut } = useAuth();
  const location = useLocation();

  // Settings state
  const [orgName, setOrgName] = useState("");
  const [orgId, setOrgId] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    if (isAdmin && user) {
      supabase.from("organizations").select("id, name").eq("admin_id", user.id).maybeSingle().then(({ data }) => {
        if (data) {
          setOrgId(data.id);
          setOrgName(data.name);
        }
      });
    }
  }, [isAdmin, user]);

  const saveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || (!orgId && !orgName)) return;
    setSavingSettings(true);
    
    if (orgId) {
      const { error } = await supabase.from("organizations").update({ name: orgName }).eq("id", orgId);
      if (error) toast.error("Failed to update organization name.");
      else toast.success("Settings saved!");
    } else {
      const { error } = await supabase.from("organizations").insert({ name: orgName, admin_id: user.id, latitude: 0, longitude: 0, allowed_radius_meters: 50 });
      if (error) toast.error("Failed to create organization.");
      else toast.success("Organization created!");
    }
    setSavingSettings(false);
  };

  const navItems = isAdmin
    ? [
        { to: "/admin", icon: LayoutDashboard, label: "Dashboard" },
        { to: "/admin/students", icon: UserPlus, label: "Add Student" },
        { to: "/admin/reports", icon: Users, label: "Reports" },
      ]
    : [];

  return (
    <div className="min-h-screen relative">
      <header className="border-b border-white/10 bg-[#0a0f1c]/40 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="gradient-primary text-primary-foreground p-2 rounded-lg">
              <QrCode className="h-5 w-5" />
            </div>
            <span className="font-heading font-bold text-lg text-foreground">GeoQR</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link key={item.to} to={item.to}>
                <Button
                  variant={location.pathname === item.to ? "default" : "ghost"}
                  size="sm"
                  className="gap-2"
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Button>
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {isAdmin && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon" title="Settings">
                    <Settings className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Admin Settings</DialogTitle>
                    <DialogDescription>Configure your organization details here.</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={saveSettings} className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="orgName">Name of Organisation</Label>
                      <Input id="orgName" value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="e.g. Computer Science 101" required />
                    </div>
                    <Button type="submit" disabled={savingSettings}>{savingSettings ? "Saving..." : "Save Changes"}</Button>
                  </form>
                </DialogContent>
              </Dialog>
            )}
            <span className="text-sm text-muted-foreground hidden sm:block">{user?.email}</span>
            <Button variant="ghost" size="icon" onClick={signOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

    {/* Mobile nav */}
      {(navItems.length > 0 || isAdmin) && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-[#0a0f1c]/40 backdrop-blur-xl">
          <div className="flex justify-center gap-8 py-2">
          {navItems.map((item) => (
            <Link key={item.to} to={item.to} className="flex flex-col items-center gap-1 px-3 py-1">
              <item.icon className={`h-5 w-5 ${location.pathname === item.to ? "text-primary" : "text-muted-foreground"}`} />
              <span className={`text-xs ${location.pathname === item.to ? "text-primary font-medium" : "text-muted-foreground"}`}>
                {item.label}
              </span>
            </Link>
          ))}
          {isAdmin && (
            <Dialog>
              <DialogTrigger asChild>
                <div className="flex flex-col items-center gap-1 px-3 py-1 cursor-pointer">
                  <Settings className="h-5 w-5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Settings</span>
                </div>
              </DialogTrigger>
              <DialogContent className="w-[90vw] rounded-xl sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Admin Settings</DialogTitle>
                    <DialogDescription>Configure your organization details here.</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={saveSettings} className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="orgNameMobile">Name of Organisation</Label>
                      <Input id="orgNameMobile" value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="e.g. Computer Science 101" required />
                    </div>
                    <Button type="submit" className="w-full" disabled={savingSettings}>{savingSettings ? "Saving..." : "Save Changes"}</Button>
                  </form>
                </DialogContent>
            </Dialog>
          )}
          </div>
        </nav>
      )}

      <main className="container mx-auto px-4 py-6 pb-24 md:pb-6">{children}</main>
    </div>
  );
}
