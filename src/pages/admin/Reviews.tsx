import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, X } from "lucide-react";
import AppSidebar from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAdminReviews, updateAdminReview } from "@/lib/api";
import { getAdminSidebarSections } from "@/lib/admin-sidebar";
import { toast } from "sonner";

const AdminReviews = () => {
  const queryClient = useQueryClient();
  const { data: pending = [], isLoading } = useQuery({
    queryKey: ["admin-reviews", false],
    queryFn: () => getAdminReviews(false),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, approved }: { id: string; approved: boolean }) => updateAdminReview(id, approved),
    onSuccess: () => {
      toast.success("Review updated");
      queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AppSidebar title="DietByRD" subtitle="Admin" sections={getAdminSidebarSections()} />
      <main className="flex-1 p-8">
        <div className="max-w-5xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Reviews</h1>
            <p className="text-sm text-muted-foreground">Pending patient stories waiting for public approval.</p>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Pending</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                <p className="text-sm text-muted-foreground">Loading reviews...</p>
              ) : pending.length === 0 ? (
                <p className="text-sm text-muted-foreground">No pending reviews.</p>
              ) : (
                pending.map((review) => (
                  <div key={review.id} className="border rounded-lg p-4 space-y-3 bg-white">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-semibold">{review.patient_name || "Verified Patient"}</p>
                        <p className="text-xs text-muted-foreground">{review.rating}/5 {review.condition_tag ? `- ${review.condition_tag}` : ""}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => updateMutation.mutate({ id: review.id, approved: true })}>
                          <Check className="w-4 h-4 mr-1" /> Approve
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => updateMutation.mutate({ id: review.id, approved: false })}>
                          <X className="w-4 h-4 mr-1" /> Reject
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm leading-6 text-muted-foreground">{review.body}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default AdminReviews;
