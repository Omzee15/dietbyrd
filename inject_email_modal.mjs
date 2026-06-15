import fs from 'fs';
let content = fs.readFileSync('src/pages/SupportDashboard.tsx', 'utf8');

// 1. Add Email State and API logic
if (!content.includes('showEmailModal')) {
  const emailStateStr = `
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailTarget, setEmailTarget] = useState<{name: string, email: string} | null>(null);
  const [emailForm, setEmailForm] = useState({ subject: "", body: "" });

  const { data: communications } = useQuery({
    queryKey: ["support-communications", emailTarget?.email],
    queryFn: async () => {
      if (!emailTarget?.email) return [];
      const res = await fetch(\`/api/support/communications?email=\${encodeURIComponent(emailTarget.email)}\`);
      const data = await res.json();
      return data.data || [];
    },
    enabled: !!emailTarget?.email,
  });

  const sendEmailMutation = useMutation({
    mutationFn: async () => {
      if (!emailTarget?.email) throw new Error("No email target selected");
      const res = await fetch("/api/support/communications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target_email: emailTarget.email, subject: emailForm.subject, body: emailForm.body }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data.data;
    },
    onSuccess: () => {
      toast.success("Email sent and logged successfully!");
      queryClient.invalidateQueries({ queryKey: ["support-communications", emailTarget?.email] });
      setEmailForm({ subject: "", body: "" });
    },
    onError: (err: Error) => toast.error(err.message),
  });
  `;

  content = content.replace(
    /const \[ticketForm, setTicketForm\] = useState\(\{[\s\S]*?\}\);/,
    `const [ticketForm, setTicketForm] = useState({ patient_id: null as number | null, subject: "", description: "", priority: "medium" });${emailStateStr}`
  );
}

// 2. Add Mail button to Patient row
content = content.replace(
  /<Button variant="outline" size="sm" className="h-6 text-xs px-2" onClick=\{\(\) => setSelectedPatientDetail\(patient\)\}>View<\/Button>/,
  `<Button variant="outline" size="sm" className="h-6 text-xs px-2" onClick={() => setSelectedPatientDetail(patient)}>View</Button>
                                      {patient.email && <Button variant="outline" size="sm" className="h-6 text-xs px-2 bg-primary/5 hover:bg-primary/10 text-primary" onClick={() => { setEmailTarget({ name: patient.name || "Patient", email: patient.email }); setShowEmailModal(true); }}><Mail className="w-3 h-3 mr-1" /> Mail</Button>}`
);

// 3. Add Mail button to Doctor card
content = content.replace(
  /<div className="w-12 h-12 rounded-full bg-primary\/10 flex items-center justify-center text-sm font-bold text-primary">[\s\S]*?<\/div>/,
  `$&
                              {doctor.email && <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-8 w-8 text-primary hover:bg-primary/10" onClick={() => { setEmailTarget({ name: doctor.name, email: doctor.email }); setShowEmailModal(true); }}><Mail className="w-4 h-4" /></Button>}`
);

// 4. Add Mail button to Dietician card
content = content.replace(
  /<p className="text-xs text-muted-foreground">\{dietician\.qualification\} \u00B7 \{dietician\.appointment_count\} appts<\/p>/,
  `$&
                              {dietician.email && <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-8 w-8 text-primary hover:bg-primary/10" onClick={() => { setEmailTarget({ name: dietician.name, email: dietician.email }); setShowEmailModal(true); }}><Mail className="w-4 h-4" /></Button>}`
);

// Make sure cards have position relative for the absolute mail button
content = content.replace(/className="bg-card border rounded-2xl p-5 flex items-start gap-3"/g, 'className="bg-card border rounded-2xl p-5 flex items-start gap-3 relative"');
content = content.replace(/className="bg-card border rounded-2xl p-5 flex items-start gap-3 justify-between"/g, 'className="bg-card border rounded-2xl p-5 flex items-start gap-3 justify-between relative"');

// 5. Add Modal JSX at bottom
if (!content.includes('Email Documentation Modal')) {
  const modalJsx = `
        {/* Email Documentation Modal */}
        <Dialog open={showEmailModal} onOpenChange={setShowEmailModal}>
          <DialogContent aria-describedby={undefined} className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-primary" />
                Email Documentation: {emailTarget?.name}
              </DialogTitle>
              <p className="text-sm text-muted-foreground">Sending to {emailTarget?.email}</p>
            </DialogHeader>

            <div className="space-y-6 py-4">
              <div className="space-y-4">
                <h3 className="font-semibold text-sm">Send New Email</h3>
                <div className="space-y-2">
                  <Label>Subject</Label>
                  <Input value={emailForm.subject} onChange={e => setEmailForm({ ...emailForm, subject: e.target.value })} placeholder="Email subject" />
                </div>
                <div className="space-y-2">
                  <Label>Message Body</Label>
                  <Textarea value={emailForm.body} onChange={e => setEmailForm({ ...emailForm, body: e.target.value })} placeholder="Type the email content here..." rows={4} />
                </div>
                <div className="flex justify-end">
                  <Button disabled={!emailForm.subject || !emailForm.body || sendEmailMutation.isPending} onClick={() => sendEmailMutation.mutate()}>
                    {sendEmailMutation.isPending ? "Sending..." : "Send & Log Email"} <Send className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>

              {communications && communications.length > 0 && (
                <div className="space-y-3 pt-6 border-t">
                  <h3 className="font-semibold text-sm">Previous Communications</h3>
                  <div className="space-y-3">
                    {communications.map((comm: any) => (
                      <div key={comm.id} className="bg-muted p-3 rounded-lg text-sm">
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-semibold">{comm.subject}</span>
                          <span className="text-xs text-muted-foreground">{new Date(comm.created_at).toLocaleString()}</span>
                        </div>
                        <p className="text-xs whitespace-pre-wrap mt-1">{comm.body}</p>
                        <p className="text-[10px] text-muted-foreground mt-2 text-right">Logged by {comm.sent_by_name || "Support"}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
  `;

  content = content.replace(
    /<\/div>\n\s*<\/main>\n\s*<\/div>/,
    `${modalJsx}\n      </div>\n    </main>\n  </div>`
  );
}

fs.writeFileSync('src/pages/SupportDashboard.tsx', content);
console.log("Injected Email modal to SupportDashboard.tsx");
