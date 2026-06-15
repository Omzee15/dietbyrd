import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Star, X } from "lucide-react";
import AppSidebar from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getAdminReviews, updateAdminReview, featureAdminReview, type Review } from "@/lib/api";
import { getAdminSidebarSections } from "@/lib/admin-sidebar";
import { toast } from "sonner";

const StarRating = ({ rating }: { rating: number }) => (
  <span className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map((s) => (
      <Star
        key={s}
        className={`w-3.5 h-3.5 ${s <= rating ? "fill-amber-400 text-amber-400" : "text-gray-200"}`}
        strokeWidth={1}
      />
    ))}
  </span>
);

const ReviewCard = ({
  review,
  onApprove,
  onReject,
  onToggleFeatured,
  isPending,
}: {
  review: Review;
  onApprove?: () => void;
  onReject?: () => void;
  onToggleFeatured?: () => void;
  isPending: boolean;
}) => (
  <div
    className={`border rounded-xl p-5 space-y-3 bg-white transition-all ${
      review.is_featured ? "border-amber-300 ring-1 ring-amber-200 shadow-sm" : ""
    }`}
  >
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold text-sm">{review.patient_name || "Verified Patient"}</p>
          <StarRating rating={review.rating} />
          {review.condition_tag && (
            <Badge variant="outline" className="text-xs">
              {review.condition_tag}
            </Badge>
          )}
          {review.is_featured && (
            <Badge className="text-xs bg-amber-50 text-amber-700 border-amber-200">
              ⭐ Featured on Landing
            </Badge>
          )}
          {review.is_approved ? (
            <Badge className="text-xs bg-green-50 text-green-700 border-green-200">Approved</Badge>
          ) : (
            <Badge variant="outline" className="text-xs text-orange-600 border-orange-200">
              Pending
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {new Date(review.created_at).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </p>
      </div>
      <div className="flex gap-2 shrink-0 flex-wrap justify-end">
        {review.is_approved && onToggleFeatured && (
          <Button
            size="sm"
            variant={review.is_featured ? "default" : "outline"}
            onClick={onToggleFeatured}
            disabled={isPending}
            className={review.is_featured ? "bg-amber-500 hover:bg-amber-600 border-amber-500 text-white" : "border-amber-300 text-amber-700 hover:bg-amber-50"}
          >
            <Star className={`w-3.5 h-3.5 mr-1 ${review.is_featured ? "fill-white" : ""}`} />
            {review.is_featured ? "Unfeature" : "Feature"}
          </Button>
        )}
        {!review.is_approved && onApprove && (
          <Button size="sm" onClick={onApprove} disabled={isPending}>
            <Check className="w-4 h-4 mr-1" /> Approve
          </Button>
        )}
        {onReject && (
          <Button
            size="sm"
            variant="outline"
            onClick={onReject}
            disabled={isPending}
            className="text-red-600 border-red-200 hover:bg-red-50"
          >
            <X className="w-4 h-4 mr-1" /> {review.is_approved ? "Unapprove" : "Reject"}
          </Button>
        )}
      </div>
    </div>
    <p className="text-sm leading-6 text-muted-foreground italic">"{review.body}"</p>
  </div>
);

const AdminReviews = () => {
  const queryClient = useQueryClient();

  const { data: allReviews = [], isLoading } = useQuery({
    queryKey: ["admin-reviews"],
    queryFn: () => getAdminReviews(undefined),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, approved }: { id: string; approved: boolean }) =>
      updateAdminReview(id, approved),
    onSuccess: () => {
      toast.success("Review updated");
      queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const featureMutation = useMutation({
    mutationFn: ({ id, featured }: { id: string; featured: boolean }) =>
      featureAdminReview(id, featured),
    onSuccess: (_, vars) => {
      toast.success(vars.featured ? "⭐ Review will now appear on the landing page" : "Review removed from landing page");
      queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const pending = allReviews.filter((r) => !r.is_approved);
  const approved = allReviews.filter((r) => r.is_approved);
  const featured = approved.filter((r) => r.is_featured);

  const isPending = updateMutation.isPending || featureMutation.isPending;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AppSidebar title="DietByRD" subtitle="Admin" sections={getAdminSidebarSections()} />
      <main className="flex-1 p-8">
        <div className="max-w-5xl mx-auto space-y-8">
          <div>
            <h1 className="text-2xl font-bold">Patient Reviews</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Approve reviews and choose which ones appear as testimonials on the landing page.
            </p>
          </div>

          {/* Summary bar */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white border rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{allReviews.length}</p>
              <p className="text-xs text-muted-foreground mt-1">Total Reviews</p>
            </div>
            <div className="bg-white border rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-orange-500">{pending.length}</p>
              <p className="text-xs text-muted-foreground mt-1">Pending Approval</p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-amber-600">{featured.length}</p>
              <p className="text-xs text-muted-foreground mt-1">Featured on Landing</p>
            </div>
          </div>

          {/* Pending Reviews */}
          {pending.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Pending Approval
                  <Badge variant="outline" className="text-orange-600 border-orange-200 ml-1">
                    {pending.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {pending.map((review) => (
                  <ReviewCard
                    key={review.id}
                    review={review}
                    isPending={isPending}
                    onApprove={() => updateMutation.mutate({ id: review.id, approved: true })}
                    onReject={() => updateMutation.mutate({ id: review.id, approved: false })}
                  />
                ))}
              </CardContent>
            </Card>
          )}

          {/* Approved Reviews — with Featured toggle */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Approved Reviews
                <Badge variant="outline" className="text-green-700 border-green-200 ml-1">
                  {approved.length}
                </Badge>
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Click <strong>⭐ Feature</strong> to show a review in the testimonial carousel on the homepage.
                Featured reviews are shown to all visitors.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                <p className="text-sm text-muted-foreground">Loading reviews...</p>
              ) : approved.length === 0 ? (
                <p className="text-sm text-muted-foreground">No approved reviews yet.</p>
              ) : (
                approved.map((review) => (
                  <ReviewCard
                    key={review.id}
                    review={review}
                    isPending={isPending}
                    onToggleFeatured={() =>
                      featureMutation.mutate({ id: review.id, featured: !review.is_featured })
                    }
                    onReject={() => updateMutation.mutate({ id: review.id, approved: false })}
                  />
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
