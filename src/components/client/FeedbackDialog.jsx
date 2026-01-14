import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Star,
  Loader2,
  AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/**
 * Feedback dialog for AI responses and support resolutions
 */
export default function FeedbackDialog({
  open,
  onOpenChange,
  referenceId,
  feedbackType,
  title,
  userEmail
}) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");
  const [issueCategory, setIssueCategory] = useState("");
  const [correctedAnswer, setCorrectedAnswer] = useState("");

  const queryClient = useQueryClient();

  const submitFeedbackMutation = useMutation({
    mutationFn: (feedbackData) =>
      base44.entities.Feedback.create(feedbackData),
    onSuccess: () => {
      queryClient.invalidateQueries(["feedback"]);
      toast.success("Thank you for your feedback!");
      onOpenChange(false);
      // Reset form
      setRating(0);
      setComment("");
      setIssueCategory("");
      setCorrectedAnswer("");
    },
    onError: () => {
      toast.error("Failed to submit feedback");
    }
  });

  const handleSubmit = () => {
    if (rating === 0) {
      toast.error("Please select a rating");
      return;
    }

    const feedbackData = {
      type: feedbackType,
      reference_id: referenceId,
      rating,
      comment,
      corrected_answer: correctedAnswer || undefined,
      submitter_email: userEmail,
      submitter_role: "client",
      helpful: rating >= 4,
      issue_category: rating < 4 ? issueCategory : undefined,
      status: "new"
    };

    submitFeedbackMutation.mutate(feedbackData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>Share Your Feedback</span>
            <Badge variant="outline">{feedbackType}</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Rating */}
          <div>
            <label className="text-sm font-medium text-slate-700 mb-3 block">
              How helpful was this response? *
            </label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className={cn(
                      "w-6 h-6",
                      (hoveredRating || rating) >= star
                        ? "fill-amber-400 text-amber-400"
                        : "text-slate-300"
                    )}
                  />
                </button>
              ))}
              <span className="text-sm text-slate-600 ml-2">
                {rating > 0 && (
                  <>
                    {rating === 5 && "Very helpful"}
                    {rating === 4 && "Helpful"}
                    {rating === 3 && "Neutral"}
                    {rating === 2 && "Somewhat unhelpful"}
                    {rating === 1 && "Not helpful"}
                  </>
                )}
              </span>
            </div>
          </div>

          {/* Issue Category (if low rating) */}
          {rating > 0 && rating < 4 && (
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                What was the issue?
              </label>
              <Select value={issueCategory} onValueChange={setIssueCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select issue type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inaccurate">Inaccurate information</SelectItem>
                  <SelectItem value="incomplete">Incomplete answer</SelectItem>
                  <SelectItem value="unclear">Unclear or confusing</SelectItem>
                  <SelectItem value="outdated">Outdated</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Comment */}
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">
              Additional feedback
            </label>
            <Textarea
              placeholder="Tell us what you think or how we can improve..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="min-h-[100px]"
            />
          </div>

          {/* Corrected Answer */}
          {rating < 4 && (
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                What's the correct answer? (optional)
              </label>
              <Textarea
                placeholder="If you know the correct answer, share it to help us improve..."
                value={correctedAnswer}
                onChange={(e) => setCorrectedAnswer(e.target.value)}
                className="min-h-[80px]"
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitFeedbackMutation.isPending || rating === 0}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {submitFeedbackMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit Feedback"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}