import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UserPlus, Users, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface InvitedStudent {
  id: string;
  name: string;
  email: string;
  phone_number: string;
  created_at: string;
}

export default function AddStudent() {
  const { user } = useAuth();
  const [students, setStudents] = useState<InvitedStudent[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const fetchStudents = async () => {
    if (!user) return;
    setFetching(true);
    
    // Using any to bypass the generated Supabase types which might not be fully synced locally yet
    const { data, error } = await supabase
      .from("invited_students" as any)
      .select("*")
      .eq("admin_id", user.id)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setStudents(data as unknown as InvitedStudent[]);
    }
    setFetching(false);
  };

  useEffect(() => {
    fetchStudents();
  }, [user]);

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !name || !email) return;

    setLoading(true);
    
    const { error, data } = await supabase.rpc("admin_create_student", {
      student_name: name,
      student_email: email,
      student_phone: phone
    });

    if (error) {
      toast.error(error.message || "Failed to add student. Ensure email is unique.");
    } else {
      toast.success("Student added successfully! They can log in with their email and phone number.");
      setName("");
      setEmail("");
      setPhone("");
      fetchStudents();
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("invited_students" as any).delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete student.");
    } else {
      toast.success("Student removed.");
      fetchStudents();
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">Student Management</h1>
          <p className="text-muted-foreground">Add and manage students for your organization</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Add Student Form */}
          <div className="lg:col-span-1">
            <Card className="glass-card sticky top-24">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5 text-primary" />
                  Add New Student
                </CardTitle>
                <CardDescription>Enter student details to invite them.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddStudent} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="John Doe" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="student@example.com" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 234 567 8900" />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Adding..." : "Add Student"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Student List */}
          <div className="lg:col-span-2">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Enrolled Students ({students.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {fetching ? (
                  <div className="py-12 text-center text-muted-foreground">Loading students...</div>
                ) : students.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>Added On</TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {students.map((student) => (
                          <TableRow key={student.id}>
                            <TableCell className="font-medium">{student.name}</TableCell>
                            <TableCell>{student.email}</TableCell>
                            <TableCell>{student.phone_number || "—"}</TableCell>
                            <TableCell className="text-muted-foreground text-xs">
                              {format(new Date(student.created_at), "MMM d, yyyy")}
                            </TableCell>
                            <TableCell>
                              <Button variant="ghost" size="icon" onClick={() => handleDelete(student.id)} className="text-destructive hover:bg-destructive/10">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="py-12 text-center flex flex-col items-center">
                    <Users className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                    <p className="text-muted-foreground">No students added yet.</p>
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
