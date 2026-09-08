import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { resend } from "../lib/resend.server";

// Input validation schema using Zod
const emailPayloadSchema = z.object({
  to: z.string().email(),
  subject: z.string(),
  html: z.string(),
});

export const sendEmailFn = createServerFn({ method: "POST" })
  .validator(emailPayloadSchema)
  .handler(async ({ data }) => {
    try {
      const response = await resend.emails.send({
        from: "Vela Support <care@nurturetheroots.co>",
        to: data.to,
        subject: data.subject,
        html: data.html,
      });

      if (response.error) {
        console.error("[Resend] Email API error:", response.error);
        return { success: false, error: response.error };
      }

      return { success: true, id: response.data?.id };
    } catch (error: any) {
      console.error("[Resend] Exception inside server function:", error);
      return { success: false, error: error };
    }
  });

export async function sendWelcomeEmail(toEmail: string) {
  const subject = "Welcome to Vela - Support from the Start";
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Welcome to Vela</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            line-height: 1.6;
            color: #1a1a1a;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          h1 {
            color: #2e7d32;
            font-size: 24px;
            margin-bottom: 20px;
          }
          p {
            margin-bottom: 16px;
            font-size: 16px;
          }
          .footer {
            margin-top: 32px;
            padding-top: 16px;
            border-top: 1px solid #e0e0e0;
            font-size: 14px;
            color: #666666;
          }
        </style>
      </head>
      <body>
        <h1>Welcome to Vela!</h1>
        <p>We're thrilled to welcome you to our community. At Vela, we are dedicated to providing support from the start for every family.</p>
        <p>Our application is designed to help you organize daily care, track developmental milestones, and seamlessly coordinate with caregivers and pediatricians.</p>
        <p>If you have any questions or need support, we are always here to help.</p>
        <p>Warmest wishes,<br/><strong>The Vela Support Team</strong></p>
        <div class="footer">
          <p>This email was sent to you because you recently signed up for Vela. If you did not sign up, please disregard this email.</p>
        </div>
      </body>
    </html>
  `;

  return sendEmailFn({ data: { to: toEmail, subject, html } });
}
