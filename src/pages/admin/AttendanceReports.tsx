import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users, CalendarCheck, Download, Search } from "lucide-react";
import { format, parseISO, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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
  const [searchParams] = useSearchParams();
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<string>("");
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  
  // Date Filters
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  useEffect(() => {
    if (!user) return;
    supabase.from("organizations").select("id, name").eq("admin_id", user.id)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setOrgs(data);
          setSelectedOrg(data[0].id); // Auto-select first org
        }
      });
  }, [user]);

  useEffect(() => {
    // Handle URL parameters for preset date filters
    const dateQuery = searchParams.get("date");
    if (dateQuery === "today") {
      const today = format(new Date(), "yyyy-MM-dd");
      setStartDate(today);
      setEndDate(today);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!selectedOrg) return;
    
    // Fetch all for the org, we'll apply date filters client-side for simplicity,
    // or we could add them to the query. For this example, let's fetch top 500 and filter client side.
    const fetchRecords = async () => {
      // Trying to fetch user profile names if available (assuming generic profiles table might exist or just show ID)
      const { data } = await supabase.from("attendance")
        .select("*, profiles!fk_attendance_profiles(full_name, email)")
        .eq("org_id", selectedOrg)
        .order("recorded_at", { ascending: false })
        .limit(500);

      // If profiles join fails because of schema, supabase just returns null for it
      if (data) setRecords(data);
    };
    
    fetchRecords();
  }, [selectedOrg]);

  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      // Use the strict YYYY-MM-DD format extracted from the timezone-locked database values
      const recordDate = r.attendance_date;
      let isValid = true;
      if (startDate) {
        isValid = isValid && recordDate >= startDate;
      }
      if (endDate) {
        isValid = isValid && recordDate <= endDate;
      }
      return isValid;
    });
  }, [records, startDate, endDate]);

  const downloadPDF = () => {
    if (filteredRecords.length === 0) return;
    const orgName = orgs.find(o => o.id === selectedOrg)?.name || "Organization";
    
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(`Attendance Report - ${orgName}`, 14, 22);
    
    doc.setFontSize(11);
    doc.text(`Generated on: ${format(new Date(), "PPpp")}`, 14, 30);
    
    if (startDate && endDate) {
      doc.text(`Date Range: ${startDate} to ${endDate}`, 14, 36);
    }

    const tableColumn = ["Date", "Time", "Student Name", "Status"];
    const tableRows: any[] = [];

    filteredRecords.forEach(r => {
      const date = format(parseISO(r.recorded_at), "MMM dd, yyyy");
      const time = format(parseISO(r.recorded_at), "HH:mm:ss");
      const profile = (r as any).profiles;
      const userStr = (profile?.full_name?.trim() ? profile.full_name : profile?.email) || r.user_id.slice(0, 8);
      
      tableRows.push([date, time, userStr, r.status]);
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 45,
      theme: 'grid',
      styles: { fontSize: 9 },
      headStyles: { fillColor: [63, 81, 181] }
    });

    doc.save(`${orgName}_Attendance_${format(new Date(), 'yyyyMMdd')}.pdf`);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">Attendance Reports</h1>
          <p className="text-muted-foreground">View attendance records for your organizations</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="glass-card md:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Organization</CardTitle>
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

          <Card className="glass-card md:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex justify-between items-center">
                Date Range Filter
                {startDate || endDate ? (
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => { setStartDate(""); setEndDate(""); }}>
                    Clear
                  </Button>
                ) : null}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <div className="grid flex-1 gap-1.5">
                  <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="text-xs sm:text-sm" />
                </div>
                <span className="text-muted-foreground text-xs">to</span>
                <div className="grid flex-1 gap-1.5">
                  <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="text-xs sm:text-sm" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {selectedOrg && filteredRecords.length > 0 ? (
          <Card className="glass-card overflow-hidden">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <CardTitle className="flex items-center gap-2 text-lg font-heading">
                <CalendarCheck className="h-5 w-5 text-primary" />
                {filteredRecords.length} Records Found
              </CardTitle>
              <Button onClick={downloadPDF} className="gap-2 shrink-0">
                <Download className="h-4 w-4" /> Download PDF
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Student Name</TableHead>
                      <TableHead className="hidden md:table-cell">GPS Map</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRecords.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{format(new Date(r.recorded_at), "MMM dd, yyyy")}</TableCell>
                        <TableCell>{format(new Date(r.recorded_at), "HH:mm:ss")}</TableCell>
                        <TableCell className="font-medium text-sm">
                          {((r as any).profiles?.full_name?.trim() ? (r as any).profiles.full_name : (r as any).profiles?.email) || r.user_id.slice(0, 8) + "..."}
                        </TableCell>
                        <TableCell className="text-xs hidden md:table-cell">
                          <a 
                            href={`https://www.google.com/maps/search/?api=1&query=${r.latitude},${r.longitude}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary hover:underline flex items-center gap-1"
                          >
                            <Search className="h-3 w-3" /> View Map
                          </a>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="bg-primary/20 text-primary border-none">{r.status}</Badge>
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
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground whitespace-pre-wrap text-center">
                {records.length > 0 ? "No records match the selected date filter." : "No attendance records available for this organization."}
              </p>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </AppLayout>
  );
}
