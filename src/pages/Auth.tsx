import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, Shield, QrCode, User, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export default function Auth() {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(loginEmail, loginPassword);
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Logged in successfully!");
      navigate("/");
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signUp(signupEmail, signupPassword, signupName);
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Account created! Check your email to confirm.");
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8 relative z-10">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 gradient-primary text-primary-foreground px-4 py-2 rounded-full font-heading font-bold text-lg shadow-lg">
            <QrCode className="h-5 w-5" />
            GeoQR
          </div>
          <h1 className="text-3xl font-heading font-bold text-white drop-shadow-md">Welcome Back</h1>
          <p className="text-slate-300 drop-shadow-sm">Secure attendance with location verification</p>
        </div>

        <div className="flex justify-center gap-6 text-slate-300 text-sm drop-shadow-sm">
          <span className="flex items-center gap-1"><MapPin className="h-4 w-4 text-primary" /> GPS Verified</span>
          <span className="flex items-center gap-1"><Shield className="h-4 w-4 text-primary" /> WiFi Checked</span>
        </div>

        <Card className="auth-glass-card mt-8 border-white/10">
          <Tabs defaultValue="student">
            <CardHeader className="pb-2">
              <TabsList className="w-full grid border-b border-border/40 grid-cols-2 bg-transparent p-0 gap-4 mb-4">
                <TabsTrigger 
                  value="student" 
                  className="rounded-t-lg rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-card data-[state=active]:shadow-none data-[state=active]:text-primary flex items-center gap-2 py-3"
                >
                  <User className="h-4 w-4" />
                  Student Login
                </TabsTrigger>
                <TabsTrigger 
                  value="admin" 
                  className="rounded-t-lg rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-card data-[state=active]:shadow-none data-[state=active]:text-primary flex items-center gap-2 py-3"
                >
                  <ShieldCheck className="h-4 w-4" />
                  Admin Login
                </TabsTrigger>
              </TabsList>
            </CardHeader>
            <CardContent>
              <TabsContent value="student" className="mt-0 space-y-4 animate-in fade-in slide-in-from-bottom-2">
                <CardTitle className="text-xl mb-6">Student Portal</CardTitle>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="student-login-email">Email</Label>
                    <Input id="student-login-email" type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required placeholder="student@example.com" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="student-login-password">Password</Label>
                    <Input id="student-login-password" type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required placeholder="••••••••" />
                  </div>
                  <Button type="submit" className="w-full py-6 text-lg" disabled={loading}>
                    {loading ? "Signing in..." : "Login as Student"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="admin" className="mt-0 space-y-4 animate-in fade-in slide-in-from-bottom-2">
                <CardTitle className="text-xl mb-6 flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" /> 
                  Admin Portal
                </CardTitle>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="admin-login-email">Admin Email</Label>
                    <Input id="admin-login-email" type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required placeholder="admin@example.com" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="admin-login-password">Password</Label>
                    <Input id="admin-login-password" type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required placeholder="••••••••" />
                  </div>
                  <Button type="submit" variant="default" className="w-full py-6 text-lg bg-primary/90 hover:bg-primary" disabled={loading}>
                    {loading ? "Signing in..." : "Login as Admin"}
                  </Button>
                </form>
                <p className="text-xs text-muted-foreground text-center mt-6">
                  Only authorized admin accounts can access the dashboard.
                </p>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
