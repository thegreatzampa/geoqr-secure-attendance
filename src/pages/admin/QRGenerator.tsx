import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { QRCodeSVG } from "qrcode.react";
import { QrCode, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Org {
  id: string;
  name: string;
}

export default function QRGenerator() {
  const { user } = useAuth();
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<string>("");
  const [qrData, setQrData] = useState<string>("");
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
    // Expiration set to 24 hours (86400000 ms) instead of 30 seconds
    const expiresAt = new Date(Date.now() + 86400000).toISOString();

    const { error } = await supabase.from("qr_tokens").insert({
      org_id: selectedOrg,
      token,
      expires_at: expiresAt,
    });

    if (!error) {
      setQrData(JSON.stringify({ token, org_id: selectedOrg }));
    }
    setGenerating(false);
  }, [selectedOrg]);

  // Initial generation when an organization is selected
  useEffect(() => {
    if (!selectedOrg) {
      setQrData("");
      return;
    }
    generateToken();
  }, [selectedOrg, generateToken]);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">QR Code Generator</h1>
          <p className="text-muted-foreground">Generate static QR codes for attendance tracking</p>
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

              <div className="flex flex-col items-center gap-4 text-muted-foreground mt-4">
                <Button 
                  onClick={generateToken} 
                  disabled={generating}
                  className="gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${generating ? "animate-spin" : ""}`} />
                  Generate New QR
                </Button>
              </div>

              <p className="text-sm text-muted-foreground text-center max-w-xs mt-4">
                Display this QR code for users to scan. Click "Generate New QR" to invalidate the current code and create a new one.
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
