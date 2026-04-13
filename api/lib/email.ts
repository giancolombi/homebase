import { Resend } from "resend";

const FROM_EMAIL = process.env.FROM_EMAIL || "Homebase <onboarding@resend.dev>";

// Lazy initialization — don't crash on startup if key is missing
let resend: Resend | null = null;

function getResend(): Resend {
  if (!resend) {
    const key = process.env.RESEND_API_KEY;
    if (!key) {
      throw new Error(
        "RESEND_API_KEY is not set. Add it to your environment variables.",
      );
    }
    resend = new Resend(key);
  }
  return resend;
}

export async function sendInviteEmail(options: {
  to: string;
  inviterName: string;
  familyName: string;
  inviteUrl: string;
}): Promise<void> {
  const { to, inviterName, familyName, inviteUrl } = options;

  await getResend().emails.send({
    from: FROM_EMAIL,
    to,
    subject: `${inviterName} invited you to join ${familyName} on Homebase`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <div style="display: inline-block; width: 48px; height: 48px; background: #e0f2f1; border-radius: 12px; line-height: 48px; font-size: 24px;">🏠</div>
          <h1 style="font-size: 20px; font-weight: 600; margin: 12px 0 4px;">You're invited to Homebase</h1>
          <p style="color: #6b7280; font-size: 14px; margin: 0;">Your family's command center</p>
        </div>
        <p style="font-size: 15px; color: #1f2937; line-height: 1.6;">
          <strong>${inviterName}</strong> has invited you to join
          <strong>${familyName}</strong> on Homebase — a shared space for
          calendars, tasks, meals, and more.
        </p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${inviteUrl}" style="display: inline-block; background: #5eead4; color: #0f172a; font-weight: 600; font-size: 15px; padding: 12px 32px; border-radius: 8px; text-decoration: none;">
            Accept Invite
          </a>
        </div>
        <p style="font-size: 13px; color: #9ca3af; line-height: 1.5;">
          This invite expires in 7 days. If you didn't expect this email, you can safely ignore it.
        </p>
      </div>
    `,
  });
}
