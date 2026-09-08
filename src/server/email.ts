import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { resend } from "@/lib/resend.server";

// Input validation schema using Zod
const emailInputSchema = z.object({
  to: z.union([z.string(), z.array(z.string())]),
  subject: z.string(),
  html: z.string(),
});

export const sendEmailFn = createServerFn({ method: "POST" })
  .validator(emailInputSchema)
  .handler(async ({ data }) => {
    // This code strictly runs on the server
    const { to, subject, html } = data;

    try {
      const response = await resend.emails.send({
        from: "care@nurturetheroots.co",
        to,
        subject,
        html,
      });

      if (response.error) {
        console.error("[Resend] Email API error:", response.error);
        throw new Error(response.error.message || "Failed to send email");
      }

      return { success: true, data: response.data };
    } catch (error) {
      console.error("[Resend] Exception inside server function:", error);
      throw error instanceof Error
        ? error
        : new Error("An unexpected error occurred while sending email");
    }
  });
