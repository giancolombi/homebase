export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background px-4 py-12">
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Privacy Policy
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Last updated: April 12, 2026
          </p>
        </div>

        <div className="space-y-6 text-sm text-foreground leading-relaxed">
          <section>
            <h2 className="text-base font-semibold mb-2">What is Homebase?</h2>
            <p>
              Homebase is a family organization app that helps families manage
              calendars, tasks, meals, and finances in one place. It is operated
              by Gian Colombi.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-2">
              What data we collect
            </h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>Account information:</strong> email address, name, and a
                hashed password when you sign up.
              </li>
              <li>
                <strong>Family data:</strong> family member names, calendar
                events, tasks, meal plans, and financial summaries you create
                within the app.
              </li>
              <li>
                <strong>Calendar data:</strong> if you connect Google Calendar
                or Outlook, we read your calendar events in read-only mode to
                display them in the app. We do not modify your external
                calendars.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-2">
              How we use your data
            </h2>
            <p>
              Your data is used solely to provide the Homebase service to you
              and your family. We do not sell, share, or monetize your personal
              data. Specifically:
            </p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>
                Calendar events are fetched and displayed within Homebase only.
              </li>
              <li>
                OAuth tokens for Google and Microsoft are encrypted at rest
                using AES-256-GCM and are never exposed to other users.
              </li>
              <li>
                Passwords are hashed with Argon2 and never stored in plaintext.
              </li>
              <li>
                We do not use analytics, tracking, or advertising services.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-2">Data storage</h2>
            <p>
              Your data is stored in a PostgreSQL database hosted on Railway
              (US-based infrastructure). Data is transmitted over HTTPS.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-2">
              Third-party services
            </h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>Google Calendar API:</strong> used to read your calendar
                events when you connect your Google account. Subject to{" "}
                <a
                  href="https://policies.google.com/privacy"
                  className="text-primary underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Google's Privacy Policy
                </a>
                .
              </li>
              <li>
                <strong>Microsoft Graph API:</strong> used to read your Outlook
                calendar events when you connect your Microsoft account.
              </li>
              <li>
                <strong>Resend:</strong> used to send invite emails to family
                members.
              </li>
              <li>
                <strong>Railway:</strong> used to host the application and
                database.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-2">Your rights</h2>
            <p>You can:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>
                Disconnect your Google or Outlook calendar at any time from
                Settings.
              </li>
              <li>Delete your account by contacting us.</li>
              <li>
                Revoke Homebase's access to your Google account at{" "}
                <a
                  href="https://myaccount.google.com/permissions"
                  className="text-primary underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  myaccount.google.com/permissions
                </a>
                .
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-2">Contact</h2>
            <p>
              For questions about this privacy policy, contact{" "}
              <a
                href="mailto:giancolombi@gmail.com"
                className="text-primary underline"
              >
                giancolombi@gmail.com
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
