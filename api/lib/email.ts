import { Resend } from "resend";

const FROM_EMAIL = process.env.FROM_EMAIL || "Homebase <onboarding@resend.dev>";

// Lazy initialization — don't crash on startup if key is missing
let resend: Resend | null = null;

function getResend(): Resend | null {
  if (resend) return resend;
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  resend = new Resend(key);
  return resend;
}

/**
 * Send an email via Resend, or log it to the console when RESEND_API_KEY is
 * not configured (dev fallback). Returns whether the email was actually sent.
 */
async function sendOrLog(options: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ sent: boolean }> {
  const client = getResend();
  if (!client) {
    console.log(
      `[email dev-fallback] to=${options.to} subject=${options.subject}`,
    );
    return { sent: false };
  }
  await client.emails.send({
    from: FROM_EMAIL,
    to: options.to,
    subject: options.subject,
    html: options.html,
  });
  return { sent: true };
}

export async function sendInviteEmail(options: {
  to: string;
  inviterName: string;
  familyName: string;
  inviteUrl: string;
}): Promise<{ sent: boolean }> {
  const { to, inviterName, familyName, inviteUrl } = options;

  return sendOrLog({
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

export async function sendWelcomeEmail(options: {
  to: string;
  fullName: string | null;
  appUrl: string;
}): Promise<{ sent: boolean }> {
  const { to, fullName, appUrl } = options;
  const greeting = fullName ? `Hi ${fullName.split(" ")[0]},` : "Hi,";

  return sendOrLog({
    to,
    subject: "Welcome to Homebase",
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <div style="display: inline-block; width: 48px; height: 48px; background: #e0f2f1; border-radius: 12px; line-height: 48px; font-size: 24px;">🏠</div>
          <h1 style="font-size: 20px; font-weight: 600; margin: 12px 0 4px;">Welcome to Homebase</h1>
          <p style="color: #6b7280; font-size: 14px; margin: 0;">Your family's command center</p>
        </div>
        <p style="font-size: 15px; color: #1f2937; line-height: 1.6;">${greeting}</p>
        <p style="font-size: 15px; color: #1f2937; line-height: 1.6;">
          Thanks for signing up. Homebase keeps your family's calendar, tasks,
          meals, and finances in one shared place. From here, you can finish
          setting up your family and connect your calendars.
        </p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${appUrl}" style="display: inline-block; background: #5eead4; color: #0f172a; font-weight: 600; font-size: 15px; padding: 12px 32px; border-radius: 8px; text-decoration: none;">
            Open Homebase
          </a>
        </div>
        <p style="font-size: 13px; color: #9ca3af; line-height: 1.5;">
          Didn't sign up? Reply to this email and we'll sort it out.
        </p>
      </div>
    `,
  });
}

export async function sendPasswordChangedEmail(options: {
  to: string;
}): Promise<{ sent: boolean }> {
  const { to } = options;

  return sendOrLog({
    to,
    subject: "Your Homebase password was changed",
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <div style="display: inline-block; width: 48px; height: 48px; background: #e0f2f1; border-radius: 12px; line-height: 48px; font-size: 24px;">🔒</div>
          <h1 style="font-size: 20px; font-weight: 600; margin: 12px 0 4px;">Password updated</h1>
        </div>
        <p style="font-size: 15px; color: #1f2937; line-height: 1.6;">
          Your Homebase password was just changed. If this was you, you're
          all set.
        </p>
        <p style="font-size: 15px; color: #1f2937; line-height: 1.6;">
          If you <strong>didn't</strong> make this change, reset your
          password immediately and email us — your account may be at risk.
        </p>
        <p style="font-size: 13px; color: #9ca3af; line-height: 1.5; margin-top: 32px;">
          You're receiving this because someone changed the password on the
          Homebase account associated with this email.
        </p>
      </div>
    `,
  });
}

export async function sendInviteAcceptedEmail(options: {
  to: string;
  inviteeName: string;
  inviteeEmail: string;
  familyName: string;
}): Promise<{ sent: boolean }> {
  const { to, inviteeName, inviteeEmail, familyName } = options;

  return sendOrLog({
    to,
    subject: `${inviteeName} joined ${familyName} on Homebase`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <div style="display: inline-block; width: 48px; height: 48px; background: #e0f2f1; border-radius: 12px; line-height: 48px; font-size: 24px;">🎉</div>
          <h1 style="font-size: 20px; font-weight: 600; margin: 12px 0 4px;">${inviteeName} just joined</h1>
        </div>
        <p style="font-size: 15px; color: #1f2937; line-height: 1.6;">
          <strong>${inviteeName}</strong> (${inviteeEmail}) accepted their
          invite and is now part of <strong>${familyName}</strong>. They can
          start sharing calendars, tasks, and meal plans with you right away.
        </p>
      </div>
    `,
  });
}

export async function sendPasswordResetEmail(options: {
  to: string;
  resetUrl: string;
}): Promise<{ sent: boolean }> {
  const { to, resetUrl } = options;

  return sendOrLog({
    to,
    subject: "Reset your Homebase password",
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <div style="display: inline-block; width: 48px; height: 48px; background: #e0f2f1; border-radius: 12px; line-height: 48px; font-size: 24px;">🏠</div>
          <h1 style="font-size: 20px; font-weight: 600; margin: 12px 0 4px;">Reset your password</h1>
          <p style="color: #6b7280; font-size: 14px; margin: 0;">We got a request to reset your Homebase password.</p>
        </div>
        <p style="font-size: 15px; color: #1f2937; line-height: 1.6;">
          Click the button below to choose a new password. This link will expire in 1 hour.
        </p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${resetUrl}" style="display: inline-block; background: #5eead4; color: #0f172a; font-weight: 600; font-size: 15px; padding: 12px 32px; border-radius: 8px; text-decoration: none;">
            Reset Password
          </a>
        </div>
        <p style="font-size: 13px; color: #9ca3af; line-height: 1.5;">
          If you didn't request this, you can safely ignore this email — your password will stay the same.
        </p>
      </div>
    `,
  });
}
