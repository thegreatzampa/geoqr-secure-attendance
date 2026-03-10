import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarCheck, Clock, MapPin } from "lucide-react";
import { format } from "date-fns";

export default function UserDashboard() {
  const { user } = useAuth();
  const [todayAttendance, setTodayAttendance] = useState<any>(null);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    const today = new Date().toISOString().split("T")[0];
    
    supabase.from("attendance").select("*").eq("user_id", user.id).eq("attendance_date", today)
      .maybeSingle()
      .then(({ data }) => setTodayAttendance(data));

    supabase.from("attendance").select("*", { count: "exact", head: true }).eq("user_id", user.id)
      .then(({ count }) => setTotalCount(count || 0));
  }, [user]);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Your attendance overview</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Today's Status</CardTitle>
              <CalendarCheck className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              {todayAttendance ? (
                <div className="space-y-1">
                  <p className="text-2xl font-heading font-bold text-primary">Present ✓</p>
                  <p className="text-sm text-muted-foreground">
                    Checked in at {format(new Date(todayAttendance.recorded_at), "HH:mm")}
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-2xl font-heading font-bold text-muted-foreground">Not yet</p>
                  <p className="text-sm text-muted-foreground">Scan a QR code to check in</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Attendance</CardTitle>
              <Clock className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-heading font-bold text-foreground">{totalCount}</p>
              <p className="text-sm text-muted-foreground">Days recorded</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
