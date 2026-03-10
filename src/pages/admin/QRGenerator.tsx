import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { QRCodeSVG } from "qrcode.react";
import { QrCode, RefreshCw, Timer } from "lucide-react";

interface Org {
  id: string;
  name: string;
}

export default function QRGenerator() {
  const { user } = useAuth();
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<string>("");
  const [qrData, setQrData] = useState<string>("");
  const [countdown, setCountdown] = useState(30);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("organizations")
      .select("id, name")
      .eq("admin_id", user.id)
      .then(({ data }) => {
        if (data) setOrgs(data);
      });
  }, [user]);

  const generateToken = useCallback(async () => {
    if (!selectedOrg) return;
    setGenerating(true);
    
    const token = crypto.randomUUID() + "-" + Date.now();
    const expiresAt = new Date(Date.now() + 30000).toISOString();

    const { error } = await supabase.from("qr_tokens").insert({
      org_id: selectedOrg,
      token,
      expires_at: expiresAt,
    });

    if (!error) {
      setQrData(JSON.stringify({ token, org_id: selectedOrg }));
      setCountdown(30);
    }
    setGenerating(false);
  }, [selectedOrg]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!selectedOrg) return;
    generateToken();
    const interval = setInterval(generateToken, 30000);
    return () => clearInterval(interval);
  }, [selectedOrg, generateToken]);

  // Countdown timer
  useEffect(() => {
    if (!qrData) return;
    const timer = setInterval(() => {
      setCountdown((prev) => (prev <= 1 ? 30 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [qrData]);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">QR Code Generator</h1>
          <p className="text-muted-foreground">Generate dynamic QR codes that refresh every 30 seconds</p>
        </div>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg font-heading">Select Organization</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedOrg} onValueChange={setSelectedOrg}>
              <SelectTrigger>
                <SelectValue placeholder="Choose an organization" />
              </SelectTrigger>
              <SelectContent>
                {orgs.map((org) => (
                  <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {qrData && (
          <Card className="glass-card">
            <CardContent className="flex flex-col items-center py-8 space-y-6">
              <div className="relative p-6 bg-card rounded-2xl shadow-lg pulse-glow">
                <QRCodeSVG
                  value={qrData}
                  size={280}
                  bgColor="transparent"
                  fgColor="hsl(220, 20%, 10%)"
                  level="H"
                  includeMargin
                />
              </div>

              <div className="flex items-center gap-4 text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Timer className="h-4 w-4 text-primary" />
                  <span className="font-heading font-bold text-2xl text-foreground">{countdown}s</span>
                </div>
                <div className="flex items-center gap-2">
                  <RefreshCw className={`h-4 w-4 ${generating ? "animate-spin" : ""} text-primary`} />
                  <span className="text-sm">Auto-refresh</span>
                </div>
              </div>

              <p className="text-sm text-muted-foreground text-center max-w-xs">
                Display this QR code for users to scan. It refreshes automatically to prevent screenshot sharing.
              </p>
            </CardContent>
          </Card>
        )}

        {!selectedOrg && (
          <Card className="glass-card">
            <CardContent className="flex flex-col items-center py-12">
              <QrCode className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Select an organization to generate QR codes</p>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
