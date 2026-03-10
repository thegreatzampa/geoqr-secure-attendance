import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { History, CalendarCheck } from "lucide-react";
import { format } from "date-fns";

export default function AttendanceHistory() {
  const { user } = useAuth();
  const [records, setRecords] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from("attendance").select("*, organizations(name)")
      .eq("user_id", user.id)
      .order("recorded_at", { ascending: false })
      .limit(50)
      .then(({ data }) => { if (data) setRecords(data); });
  }, [user]);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">Attendance History</h1>
          <p className="text-muted-foreground">Your attendance records</p>
        </div>

        {records.length > 0 ? (
          <Card className="glass-card overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-heading">
                <CalendarCheck className="h-5 w-5 text-primary" />
                {records.length} Records
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Organization</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>{format(new Date(r.recorded_at), "MMM dd, yyyy")}</TableCell>
                        <TableCell>{format(new Date(r.recorded_at), "HH:mm")}</TableCell>
                        <TableCell>{(r.organizations as any)?.name || "Unknown"}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="bg-accent text-accent-foreground">{r.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="glass-card">
            <CardContent className="flex flex-col items-center py-12">
              <History className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No attendance records yet</p>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
