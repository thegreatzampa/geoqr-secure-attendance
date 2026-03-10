import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarCheck, MapPin, ScanLine, X, Loader2, CheckCircle2, XCircle, Camera } from "lucide-react";
import { format } from "date-fns";
import { Html5Qrcode } from "html5-qrcode";
import { getCurrentPosition, calculateDistance } from "@/lib/geo";
import { toast } from "sonner";
import { useRef } from "react";

type ScanState = "idle" | "scanning" | "verifying" | "success" | "error";

export default function UserDashboard() {
  const { user } = useAuth();
  const [history, setHistory] = useState<any[]>([]);
  
  // Scanner state
  const [state, setState] = useState<ScanState>("idle");
  const [message, setMessage] = useState("");
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchHistory = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("attendance")
      .select("*, organizations(name)")
      .eq("user_id", user.id)
      .order("recorded_at", { ascending: false })
      .limit(30);
    if (data) setHistory(data);
  };

  useEffect(() => {
    fetchHistory();
  }, [user]);

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch {}
      scannerRef.current = null;
    }
  };

  const startScanner = async () => {
    setState("scanning");
    setMessage("");
    await stopScanner();

    setTimeout(async () => {
      const scanner = new Html5Qrcode("qr-reader-dashboard");
      scannerRef.current = scanner;

      try {
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          async (decodedText) => {
            await stopScanner();
            await handleScan(decodedText);
          },
          () => {}
        );
      } catch (err: any) {
        setState("error");
        setMessage("Camera access denied. Please allow camera permissions.");
      }
    }, 100);
  };

  const handleScan = async (data: string) => {
    if (!user) return;
    setState("verifying");
    setMessage("Verifying location and network...");

    try {
      // Parse QR data
      let qrPayload: { token: string; org_id: string };
      try {
        qrPayload = JSON.parse(data);
      } catch {
        throw new Error("Invalid QR code format");
      }

      // Validate token
      const { data: tokenData, error: tokenError } = await supabase
        .from("qr_tokens")
        .select("*")
        .eq("token", qrPayload.token)
        .eq("org_id", qrPayload.org_id)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();

      if (tokenError || !tokenData) {
        throw new Error("QR code expired or invalid. Please scan the latest code.");
      }

      // Get organization settings
      const { data: org } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", qrPayload.org_id)
        .single();

      if (!org) throw new Error("Organization not found");

      // Get GPS location
      let position: GeolocationPosition;
      try {
        position = await getCurrentPosition();
      } catch {
        throw new Error("Unable to get your location. Please enable GPS.");
      }

      const userLat = position.coords.latitude;
      const userLng = position.coords.longitude;

      // Check distance
      const distance = calculateDistance(org.latitude, org.longitude, userLat, userLng);
      if (distance > org.allowed_radius_meters) {
        throw new Error(`You are ${Math.round(distance)}m away. Must be within ${org.allowed_radius_meters}m of the location.`);
      }

      // Get public IP for WiFi verification
      let userIp = "";
      try {
        const ipRes = await fetch("https://api.ipify.org?format=json");
        const ipData = await ipRes.json();
        userIp = ipData.ip;
      } catch {
        userIp = "unknown";
      }

      // Check IP if org has one configured
      if (org.allowed_ip && userIp !== org.allowed_ip) {
        throw new Error(`WiFi verification failed. Expected network IP: ${org.allowed_ip}, your IP: ${userIp}`);
      }

      // Check duplicate attendance using local date
      const today = format(new Date(), "yyyy-MM-dd");
      const { data: existing } = await supabase
        .from("attendance")
        .select("id")
        .eq("user_id", user.id)
        .eq("org_id", org.id)
        .eq("attendance_date", today)
        .maybeSingle();

      if (existing) {
        throw new Error("Attendance already recorded for today.");
      }

      // Record attendance
      const { error: insertError } = await supabase.from("attendance").insert({
        user_id: user.id,
        org_id: org.id,
        latitude: userLat,
        longitude: userLng,
        ip_address: userIp,
        attendance_date: today,
      });

      if (insertError) {
        if (insertError.message.includes("duplicate") || insertError.message.includes("unique")) {
          throw new Error("Attendance already recorded for today.");
        }
        throw new Error(insertError.message);
      }

      setState("success");
      setMessage("Attendance recorded successfully!");
      toast.success("Attendance marked!");
      fetchHistory(); // Refresh history list
    } catch (err: any) {
      setState("error");
      setMessage(err.message || "An error occurred");
      toast.error(err.message);
    }
  };

  useEffect(() => {
    return () => { stopScanner(); };
  }, []);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">Student Portal</h1>
          <p className="text-muted-foreground">Your recent attendance records</p>
        </div>

        <Card className="glass-card mb-24">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarCheck className="h-5 w-5 text-primary" />
              Recent History
            </CardTitle>
            <CardDescription>Your last 30 attendance records</CardDescription>
          </CardHeader>
          <CardContent>
            {history.length > 0 ? (
              <div className="space-y-4">
                {history.map((record) => (
                  <div key={record.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-card border border-border/50 gap-4">
                    <div>
                      <h4 className="font-heading font-semibold text-foreground">
                        {record.organizations?.name || "Unknown Organization"}
                      </h4>
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                        <MapPin className="h-3 w-3" />
                        {record.latitude.toFixed(4)}, {record.longitude.toFixed(4)}
                      </p>
                    </div>
                    <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between gap-2">
                      <Badge variant="secondary" className="bg-primary/20 text-primary hover:bg-primary/30">
                        {record.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(record.recorded_at), "MMM d, yyyy 'at' h:mm a")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <CalendarCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">No attendance records found.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Floating Scan Button */}
        <div className="fixed bottom-20 left-0 right-0 flex justify-center z-40 pointer-events-none md:bottom-10">
          <Button 
            onClick={startScanner}
            className="rounded-full h-20 w-20 shadow-2xl pulse-glow pointer-events-auto flex items-center justify-center bg-primary hover:bg-primary/90 hover:scale-105 transition-all duration-300"
          >
            <ScanLine className="h-10 w-10 text-primary-foreground" />
          </Button>
        </div>

        {/* Scanner Overlay Modal */}
        {state !== "idle" && (
          <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200">
            <Card className="w-full max-w-md glass-card overflow-hidden shadow-2xl border-primary/20 relative">
              <Button 
                variant="ghost" 
                size="icon" 
                className="absolute right-2 top-2 z-10 rounded-full hover:bg-destructive/20 hover:text-destructive"
                onClick={() => { stopScanner(); setState("idle"); }}
              >
                <X className="h-5 w-5" />
              </Button>
              <CardContent className="p-0">
                {state === "scanning" && (
                  <div className="space-y-4 pt-12">
                    <div className="px-6 text-center">
                      <h3 className="font-heading font-bold text-xl mb-1">Scan Code</h3>
                      <p className="text-sm text-muted-foreground">Point your camera at the attendance QR code</p>
                    </div>
                    <div id="qr-reader-dashboard" className="w-full bg-black/5" ref={containerRef} />
                  </div>
                )}

                {state === "verifying" && (
                  <div className="flex flex-col items-center py-20 px-6 space-y-6">
                    <Loader2 className="h-16 w-16 text-primary animate-spin" />
                    <div className="text-center space-y-2">
                      <h3 className="font-heading font-bold text-xl">Verifying...</h3>
                      <p className="text-sm text-muted-foreground">{message}</p>
                    </div>
                  </div>
                )}

                {state === "success" && (
                  <div className="flex flex-col items-center py-16 px-6 space-y-6">
                    <div className="p-6 rounded-full bg-primary/20">
                      <CheckCircle2 className="h-16 w-16 text-primary" />
                    </div>
                    <div className="text-center space-y-2">
                      <h3 className="font-heading font-bold text-2xl text-foreground">Success!</h3>
                      <p className="text-muted-foreground">{message}</p>
                    </div>
                    <Button className="w-full mt-4" onClick={() => setState("idle")}>Close</Button>
                  </div>
                )}

                {state === "error" && (
                  <div className="flex flex-col items-center py-16 px-6 space-y-6">
                    <div className="p-6 rounded-full bg-destructive/10">
                      <XCircle className="h-16 w-16 text-destructive" />
                    </div>
                    <div className="text-center space-y-2">
                      <h3 className="font-heading font-bold text-2xl text-destructive">Failed</h3>
                      <p className="text-sm text-muted-foreground">{message}</p>
                    </div>
                    <div className="flex w-full gap-3 mt-4 px-4">
                      <Button variant="outline" className="flex-1" onClick={() => setState("idle")}>Cancel</Button>
                      <Button className="flex-1 gap-2" onClick={startScanner}>
                        <ScanLine className="h-4 w-4" /> Try Again
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
