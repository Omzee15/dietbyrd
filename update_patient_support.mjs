import fs from 'fs';
let content = fs.readFileSync('src/pages/patient/PatientSupport.tsx', 'utf8');

// Add the mutation for reopen ticket
if (!content.includes('reopenTicketMutation')) {
  content = content.replace(
    /const createCommentMutation = useMutation\(\{/,
    `const reopenTicketMutation = useMutation({
      mutationFn: async (ticketId: number) => {
        const res = await fetch(\`/api/patient/me/tickets/\${ticketId}/reopen\`, {
          method: "PATCH",
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);
        return data.data;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["patient-tickets"] });
        if (selectedTicketId) {
          queryClient.invalidateQueries({ queryKey: ["patient-ticket-detail", selectedTicketId] });
        }
        toast.success("Ticket marked as not resolved and reopened");
      },
      onError: (error: Error) => toast.error(error.message),
    });

    const createCommentMutation = useMutation({`
  );

  // Add the button to the ticket view if status is resolved
  content = content.replace(
    /\{selectedTicket\.status === "resolved" && selectedTicket\.resolution_notes && \(/,
    `{selectedTicket.status === "resolved" && (
                              <div className="mt-4 flex items-center justify-between bg-green-50/50 p-4 rounded-xl border border-green-100">
                                <div>
                                  <p className="text-sm font-medium text-green-900">Is your issue resolved?</p>
                                  <p className="text-xs text-green-700/80 mt-0.5">You can mark this ticket as not resolved within 72 hours.</p>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 text-xs border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                                  disabled={
                                    reopenTicketMutation.isPending ||
                                    (selectedTicket.resolved_at && new Date().getTime() - new Date(selectedTicket.resolved_at).getTime() > 72 * 60 * 60 * 1000)
                                  }
                                  onClick={() => reopenTicketMutation.mutate(selectedTicket.id)}
                                >
                                  {reopenTicketMutation.isPending ? "Updating..." : "Not Resolved"}
                                </Button>
                              </div>
                            )}

                            {selectedTicket.status === "resolved" && selectedTicket.resolution_notes && (`
  );

  fs.writeFileSync('src/pages/patient/PatientSupport.tsx', content);
  console.log("Added reopen logic to PatientSupport.tsx");
}
