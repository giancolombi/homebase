export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background px-4 py-12">
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Terms of Service
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Last updated: May 3, 2026
          </p>
        </div>

        <div className="space-y-6 text-sm text-foreground leading-relaxed">
          <section>
            <h2 className="text-base font-semibold mb-2">
              Acceptance of terms
            </h2>
            <p>
              By creating an account or using Homebase, you agree to these Terms
              of Service. If you do not agree, please do not use the service.
              Homebase is operated by Gian Colombi.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-2">
              Description of the service
            </h2>
            <p>
              Homebase is a family organization app that lets you and your
              family manage shared calendars, tasks, meal plans, and financial
              summaries in one place. The service is provided as-is and may be
              updated, modified, or discontinued at any time.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-2">Your account</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                You must provide accurate information when creating an account.
              </li>
              <li>
                You are responsible for keeping your password secure and for all
                activity under your account.
              </li>
              <li>
                You must be at least 13 years old to create an account. Adults
                are responsible for any child profiles they create within their
                family.
              </li>
              <li>You may delete your account at any time by contacting us.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-2">Acceptable use</h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>
                Use Homebase for any unlawful purpose or in violation of any
                applicable laws.
              </li>
              <li>
                Attempt to gain unauthorized access to other users' accounts or
                families.
              </li>
              <li>
                Reverse-engineer, decompile, scrape, or otherwise abuse the
                service.
              </li>
              <li>
                Upload or share content that is illegal, abusive, or infringes
                on the rights of others.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-2">
              Third-party integrations
            </h2>
            <p>
              Homebase integrates with Google Calendar, Microsoft Outlook, Plaid
              (for banking), and Resend (for email). Your use of these
              integrations is also governed by the respective provider's terms
              of service. Homebase is not responsible for the availability,
              accuracy, or behavior of third-party services.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-2">Data and privacy</h2>
            <p>
              Your use of Homebase is also governed by our{" "}
              <a href="/privacy" className="text-primary underline">
                Privacy Policy
              </a>
              , which describes how we collect, use, and protect your data.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-2">
              Disclaimer of warranties
            </h2>
            <p>
              Homebase is provided "as is" without warranties of any kind,
              express or implied. We do not guarantee that the service will be
              uninterrupted, error-free, or that any data will be preserved
              indefinitely. You are responsible for keeping your own backups of
              important information.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-2">
              Limitation of liability
            </h2>
            <p>
              To the maximum extent permitted by law, Homebase and its operator
              shall not be liable for any indirect, incidental, special, or
              consequential damages arising from your use of the service.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-2">Termination</h2>
            <p>
              We may suspend or terminate your access to Homebase at any time if
              you violate these terms or misuse the service. You may stop using
              the service at any time by deleting your account.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-2">
              Changes to these terms
            </h2>
            <p>
              We may update these terms from time to time. The updated version
              will be posted on this page with a new "Last updated" date.
              Continued use of the service after changes are posted means you
              accept the updated terms.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-2">Contact</h2>
            <p>
              For questions about these terms, contact{" "}
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
