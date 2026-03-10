import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getCurrentPosition, calculateDistance } from "@/lib/geo";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScanLine, CheckCircle2, XCircle, Loader2, Camera } from "lucide-react";
import { toast } from "sonner";

type ScanState = "idle" | "scanning" | "verifying" | "success" | "error";

export default function ScanQR() {
  const { user } = useAuth();
  const [state, setState] = useState<ScanState>("idle");
  const [message, setMessage] = useState("");
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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

    const scanner = new Html5Qrcode("qr-reader");
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

      // Check duplicate attendance
      const today = new Date().toISOString().split("T")[0];
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
      <div className="space-y-6 max-w-md mx-auto">
        <div className="text-center">
          <h1 className="text-3xl font-heading font-bold text-foreground">Scan QR Code</h1>
          <p className="text-muted-foreground">Point your camera at the attendance QR code</p>
        </div>

        <Card className="glass-card overflow-hidden">
          <CardContent className="p-0">
            {state === "idle" && (
              <div className="flex flex-col items-center py-16 px-6 space-y-4">
                <div className="p-6 rounded-full bg-accent">
                  <Camera className="h-12 w-12 text-primary" />
                </div>
                <p className="text-muted-foreground text-center">Tap below to start scanning</p>
                <Button onClick={startScanner} className="gap-2">
                  <ScanLine className="h-4 w-4" /> Start Scanner
                </Button>
              </div>
            )}

            {state === "scanning" && (
              <div className="space-y-4">
                <div id="qr-reader" className="w-full" ref={containerRef} />
                <div className="px-6 pb-6 text-center">
                  <Button variant="outline" onClick={() => { stopScanner(); setState("idle"); }}>Cancel</Button>
                </div>
              </div>
            )}

            {state === "verifying" && (
              <div className="flex flex-col items-center py-16 px-6 space-y-4">
                <Loader2 className="h-12 w-12 text-primary animate-spin" />
                <p className="text-muted-foreground">{message}</p>
              </div>
            )}

            {state === "success" && (
              <div className="flex flex-col items-center py-16 px-6 space-y-4">
                <div className="p-4 rounded-full bg-accent">
                  <CheckCircle2 className="h-12 w-12 text-primary" />
                </div>
                <p className="text-lg font-heading font-bold text-foreground">{message}</p>
                <Button variant="outline" onClick={() => setState("idle")}>Done</Button>
              </div>
            )}

            {state === "error" && (
              <div className="flex flex-col items-center py-16 px-6 space-y-4">
                <div className="p-4 rounded-full bg-destructive/10">
                  <XCircle className="h-12 w-12 text-destructive" />
                </div>
                <p className="text-sm text-destructive text-center">{message}</p>
                <Button onClick={startScanner} className="gap-2">
                  <ScanLine className="h-4 w-4" /> Try Again
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
