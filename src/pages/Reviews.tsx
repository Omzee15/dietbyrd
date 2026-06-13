import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, ShieldCheck, Star, UserX, Lock, MessageCircle, Heart, Quote, Mail, ArrowLeft } from "lucide-react";
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
  const navigate = useNavigate();
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
    <div className="min-h-screen bg-[#FDFCF8] relative" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      {/* Background elements */}
      <img src="https://images.unsplash.com/photo-1620054813524-7eb3268cb320?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80" alt="" className="absolute top-0 left-0 w-64 md:w-96 opacity-10 pointer-events-none mix-blend-multiply rounded-full" onError={(e) => e.currentTarget.style.display = 'none'} />
      <img src="https://images.unsplash.com/photo-1620054813524-7eb3268cb320?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80" alt="" className="absolute top-[40%] right-0 w-64 md:w-96 opacity-10 pointer-events-none mix-blend-multiply rounded-full" onError={(e) => e.currentTarget.style.display = 'none'} />

      {/* Header */}
      <div className="max-w-7xl mx-auto px-6 pt-8 relative z-10">
        <Link to="/" className="inline-flex items-center text-gray-500 hover:text-gray-900 transition-colors mb-8">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Link>

        <div className="text-center mb-16 max-w-4xl mx-auto">
          <p className="text-[11px] font-bold tracking-[0.15em] text-[#427A5B] uppercase mb-4">
            Real People. Real Stories. Real Impact.
          </p>
          <h1 className="text-4xl md:text-[56px] text-[var(--navy)] tracking-tight mb-4 leading-tight" style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700 }}>
            100% Real Reviews<br className="hidden md:block" /> from Real People.
          </h1>
          <div className="flex items-center justify-center gap-2 mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#427A5B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>
          </div>
          <p className="text-[16px] font-medium text-gray-700">
            Because your health journey deserves honesty you can trust.
          </p>
        </div>

        {/* 5 Value Props */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-6 max-w-5xl mx-auto mb-20">
          <div className="flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full border border-[#EBE7DF] flex items-center justify-center mb-4 bg-white shadow-sm">
              <ShieldCheck className="w-5 h-5 text-gray-700" strokeWidth={1.5} />
            </div>
            <h4 className="text-[11px] font-bold text-[var(--navy)] mb-2 uppercase tracking-wide">Real & Verified</h4>
            <p className="text-[12px] text-gray-500 leading-relaxed max-w-[140px]">
              Only verified patients who purchased and took a consultation can leave a review.
            </p>
          </div>
          <div className="flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full border border-[#EBE7DF] flex items-center justify-center mb-4 bg-white shadow-sm">
              <UserX className="w-5 h-5 text-gray-700" strokeWidth={1.5} />
            </div>
            <h4 className="text-[11px] font-bold text-[var(--navy)] mb-2 uppercase tracking-wide">No Bots. No Fakes.</h4>
            <p className="text-[12px] text-gray-500 leading-relaxed max-w-[140px]">
              No self-written or incentivised reviews. Just real experiences from real people.
            </p>
          </div>
          <div className="flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full border border-[#EBE7DF] flex items-center justify-center mb-4 bg-white shadow-sm">
              <Lock className="w-5 h-5 text-gray-700" strokeWidth={1.5} />
            </div>
            <h4 className="text-[11px] font-bold text-[var(--navy)] mb-2 uppercase tracking-wide">Anonymous & Private</h4>
            <p className="text-[12px] text-gray-500 leading-relaxed max-w-[140px]">
              We keep you anonymous to protect your privacy and comfort.
            </p>
          </div>
          <div className="flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full border border-[#EBE7DF] flex items-center justify-center mb-4 bg-white shadow-sm">
              <Heart className="w-5 h-5 text-gray-700" strokeWidth={1.5} />
            </div>
            <h4 className="text-[11px] font-bold text-[var(--navy)] mb-2 uppercase tracking-wide">No Judgement</h4>
            <p className="text-[12px] text-gray-500 leading-relaxed max-w-[140px]">
              Nobody judges nobody. This is a safe space for honest sharing.
            </p>
          </div>
          <div className="flex flex-col items-center text-center col-span-2 md:col-span-1">
            <div className="w-12 h-12 rounded-full border border-[#EBE7DF] flex items-center justify-center mb-4 bg-white shadow-sm">
              <MessageCircle className="w-5 h-5 text-gray-700" strokeWidth={1.5} />
            </div>
            <h4 className="text-[11px] font-bold text-[var(--navy)] mb-2 uppercase tracking-wide">One Review Per User</h4>
            <p className="text-[12px] text-gray-500 leading-relaxed max-w-[140px]">
              Each user is allowed to post only one review. Always fair. Always real.
            </p>
          </div>
        </div>

        {/* Why real reviews matter */}
        <div className="max-w-3xl mx-auto bg-[#F5F4EE] border border-[#EBE7DF] rounded-2xl p-8 md:p-10 flex gap-6 items-start mb-20 relative">
          <Quote className="w-16 h-16 text-[#EAEBE4] shrink-0 absolute -top-6 right-8 rotate-180" />
          <div className="relative z-10">
            <h3 className="text-[15px] font-bold text-[var(--navy)] mb-2">Why real reviews matter?</h3>
            <p className="text-[14px] text-gray-600 leading-relaxed">
              Before buying anything online, we all look for reviews. They shape our decisions. At Diet By RD, we believe in transparency, honesty and real human experiences.
            </p>
          </div>
        </div>

        {/* Share Your Experience Form */}
        <div className="max-w-[700px] mx-auto bg-white border border-[#EBE7DF] rounded-3xl p-8 md:p-12 mb-32 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
          <div className="text-center mb-8">
            <h2 className="text-3xl text-[var(--navy)] mb-3" style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700 }}>
              Share Your Experience
            </h2>
            <p className="text-[14px] text-gray-500">
              Your experience can help someone take the first step towards better health.
            </p>
          </div>

          <div className="bg-[#FAF9F5] border border-[#EAEBE4] rounded-xl p-4 flex items-center gap-3 mb-10">
            <ShieldCheck className="w-5 h-5 text-[#427A5B] shrink-0" strokeWidth={1.5} />
            <p className="text-[13px] text-gray-600 font-medium">
              Only verified patients who have purchased and taken a consultation can post a review.
            </p>
          </div>

          {!isAuthenticated || user?.role !== "patient" ? (
            <div className="text-center p-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
              <p className="text-sm text-gray-600 mb-4">Please log in as a patient to submit a review.</p>
              <button onClick={() => navigate('/login')} className="px-6 py-2.5 bg-[var(--navy)] hover:opacity-90 text-white rounded-lg text-sm font-medium transition-opacity">
                Log In as Patient
              </button>
            </div>
          ) : eligibilityLoading ? (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground p-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
              <Loader2 className="w-4 h-4 animate-spin" />
              Checking eligibility...
            </div>
          ) : !eligibility?.eligible ? (
            <div className="text-center p-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
              <p className="text-sm text-gray-600 font-medium">
                {eligibility?.reason || "Only paid patients can submit a review."}
              </p>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (canSubmit) submitMutation.mutate();
              }}
            >
              <div className="mb-8">
                <label className="block text-[13px] font-bold text-[var(--navy)] mb-3 uppercase tracking-wide">
                  How would you rate your experience?
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setRating(value)}
                      className="focus:outline-none transition-transform hover:scale-110"
                    >
                      <Star 
                        className={`w-8 h-8 ${value <= rating ? "fill-[#427A5B] text-[#427A5B]" : "text-gray-200"}`} 
                        strokeWidth={1}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-[13px] font-bold text-[var(--navy)] mb-3 uppercase tracking-wide">
                  Your Review
                </label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value.slice(0, 2000))}
                  rows={5}
                  placeholder="Share your honest experience..."
                  className="w-full bg-[#FDFCF8] border border-[#EBE7DF] rounded-xl p-4 text-[15px] focus:outline-none focus:border-[#427A5B] focus:ring-1 focus:ring-[#427A5B] transition-all resize-none"
                />
                <div className="flex justify-between items-center mt-2 px-1">
                  <span className="text-[12px] text-gray-400">Minimum 20 characters</span>
                  <span className="text-[12px] text-gray-400">{body.length}/2000</span>
                </div>
              </div>

              <div className="mb-8">
                <label className="block text-[13px] font-bold text-[var(--navy)] mb-3 uppercase tracking-wide">
                  Condition Treated (Optional)
                </label>
                <input
                  type="text"
                  value={conditionTag}
                  onChange={(e) => setConditionTag(e.target.value.slice(0, 40))}
                  placeholder="e.g. Weight Management, PCOS"
                  className="w-full bg-[#FDFCF8] border border-[#EBE7DF] rounded-xl p-4 text-[15px] focus:outline-none focus:border-[#427A5B] focus:ring-1 focus:ring-[#427A5B] transition-all"
                />
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-4 border-t border-gray-100">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-[#427A5B]" />
                  <span className="text-[12px] text-gray-500 font-medium">
                    Your identity will always remain anonymous.
                  </span>
                </div>
                
                <div className="w-full sm:w-auto text-center sm:text-right">
                  {guidelineError && body.length >= 20 && (
                    <p className="text-red-500 text-[12px] mb-2 max-w-xs text-left sm:text-right">
                      {guidelineError}
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={!canSubmit}
                    className="w-full sm:w-auto px-8 py-3.5 bg-[#427A5B] hover:bg-[#346148] text-white rounded-lg font-bold text-[14px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
                  >
                    {submitMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                    Submit Your Review
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Reviews List */}
        <div className="text-center mb-16">
          <p className="text-[11px] font-bold tracking-[0.15em] text-[#427A5B] uppercase mb-4">
            VOICES THAT INSPIRE
          </p>
          <h2 className="text-4xl text-[var(--navy)] mb-4" style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700 }}>
            Real Stories. Real Results.
          </h2>
          <p className="text-[15px] text-gray-600 max-w-2xl mx-auto">
            Anonymous reviews from real patients who chose better health with Diet By RD.
          </p>
        </div>

        {reviewsLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-[#427A5B]" />
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-20 text-gray-500 bg-white border border-[#EBE7DF] rounded-2xl max-w-2xl mx-auto">
            No approved reviews yet.
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-32 max-w-7xl mx-auto">
            {reviews.map((review) => (
              <div key={review.id} className="bg-white border border-[#EBE7DF] rounded-2xl p-8 flex flex-col shadow-sm">
                <div className="flex justify-center gap-1 mb-6">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <Star 
                      key={value} 
                      className={`w-4 h-4 ${value <= review.rating ? "fill-[#427A5B] text-[#427A5B]" : "text-gray-200"}`} 
                    />
                  ))}
                </div>
                
                <div className="relative mb-8 text-center px-4 flex-1">
                  <Quote className="w-6 h-6 text-[#EAEBE4] absolute -top-2 left-0 rotate-180" />
                  <Quote className="w-6 h-6 text-[#EAEBE4] absolute -bottom-2 right-0" />
                  <p className="text-[14px] text-gray-700 leading-relaxed font-medium italic relative z-10">
                    "{review.body}"
                  </p>
                </div>
                
                <div className="text-center mb-6">
                  <p className="text-[12px] font-bold text-[var(--navy)] uppercase tracking-wide">
                    — A Verified Patient
                  </p>
                </div>

                {review.condition_tag && (
                  <div className="mt-auto pt-4 border-t border-gray-100 flex items-center justify-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#FAF9F5] flex items-center justify-center shrink-0">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#427A5B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>
                    </div>
                    <div className="text-left">
                      <p className="text-[10px] text-gray-400 uppercase tracking-wide">Consultation taken for</p>
                      <p className="text-[12px] font-bold text-gray-700">{review.condition_tag}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Footer Banner */}
      <div className="bg-[#F5F4EE] py-12 border-t border-[#EBE7DF]">
        <div className="max-w-4xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6 bg-white p-6 rounded-2xl border border-[#EBE7DF] shadow-sm">
          <div className="flex items-center gap-5 text-center md:text-left">
            <div className="w-14 h-14 rounded-full bg-[#427A5B] flex items-center justify-center shrink-0">
              <Mail className="w-6 h-6 text-white" strokeWidth={1.5} />
            </div>
            <div>
              <h4 className="font-bold text-[var(--navy)] text-[15px] mb-1">
                Your story can change someone else's tomorrow.
              </h4>
              <p className="text-[13px] text-gray-500">
                Share your experience and be a part of a community<br className="hidden md:block" /> that believes in real, honest and meaningful health.
              </p>
            </div>
          </div>
          <button onClick={() => navigate('/#approach')} className="whitespace-nowrap px-6 py-3.5 bg-[#427A5B] hover:bg-[#346148] text-white rounded-lg font-bold text-[13px] transition-colors">
            Book Your Consultation →
          </button>
        </div>
      </div>
    </div>
  );
};

export default Reviews;
