import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowLeft, Loader2, ShieldCheck, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { getApprovedReviews, getReviewEligibility, submitReview } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const reviewGuidelinePatterns = [
  /\b(fuck|shit|bitch|asshole|bastard|slut|whore)\b/i,
  /\b(kill|suicide|self[-\s]?harm|rape|molest)\b/i,
  /\b\d{10}\b/,
  /https?:\/\//i,
  /www\./i,
  /@[a-z0-9_.-]+\.[a-z]{2,}/i,
];

const violatesGuidelines = (value: string) =>
  reviewGuidelinePatterns.some((pattern) => pattern.test(value));

const Reviews = () => {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState("");
  const [conditionTag, setConditionTag] = useState("");

  const { data: reviews = [], isLoading: reviewsLoading } = useQuery({
    queryKey: ["approved-reviews"],
    queryFn: () => getApprovedReviews(30, 0),
  });

  const { data: eligibility, isLoading: eligibilityLoading } = useQuery({
    queryKey: ["review-eligibility", user?.id],
    queryFn: getReviewEligibility,
    enabled: isAuthenticated && user?.role === "patient",
  });

  const guidelineError = useMemo(() => {
    if (!body.trim()) return "";
    if (body.trim().length < 20) return "Write at least 20 characters.";
    if (violatesGuidelines(body)) {
      return "Remove personal contact details, links, abusive words, or unsafe content.";
    }
    return "";
  }, [body]);

  const submitMutation = useMutation({
    mutationFn: () =>
      submitReview({
        rating,
        body: body.trim(),
        condition_tag: conditionTag.trim() || undefined,
      }),
    onSuccess: () => {
      toast.success("Review submitted for approval");
      setBody("");
      setConditionTag("");
      setRating(5);
      queryClient.invalidateQueries({ queryKey: ["approved-reviews"] });
      queryClient.invalidateQueries({ queryKey: ["review-eligibility", user?.id] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Could not submit review");
    },
  });

  const canSubmit =
    user?.role === "patient" &&
    eligibility?.eligible &&
    !guidelineError &&
    body.trim().length >= 20 &&
    !submitMutation.isPending;

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-5 py-8">
        <Button variant="ghost" asChild className="mb-5">
          <Link to="/">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Home
          </Link>
        </Button>

        <section className="mb-8">
          <Badge variant="outline" className="mb-3">
            <ShieldCheck className="w-3.5 h-3.5 mr-1" />
            Anonymous patient reviews
          </Badge>
          <h1 className="text-3xl font-bold tracking-tight">Honest Reviews</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Only paid patients can submit a review. Published reviews never show patient names.
          </p>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-lg border bg-card p-5">
            <h2 className="text-lg font-semibold">Drop an anonymous review</h2>
            {!isAuthenticated || user?.role !== "patient" ? (
              <div className="mt-4 rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
                Please log in as a patient to submit a review.
              </div>
            ) : eligibilityLoading ? (
              <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Checking eligibility...
              </div>
            ) : !eligibility?.eligible ? (
              <div className="mt-4 rounded-lg bg-amber-50 p-4 text-sm text-amber-800">
                {eligibility?.reason || "Only paid patients can submit a review."}
              </div>
            ) : (
              <form
                className="mt-4 space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (canSubmit) submitMutation.mutate();
                }}
              >
                <div>
                  <label className="text-sm font-medium">Rating</label>
                  <div className="mt-2 flex gap-1">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setRating(value)}
                        className="rounded-md p-1 text-amber-500 focus:outline-none focus:ring-2 focus:ring-ring"
                        aria-label={`${value} star rating`}
                      >
                        <Star className={`w-6 h-6 ${value <= rating ? "fill-current" : ""}`} />
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Condition tag optional</label>
                  <input
                    value={conditionTag}
                    onChange={(e) => setConditionTag(e.target.value.slice(0, 40))}
                    placeholder="e.g. PCOS, diabetes, weight loss"
                    className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Review</label>
                  <Textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value.slice(0, 2000))}
                    rows={6}
                    placeholder="Share what changed for you. Please avoid names, phone numbers, links, abusive language, or private medical details."
                    className="mt-1"
                  />
                  <div className="mt-1 flex justify-between text-xs">
                    <span className={guidelineError ? "text-red-600" : "text-muted-foreground"}>
                      {guidelineError || "Your identity will not be shown publicly."}
                    </span>
                    <span className="text-muted-foreground">{body.length}/2000</span>
                  </div>
                </div>
                <Button type="submit" disabled={!canSubmit} className="w-full">
                  {submitMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Submit Review
                </Button>
              </form>
            )}
          </div>

          <div className="space-y-3">
            {reviewsLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading reviews...
              </div>
            ) : reviews.length === 0 ? (
              <div className="rounded-lg border bg-card p-5 text-muted-foreground">
                No approved reviews yet.
              </div>
            ) : (
              reviews.map((review) => (
                <article key={review.id} className="rounded-lg border bg-card p-5">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">Anonymous patient</p>
                      {review.condition_tag && (
                        <p className="text-xs text-muted-foreground">{review.condition_tag}</p>
                      )}
                    </div>
                    <div className="flex text-amber-500">
                      {[1, 2, 3, 4, 5].map((value) => (
                        <Star key={value} className={`w-4 h-4 ${value <= review.rating ? "fill-current" : ""}`} />
                      ))}
                    </div>
                  </div>
                  <p className="text-sm leading-6 text-muted-foreground">{review.body}</p>
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
};

export default Reviews;
