import { useState } from "react";
import { MessageCircleHeart } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function BetaFeedbackDialog() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    const text = message.trim();
    if (!text) return;
    setSaving(true);
    try {
      const { data } = await supabase.auth.getUser();
      const { error } = await supabase.from("beta_feedback").insert({
        message: text,
        user_id: data.user?.id ?? null,
        page_path: typeof window !== "undefined" ? window.location.pathname : null,
      });
      if (error) throw error;
      setMessage("");
      setOpen(false);
      toast.success("Thank you — your thoughts are with us.");
    } catch {
      toast.error("That didn't send just now. Try once more in a moment.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="w-full flex items-center justify-center gap-2 py-3 min-h-11 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <MessageCircleHeart className="h-4 w-4" />
          <span>Beta Feedback</span>
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif">Share your thoughts</DialogTitle>
          <DialogDescription>
            Anything that felt helpful, confusing, or missing — we read every note.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="What's on your mind?"
          rows={5}
          className="resize-none"
        />
        <DialogFooter>
          <Button onClick={submit} disabled={saving || !message.trim()} className="min-h-11 w-full">
            {saving ? "Sending…" : "Send feedback"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
