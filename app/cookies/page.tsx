import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cookie Policy | Hey Garlic",
  description: "Cookie Policy for Hey Garlic - How we use cookies and tracking technologies",
};

export default function CookiePolicyPage() {
  return (
    <div className="container max-w-4xl py-12">
      <h1 className="text-4xl font-bold mb-8">Cookie Policy</h1>
      
      <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6">
        <p className="text-muted-foreground">
          Last updated: November 3, 2026
        </p>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">1. What Are Cookies?</h2>
          <p>
            Cookies are small text files that are stored on your device (computer, tablet, or mobile) 
            when you visit a website. They help websites remember your preferences, understand how you use 
            the site, and provide a better experience.
          </p>
          <p>
            This Cookie Policy explains how Hey Garlic ("we," "us," or "our") uses cookies and similar 
            tracking technologies on our recipe-sharing platform.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">2. Types of Cookies We Use</h2>

          <h3 className="text-xl font-semibold">2.1 Essential Cookies</h3>
          <p>
            These cookies are necessary for the Service to function and cannot be disabled. 
            They enable core functionality such as security, authentication, and session management.
          </p>
          <div className="bg-muted p-4 rounded-lg">
            <p className="font-semibold mb-2">Examples:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Authentication tokens:</strong> Keep you logged in between page visits</li>
              <li><strong>Session cookies:</strong> Maintain your session during your visit</li>
              <li><strong>Security cookies:</strong> Detect authentication abuse and protect against CSRF attacks</li>
              <li><strong>Load balancing:</strong> Ensure requests are routed to the correct server</li>
            </ul>
          </div>

          <h3 className="text-xl font-semibold mt-4">2.2 Functional Cookies</h3>
          <p>
            These cookies enhance functionality and personalization. The Service can function without them, 
            but you may have a degraded experience.
          </p>
          <div className="bg-muted p-4 rounded-lg">
            <p className="font-semibold mb-2">Examples:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Theme preferences:</strong> Remember if you prefer light or dark mode</li>
              <li><strong>Language settings:</strong> Store your language preference</li>
              <li><strong>Display preferences:</strong> Remember your layout choices (grid/list view)</li>
              <li><strong>Notification settings:</strong> Track which notifications you've dismissed</li>
            </ul>
          </div>

          <h3 className="text-xl font-semibold mt-4">2.3 Analytics Cookies</h3>
          <p>
            These cookies help us understand how users interact with the Service by collecting 
            anonymous information about page visits, traffic sources, and user behavior.
          </p>
          <div className="bg-muted p-4 rounded-lg">
            <p className="font-semibold mb-2">Examples:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Page views:</strong> Track which pages are most visited</li>
              <li><strong>User journey:</strong> Understand navigation patterns</li>
              <li><strong>Performance metrics:</strong> Measure page load times and errors</li>
              <li><strong>Feature usage:</strong> Track which features are used most often</li>
            </ul>
          </div>

          <h3 className="text-xl font-semibold mt-4">2.4 Performance Cookies</h3>
          <p>
            These cookies collect information about how you use the Service to help us improve performance 
            and identify technical issues.
          </p>
          <div className="bg-muted p-4 rounded-lg">
            <p className="font-semibold mb-2">Examples:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Error logging:</strong> Capture JavaScript errors for debugging</li>
              <li><strong>Speed monitoring:</strong> Track page load and API response times</li>
              <li><strong>Resource optimization:</strong> Identify slow-loading resources</li>
            </ul>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">3. Third-Party Cookies</h2>
          <p>
            We may use third-party services that set their own cookies. These services help us provide 
            and improve the Service.
          </p>

          <h3 className="text-xl font-semibold">3.1 Authentication Services</h3>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Supabase:</strong> Manages user authentication and sessions</li>
          </ul>

          <h3 className="text-xl font-semibold mt-4">3.2 Hosting and CDN</h3>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Vercel:</strong> Hosts the Service and delivers content efficiently</li>
          </ul>

          <h3 className="text-xl font-semibold mt-4">3.3 Analytics (if enabled)</h3>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Analytics providers:</strong> Anonymized usage statistics and insights</li>
          </ul>

          <p className="text-muted-foreground mt-4">
            These third parties have their own privacy policies. We recommend reviewing them:
          </p>
          <ul className="list-none space-y-2 mt-2">
            <li>
              • <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                Supabase Privacy Policy
              </a>
            </li>
            <li>
              • <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                Vercel Privacy Policy
              </a>
            </li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">4. Cookie Duration</h2>

          <h3 className="text-xl font-semibold">4.1 Session Cookies</h3>
          <p>
            These cookies are temporary and are deleted when you close your browser. 
            They help maintain your session during a single visit.
          </p>

          <h3 className="text-xl font-semibold mt-4">4.2 Persistent Cookies</h3>
          <p>
            These cookies remain on your device for a set period or until you delete them. 
            They remember your preferences across multiple visits.
          </p>
          <div className="bg-muted p-4 rounded-lg mt-2">
            <p className="font-semibold mb-2">Typical Duration:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Authentication:</strong> 30 days (or until logout)</li>
              <li><strong>Preferences:</strong> 1 year</li>
              <li><strong>Analytics:</strong> 2 years</li>
            </ul>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">5. How to Control Cookies</h2>

          <h3 className="text-xl font-semibold">5.1 Browser Settings</h3>
          <p>
            Most web browsers allow you to control cookies through their settings. You can:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>View what cookies are stored and delete them individually</li>
            <li>Block third-party cookies</li>
            <li>Block all cookies (may affect functionality)</li>
            <li>Delete all cookies when you close your browser</li>
            <li>Receive notifications when cookies are set</li>
          </ul>

          <p className="mt-4">Browser-specific instructions:</p>
          <ul className="list-none space-y-2 mt-2">
            <li>
              • <a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                Google Chrome
              </a>
            </li>
            <li>
              • <a href="https://support.mozilla.org/en-US/kb/enhanced-tracking-protection-firefox-desktop" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                Mozilla Firefox
              </a>
            </li>
            <li>
              • <a href="https://support.apple.com/guide/safari/manage-cookies-sfri11471/mac" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                Safari
              </a>
            </li>
            <li>
              • <a href="https://support.microsoft.com/en-us/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                Microsoft Edge
              </a>
            </li>
          </ul>

          <h3 className="text-xl font-semibold mt-4">5.2 Do Not Track (DNT)</h3>
          <p>
            Some browsers have a "Do Not Track" feature that signals to websites that you do not want to be tracked. 
            Currently, there is no universal standard for how websites should respond to DNT signals.
          </p>

          <h3 className="text-xl font-semibold mt-4">5.3 Mobile Devices</h3>
          <p>
            Mobile devices have settings to limit ad tracking:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>iOS:</strong> Settings → Privacy → Tracking → "Allow Apps to Request to Track"</li>
            <li><strong>Android:</strong> Settings → Google → Ads → "Opt out of Ads Personalization"</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">6. Impact of Disabling Cookies</h2>
          <p>
            Blocking or deleting cookies may affect your experience on Hey Garlic:
          </p>

          <div className="bg-yellow-50 dark:bg-yellow-950 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <p className="font-semibold mb-2">If you disable essential cookies:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>You will not be able to log in or maintain a session</li>
              <li>Security features may not work properly</li>
              <li>The Service may not function as intended</li>
            </ul>
          </div>

          <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800 mt-4">
            <p className="font-semibold mb-2">If you disable functional cookies:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Your preferences (theme, language) won't be saved</li>
              <li>You may need to re-enter preferences on each visit</li>
              <li>Some features may have limited functionality</li>
            </ul>
          </div>

          <div className="bg-muted p-4 rounded-lg mt-4">
            <p className="font-semibold mb-2">If you disable analytics/performance cookies:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>The Service will still work normally</li>
              <li>We won't be able to improve based on usage patterns</li>
              <li>We may not detect performance issues affecting you</li>
            </ul>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">7. Other Tracking Technologies</h2>

          <h3 className="text-xl font-semibold">7.1 Local Storage</h3>
          <p>
            We use browser local storage to save application state and user preferences. 
            This is similar to cookies but can store more data and doesn't expire automatically.
          </p>

          <h3 className="text-xl font-semibold mt-4">7.2 Web Beacons</h3>
          <p>
            We may use small transparent images (web beacons or pixels) in emails to track 
            whether messages have been opened or links clicked.
          </p>

          <h3 className="text-xl font-semibold mt-4">7.3 Server Logs</h3>
          <p>
            Our servers automatically log information about your visit, including IP address, 
            browser type, referring URLs, and pages viewed.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">8. Updates to This Policy</h2>
          <p>
            We may update this Cookie Policy from time to time to reflect changes in technology, 
            legislation, or our practices. We will notify you of significant changes by posting the 
            updated policy on this page and updating the "Last updated" date.
          </p>
          <p>
            We encourage you to review this policy periodically to stay informed about how we use cookies.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">9. Contact Us</h2>
          <p>
            If you have questions about our use of cookies or this Cookie Policy, please contact us:
          </p>
          <ul className="list-none space-y-2">
            <li><strong>Email:</strong> <a href="mailto:privacy@heygarlic.com" className="text-primary hover:underline">privacy@heygarlic.com</a></li>
            <li><strong>Support:</strong> <a href="/contact" className="text-primary hover:underline">Contact Form</a></li>
          </ul>
        </section>

        <section className="space-y-4 mt-12 pt-8 border-t">
          <h2 className="text-2xl font-semibold">Cookie Table</h2>
          <p className="text-muted-foreground mb-4">
            Below is a detailed list of cookies we use:
          </p>

          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse border border-border">
              <thead className="bg-muted">
                <tr>
                  <th className="border border-border px-4 py-2 text-left">Cookie Name</th>
                  <th className="border border-border px-4 py-2 text-left">Type</th>
                  <th className="border border-border px-4 py-2 text-left">Purpose</th>
                  <th className="border border-border px-4 py-2 text-left">Duration</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-border px-4 py-2"><code>sb-access-token</code></td>
                  <td className="border border-border px-4 py-2">Essential</td>
                  <td className="border border-border px-4 py-2">User authentication</td>
                  <td className="border border-border px-4 py-2">30 days</td>
                </tr>
                <tr>
                  <td className="border border-border px-4 py-2"><code>sb-refresh-token</code></td>
                  <td className="border border-border px-4 py-2">Essential</td>
                  <td className="border border-border px-4 py-2">Session refresh</td>
                  <td className="border border-border px-4 py-2">30 days</td>
                </tr>
                <tr>
                  <td className="border border-border px-4 py-2"><code>theme</code></td>
                  <td className="border border-border px-4 py-2">Functional</td>
                  <td className="border border-border px-4 py-2">Dark/light mode preference</td>
                  <td className="border border-border px-4 py-2">1 year</td>
                </tr>
                <tr>
                  <td className="border border-border px-4 py-2"><code>language</code></td>
                  <td className="border border-border px-4 py-2">Functional</td>
                  <td className="border border-border px-4 py-2">Language preference</td>
                  <td className="border border-border px-4 py-2">1 year</td>
                </tr>
                <tr>
                  <td className="border border-border px-4 py-2"><code>_ga</code></td>
                  <td className="border border-border px-4 py-2">Analytics</td>
                  <td className="border border-border px-4 py-2">Google Analytics identifier</td>
                  <td className="border border-border px-4 py-2">2 years</td>
                </tr>
                <tr>
                  <td className="border border-border px-4 py-2"><code>_gid</code></td>
                  <td className="border border-border px-4 py-2">Analytics</td>
                  <td className="border border-border px-4 py-2">Google Analytics session</td>
                  <td className="border border-border px-4 py-2">24 hours</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
