import { useState } from "react";
import type { TaskUpdate } from "../../types/domain";
import { V2Button } from "../ui/V2Button";

type Props = {
  update: TaskUpdate;
  saving: boolean;
  onReview: (id: string, status: "APPROVED" | "CHANGES_REQUESTED", feedback: string) => Promise<void>;
};

/** Shared pending-update review behavior for the Queue and Task Detail workspace. */
export default function TaskUpdateReviewActions({ update, saving, onReview }: Props) {
  const [feedback, setFeedback] = useState(update.managerFeedback);
  const [error, setError] = useState("");

  if (update.reviewStatus !== "PENDING") return null;

  const submit = async (status: "APPROVED" | "CHANGES_REQUESTED") => {
    try {
      setError("");
      await onReview(update.id, status, feedback);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Update review could not be saved.");
    }
  };

  return <div className="v2-review-update__actions">
    <label className="v2-field"><span>Manager feedback</span><textarea className="v2-textarea" value={feedback} onChange={(event) => setFeedback(event.target.value)} /></label>
    {error && <p className="v2-form-error">{error}</p>}
    <div><V2Button type="button" isLoading={saving} onClick={() => void submit("APPROVED")}>Approve update</V2Button><V2Button type="button" variant="secondary" isLoading={saving} onClick={() => void submit("CHANGES_REQUESTED")}>Request changes</V2Button></div>
  </div>;
}
