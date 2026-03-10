import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, QrCode, CalendarCheck } from "lucide-react";

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ orgs: 0, attendance: 0 });

  useEffect(() => {
    if (!user) return;
    const fetchStats = async () => {
      const { count: orgCount } = await supabase
        .from("organizations")
        .select("*", { count: "exact", head: true })
        .eq("admin_id", user.id);
      
      const { data: orgs } = await supabase
        .from("organizations")
        .select("id")
        .eq("admin_id", user.id);
      
      let attendanceCount = 0;
      if (orgs && orgs.length > 0) {
        const { count } = await supabase
          .from("attendance")
          .select("*", { count: "exact", head: true })
          .in("org_id", orgs.map(o => o.id));
        attendanceCount = count || 0;
      }

      setStats({ orgs: orgCount || 0, attendance: attendanceCount });
    };
    fetchStats();
  }, [user]);

  const cards = [
    { title: "Organizations", value: stats.orgs, icon: Building2, color: "text-primary" },
    { title: "Total Attendance", value: stats.attendance, icon: CalendarCheck, color: "text-primary" },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage your organizations and attendance</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {cards.map((card) => (
            <Card key={card.title} className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-heading font-bold text-foreground">{card.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
