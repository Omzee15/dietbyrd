import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { getApprovedReviews, getReviewEligibility, submitReview } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const conditionOptions = ["PCOS", "Diabetes", "Thyroid Disorders", "Obesity", "High Cholesterol", "Hypertension", "Gut Health", "Sports Nutrition"];

const Reviews = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [condition, setCondition] = useState("");
  const [body, setBody] = useState("");

  const { data: reviews = [] } = useQuery({
    queryKey: ["approved-reviews"],
    queryFn: () => getApprovedReviews(50),
  });

  const { data: eligibility } = useQuery({
    queryKey: ["review-eligibility", user?.id],
    queryFn: getReviewEligibility,
    enabled: isAuthenticated && user?.role === "patient",
  });

  const submitMutation = useMutation({
    mutationFn: () => submitReview({ rating, body: body.trim(), condition_tag: condition || undefined }),
    onSuccess: () => {
      toast.success("Submitted! It will be public after admin approval.");
      setOpen(false);
      setBody("");
      queryClient.invalidateQueries({ queryKey: ["review-eligibility"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const cta = () => {
    if (!isAuthenticated || user?.role !== "patient") {
      return <Button onClick={() => navigate("/login")}>Log in to share your experience</Button>;
    }
    if (!eligibility?.has_completed_paid_consultation) {
      return <Button disabled title="Available after your first consultation">Available after your first consultation</Button>;
    }
    if (eligibility.has_reviewed) {
      return <p className="text-sm text-muted-foreground">You've already shared your review. Thank you!</p>;
    }
    return <Button onClick={() => setOpen(true)}>Share your story</Button>;
  };

  return (
    <div className="min-h-screen bg-[var(--cream)]">
      <header className="px-6 py-5 bg-[var(--navy)] text-white">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link to="/" className="font-serif text-xl font-bold">Diet By <span className="text-[var(--gold)]">RD</span></Link>
          <Link to="/" className="text-sm text-white/80 hover:text-white">Home</Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-16 space-y-12">
        <section className="max-w-3xl">
          <h1 className="font-serif text-4xl md:text-5xl font-bold text-[var(--navy)]">Real stories from real patients</h1>
          <p className="mt-4 text-lg text-[var(--text2)]">Every review here is from a verified Diet By RD patient with a registered mobile number.</p>
        </section>

        <section className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {reviews.map((review) => (
            <Card key={review.id}>
              <CardHeader>
                <div className="flex gap-1 text-[var(--gold)]">
                  {Array.from({ length: review.rating }).map((_, i) => <Star key={i} className="w-4 h-4 fill-current" />)}
                </div>
                <CardTitle className="text-base">{review.patient_name || "Verified Patient"}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-[var(--text2)] leading-6">{review.body}</p>
                {review.condition_tag && <p className="mt-4 text-xs font-medium text-[var(--teal)]">{review.condition_tag}</p>}
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="text-center bg-white border rounded-lg p-8">
          <h2 className="font-serif text-2xl font-bold text-[var(--navy)] mb-3">Share your story</h2>
          {cta()}
        </section>
      </main>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share your story</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">Rating</p>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button key={value} type="button" onClick={() => setRating(value)} className={value <= rating ? "text-[var(--gold)]" : "text-muted-foreground"}>
                    <Star className="w-7 h-7 fill-current" />
                  </button>
                ))}
              </div>
            </div>
            <Select value={condition} onValueChange={setCondition}>
              <SelectTrigger><SelectValue placeholder="Condition tag (optional)" /></SelectTrigger>
              <SelectContent>
                {conditionOptions.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}
              </SelectContent>
            </Select>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} minLength={20} maxLength={2000} rows={7} placeholder="Tell future patients what changed for you..." />
            <Button className="w-full" disabled={body.trim().length < 20 || submitMutation.isPending} onClick={() => submitMutation.mutate()}>
              Submit for approval
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Reviews;
