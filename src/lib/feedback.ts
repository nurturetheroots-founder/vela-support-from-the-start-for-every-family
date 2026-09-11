import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { auth, db, isFirebaseConfigured } from "@/lib/firebase";

export const FEEDBACK_COLLECTION = "beta_feedback";

export type SendResult = { ok: true } | { ok: false; reason: "not-configured" | "failed" };

export interface FeedbackDraft {
  message: string;
  /** Optional — a tester can leave this blank and still be heard. */
  email?: string;
  /** Which screen she was on, so a vague report is still findable. */
  pagePath: string;
}

/**
 * Sends one piece of beta feedback.
 *
 * Never throws. A tester who has taken the trouble to write something must be
 * told plainly whether it arrived — a silent failure is worse than no button at
 * all, because she believes she has been heard when she has not. The caller
 * surfaces `reason` so she can copy her words out rather than lose them.
 *
 * Only what she typed, the screen she was on, and her account id if she has one
 * are stored. Nothing is read from her check-ins, screenings, or notes.
 */
export async function sendFeedback(draft: FeedbackDraft): Promise<SendResult> {
  if (!isFirebaseConfigured || !db) return { ok: false, reason: "not-configured" };
  try {
    await addDoc(collection(db, FEEDBACK_COLLECTION), {
      message: draft.message.trim(),
      email: draft.email?.trim() || null,
      page_path: draft.pagePath,
      user_id: auth?.currentUser?.uid ?? null,
      user_agent: typeof navigator === "undefined" ? null : navigator.userAgent,
      created_at: serverTimestamp(),
    });
    return { ok: true };
  } catch {
    return { ok: false, reason: "failed" };
  }
}
