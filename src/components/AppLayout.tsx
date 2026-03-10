import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { QrCode, LayoutDashboard, Settings, History, LogOut, ScanLine, Users } from "lucide-react";
import { ModeToggle } from "@/components/mode-toggle";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, signOut } = useAuth();
  const location = useLocation();

  const navItems = isAdmin
    ? [
        { to: "/admin", icon: LayoutDashboard, label: "Dashboard" },
        { to: "/admin/organizations", icon: Settings, label: "Organizations" },
        { to: "/admin/qr", icon: QrCode, label: "QR Generator" },
        { to: "/admin/reports", icon: Users, label: "Reports" },
      ]
    : [
        { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
        { to: "/scan", icon: ScanLine, label: "Scan QR" },
        { to: "/history", icon: History, label: "History" },
      ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/80 backdrop-blur-lg sticky top-0 z-50">
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
            <ModeToggle />
            <span className="text-sm text-muted-foreground hidden sm:block">{user?.email}</span>
            <Button variant="ghost" size="icon" onClick={signOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-lg">
        <div className="flex justify-around py-2">
          {navItems.map((item) => (
            <Link key={item.to} to={item.to} className="flex flex-col items-center gap-1 px-3 py-1">
              <item.icon className={`h-5 w-5 ${location.pathname === item.to ? "text-primary" : "text-muted-foreground"}`} />
              <span className={`text-xs ${location.pathname === item.to ? "text-primary font-medium" : "text-muted-foreground"}`}>
                {item.label}
              </span>
            </Link>
          ))}
        </div>
      </nav>

      <main className="container mx-auto px-4 py-6 pb-24 md:pb-6">{children}</main>
    </div>
  );
}
