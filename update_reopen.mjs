import fs from 'fs';
let content = fs.readFileSync('src/pages/patient/PatientSupport.tsx', 'utf8');

// I will just replace the rendering of "Re-open" button.
content = content.replace(
  /\{selectedTicket\.status === "closed" && \([\s\S]*?Re-open\n\s*<\/Button>\n\s*<\/div>\n\s*\)\}/,
  `{selectedTicket.status === "resolved" && (
                          <div className="mt-3">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={reopenTicketMutation.isPending || (selectedTicket.resolved_at && new Date().getTime() - new Date(selectedTicket.resolved_at).getTime() > 72 * 60 * 60 * 1000)}
                              onClick={() => reopenTicketMutation.mutate()}
                            >
                              {reopenTicketMutation.isPending ? "Re-opening..." : "Not Resolved"}
                            </Button>
                            {selectedTicket.resolved_at && new Date().getTime() - new Date(selectedTicket.resolved_at).getTime() > 72 * 60 * 60 * 1000 && (
                              <p className="text-xs text-muted-foreground mt-1">This ticket is now closed as 72 hours have passed since resolution.</p>
                            )}
                          </div>
                        )}`
);

fs.writeFileSync('src/pages/patient/PatientSupport.tsx', content);
console.log("Updated Reopen logic in PatientSupport.tsx");
