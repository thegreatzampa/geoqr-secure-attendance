import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Users, CalendarCheck } from "lucide-react";
import { format } from "date-fns";

interface AttendanceRecord {
  id: string;
  user_id: string;
  latitude: number;
  longitude: number;
  ip_address: string | null;
  recorded_at: string;
  status: string;
  attendance_date: string;
}

interface Org {
  id: string;
  name: string;
}

export default function AttendanceReports() {
  const { user } = useAuth();
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<string>("");
  const [records, setRecords] = useState<AttendanceRecord[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from("organizations").select("id, name").eq("admin_id", user.id)
      .then(({ data }) => { if (data) setOrgs(data); });
  }, [user]);

  useEffect(() => {
    if (!selectedOrg) return;
    supabase.from("attendance").select("*").eq("org_id", selectedOrg)
      .order("recorded_at", { ascending: false })
      .limit(100)
      .then(({ data }) => { if (data) setRecords(data); });
  }, [selectedOrg]);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">Attendance Reports</h1>
          <p className="text-muted-foreground">View attendance records for your organizations</p>
        </div>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg font-heading">Filter by Organization</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedOrg} onValueChange={setSelectedOrg}>
              <SelectTrigger>
                <SelectValue placeholder="Choose organization" />
              </SelectTrigger>
              <SelectContent>
                {orgs.map((org) => (
                  <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {selectedOrg && records.length > 0 ? (
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
                      <TableHead>User ID</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>IP</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>{format(new Date(r.recorded_at), "MMM dd, yyyy")}</TableCell>
                        <TableCell>{format(new Date(r.recorded_at), "HH:mm:ss")}</TableCell>
                        <TableCell className="font-mono text-xs">{r.user_id.slice(0, 8)}...</TableCell>
                        <TableCell className="text-xs">{r.latitude.toFixed(4)}, {r.longitude.toFixed(4)}</TableCell>
                        <TableCell className="text-xs">{r.ip_address || "N/A"}</TableCell>
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
        ) : selectedOrg ? (
          <Card className="glass-card">
            <CardContent className="flex flex-col items-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No attendance records yet</p>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </AppLayout>
  );
}
