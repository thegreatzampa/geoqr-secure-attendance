import { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { QrCode, CalendarCheck, Clock, MapPin, Printer, RefreshCw } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import jsPDF from "jspdf";

interface Org {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  allowed_radius_meters: number;
}

interface ActiveToken {
  token: string;
  org_id: string;
  expires_at: string;
  organizations?: { name: string };
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [activeToken, setActiveToken] = useState<ActiveToken | null>(null);
  const [loading, setLoading] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  // Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [radius, setRadius] = useState("50");

  useEffect(() => {
    if (!user) return;
    
    const fetchData = async () => {
      // Fetch Orgs
      const { data: orgData } = await supabase
        .from("organizations")
        .select("*")
        .eq("admin_id", user.id);
      
      if (orgData) {
        setOrgs(orgData);
        if (orgData.length > 0) {
          setSelectedOrg(orgData[0].id);
          setLat(orgData[0].latitude.toString());
          setLng(orgData[0].longitude.toString());
          setRadius(orgData[0].allowed_radius_meters.toString());
        }
      }

      // Fetch Active Token (most recent valid one)
      const { data: tokenData } = await supabase
        .from("qr_tokens")
        .select("*, organizations(name)")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (tokenData) {
        setActiveToken(tokenData as unknown as ActiveToken);
      }
    };

    fetchData();
  }, [user]);

  // Handle Org Change in Dialog
  useEffect(() => {
    const org = orgs.find(o => o.id === selectedOrg);
    if (org) {
      setLat(org.latitude.toString());
      setLng(org.longitude.toString());
      setRadius(org.allowed_radius_meters.toString());
    }
  }, [selectedOrg, orgs]);

  const generateNewQR = async (orgId: string, latitude: number, longitude: number, rad: number) => {
    setLoading(true);
    
    // Update Org Settings first
    await supabase.from("organizations").update({
      latitude,
      longitude,
      allowed_radius_meters: rad
    }).eq("id", orgId);

    // Generate new token (24 hour expiry)
    const token = crypto.randomUUID() + "-" + Date.now();
    const expiresAt = new Date(Date.now() + 86400000).toISOString();

    const { error } = await supabase.from("qr_tokens").insert({
      org_id: orgId,
      token,
      expires_at: expiresAt,
    });

    if (error) {
      toast.error("Failed to generate QR: " + error.message);
    } else {
      toast.success("New QR Code generated successfully!");
      setIsDialogOpen(false);
      
      const orgName = orgs.find(o => o.id === orgId)?.name || "";
      setActiveToken({ token, org_id: orgId, expires_at: expiresAt, organizations: { name: orgName } });
    }
    setLoading(false);
  };

  const handleManualGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrg || !lat || !lng || !radius) return;
    generateNewQR(selectedOrg, parseFloat(lat), parseFloat(lng), parseInt(radius));
  };

  const updateCurrentQR = () => {
    if (!activeToken) return;
    const org = orgs.find(o => o.id === activeToken.org_id);
    if (!org) return;
    generateNewQR(org.id, org.latitude, org.longitude, org.allowed_radius_meters);
  };

  const printQR = () => {
    if (!activeToken || !qrRef.current) return;
    
    const svg = qrRef.current.querySelector('svg');
    if (!svg) return;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    
    const svgData = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const DOMURL = window.URL || window.webkitURL || window;
    const url = DOMURL.createObjectURL(svgBlob);

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngUrl = canvas.toDataURL("image/png");
      
      const doc = new jsPDF();
      doc.setFontSize(22);
      doc.text("Attendance QR Code", 105, 20, { align: "center" });
      doc.setFontSize(14);
      doc.text(`Organization: ${activeToken.organizations?.name || "Unknown"}`, 105, 30, { align: "center" });
      
      doc.addImage(pngUrl, "PNG", 55, 40, 100, 100);
      
      doc.setFontSize(10);
      doc.text("Please scan this QR code using the application to mark your attendance.", 105, 150, { align: "center" });
      
      doc.save(`GeoQR_${activeToken.organizations?.name || "Attendance"}.pdf`);
      DOMURL.revokeObjectURL(url);
      toast.success("PDF Downloaded!");
    };
    img.src = url;
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage your classes and attendance</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: Actions */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-xl font-heading font-semibold mb-4">Quick Actions</h2>
            
            {/* Generate QR Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Card className="glass-card hover:bg-card/60 transition-colors cursor-pointer border-primary/20 hover:border-primary/50">
                  <CardContent className="flex items-center gap-4 p-6">
                    <div className="p-4 rounded-full bg-primary/20 shrink-0">
                      <QrCode className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-heading font-bold">Generate a QR</h3>
                      <p className="text-sm text-muted-foreground">Set location bounds and create a new daily QR code</p>
                    </div>
                  </CardContent>
                </Card>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleManualGenerate}>
                  <DialogHeader>
                    <DialogTitle>Generate Attendance QR</DialogTitle>
                    <DialogDescription>
                      Students must be within the specified radius to mark attendance.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                      <Label>Organization (Class)</Label>
                      <Select value={selectedOrg} onValueChange={setSelectedOrg}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Organization" />
                        </SelectTrigger>
                        <SelectContent>
                          {orgs.map((org) => (
                            <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Latitude</Label>
                        <Input value={lat} onChange={(e) => setLat(e.target.value)} required type="number" step="any" />
                      </div>
                      <div className="space-y-2">
                        <Label>Longitude</Label>
                        <Input value={lng} onChange={(e) => setLng(e.target.value)} required type="number" step="any" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Radius (meters)</Label>
                      <Input value={radius} onChange={(e) => setRadius(e.target.value)} required type="number" min="10" />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={loading}>
                      {loading ? "Generating..." : "Generate QR"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            {/* Show Past Attendance */}
            <Card 
              className="glass-card hover:bg-card/60 transition-colors cursor-pointer"
              onClick={() => navigate("/admin/reports")}
            >
              <CardContent className="flex items-center gap-4 p-6">
                <div className="p-4 rounded-full bg-accent shrink-0">
                  <CalendarCheck className="h-8 w-8 text-accent-foreground" />
                </div>
                <div>
                  <h3 className="text-lg font-heading font-bold">Show Past Attendance</h3>
                  <p className="text-sm text-muted-foreground">View and export historical attendance records</p>
                </div>
              </CardContent>
            </Card>

            {/* Show Today's Attendance */}
            <Card 
              className="glass-card hover:bg-card/60 transition-colors cursor-pointer"
              onClick={() => navigate("/admin/reports?date=today")}
            >
              <CardContent className="flex items-center gap-4 p-6">
                <div className="p-4 rounded-full bg-accent shrink-0">
                  <Clock className="h-8 w-8 text-accent-foreground" />
                </div>
                <div>
                  <h3 className="text-lg font-heading font-bold">Show Today's Attendance</h3>
                  <p className="text-sm text-muted-foreground">Real-time view of students present today</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Active QR */}
          <div className="lg:col-span-1">
            <Card className="glass-card h-full flex flex-col">
              <CardHeader>
                <CardTitle className="text-lg font-heading flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  Currently Active QR
                </CardTitle>
                <CardDescription>
                  {activeToken ? `For ${activeToken.organizations?.name}` : "No active QR found"}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col items-center justify-center py-6">
                {activeToken ? (
                  <div className="space-y-6 w-full flex flex-col items-center">
                    <div className="p-4 bg-white rounded-xl shadow-lg" ref={qrRef}>
                      <QRCodeSVG
                        value={JSON.stringify({ token: activeToken.token, org_id: activeToken.org_id })}
                        size={200}
                        bgColor="#ffffff"
                        fgColor="#000000"
                        level="H"
                        includeMargin={false}
                      />
                    </div>
                    <div className="w-full space-y-3 pt-4">
                      <Button className="w-full gap-2" variant="outline" onClick={printQR}>
                        <Printer className="h-4 w-4" /> Print QR (PDF)
                      </Button>
                      <Button className="w-full gap-2" onClick={updateCurrentQR} disabled={loading}>
                        <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Update QR
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center space-y-4">
                    <QrCode className="h-16 w-16 text-muted-foreground mx-auto opacity-50" />
                    <p className="text-sm text-muted-foreground">Generate a new QR code to display it here.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

        </div>
      </div>
    </AppLayout>
  );
}
