import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Hey Garlic",
  description: "Privacy Policy for Hey Garlic - How we collect, use, and protect your data",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="container max-w-4xl py-12">
      <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
      
      <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6">
        <p className="text-muted-foreground">
          Last updated: November 3, 2026
        </p>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">1. Introduction</h2>
          <p>
            Welcome to Hey Garlic ("we," "our," or "us"). We respect your privacy and are committed to protecting your personal data. 
            This privacy policy explains how we collect, use, disclose, and safeguard your information when you use our recipe-sharing platform.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">2. Information We Collect</h2>
          
          <h3 className="text-xl font-semibold">2.1 Information You Provide</h3>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Account Information:</strong> Email address, username, display name, password (encrypted), and optional profile information</li>
            <li><strong>Profile Data:</strong> Avatar image, bio, dietary preferences, and social links</li>
            <li><strong>Recipe Content:</strong> Recipe titles, descriptions, ingredients, instructions, images, and metadata</li>
            <li><strong>Social Interactions:</strong> Comments, replies, likes, follows, and saved recipes</li>
            <li><strong>Communications:</strong> Messages you send through our contact form or support channels</li>
          </ul>

          <h3 className="text-xl font-semibold mt-4">2.2 Automatically Collected Information</h3>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Usage Data:</strong> Pages viewed, features used, search queries, and interaction patterns</li>
            <li><strong>Device Information:</strong> Browser type, operating system, IP address, and device identifiers</li>
            <li><strong>Cookies:</strong> Authentication tokens, preferences, and analytics data (see Cookie Policy)</li>
            <li><strong>Performance Data:</strong> Error logs and performance metrics for service improvement</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">3. How We Use Your Information</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Service Delivery:</strong> To provide, maintain, and improve Hey Garlic's features and functionality</li>
            <li><strong>Authentication:</strong> To verify your identity and manage your account</li>
            <li><strong>Personalization:</strong> To customize your experience, including recipe recommendations</li>
            <li><strong>Communications:</strong> To send notifications about activity on your recipes and account</li>
            <li><strong>Safety & Security:</strong> To detect fraud, abuse, and security threats</li>
            <li><strong>Analytics:</strong> To understand usage patterns and improve our services</li>
            <li><strong>Legal Compliance:</strong> To comply with legal obligations and enforce our terms</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">4. Information Sharing</h2>
          <p>We do not sell your personal information. We may share your information in the following circumstances:</p>
          
          <h3 className="text-xl font-semibold">4.1 Public Information</h3>
          <ul className="list-disc pl-6 space-y-2">
            <li>Your public profile (username, avatar, bio) is visible to all users</li>
            <li>Recipes you create are public and visible to anyone on the platform</li>
            <li>Comments, likes, and follows are visible to other users</li>
          </ul>

          <h3 className="text-xl font-semibold mt-4">4.2 Service Providers</h3>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Supabase:</strong> Database and authentication services</li>
            <li><strong>Vercel:</strong> Hosting and content delivery</li>
            <li><strong>Email Services:</strong> Transactional email delivery</li>
            <li><strong>Analytics:</strong> Aggregated usage analytics (anonymized)</li>
          </ul>

          <h3 className="text-xl font-semibold mt-4">4.3 Legal Requirements</h3>
          <p>
            We may disclose your information if required by law, court order, or to protect the rights, 
            property, or safety of Hey Garlic, our users, or the public.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">5. Data Security</h2>
          <p>We implement industry-standard security measures to protect your data:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Passwords are hashed and encrypted using bcrypt</li>
            <li>Data transmission is secured via HTTPS/TLS encryption</li>
            <li>Database access is restricted with Row Level Security (RLS) policies</li>
            <li>Regular security audits and vulnerability assessments</li>
            <li>Rate limiting to prevent abuse and unauthorized access</li>
          </ul>
          <p className="text-muted-foreground">
            However, no method of transmission over the internet is 100% secure. 
            While we strive to protect your data, we cannot guarantee absolute security.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">6. Your Rights</h2>
          <p>Depending on your location, you may have the following rights:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Access:</strong> Request a copy of your personal data</li>
            <li><strong>Correction:</strong> Update or correct inaccurate information</li>
            <li><strong>Deletion:</strong> Request deletion of your account and data</li>
            <li><strong>Portability:</strong> Receive your data in a portable format</li>
            <li><strong>Objection:</strong> Object to certain processing of your data</li>
            <li><strong>Withdrawal:</strong> Withdraw consent for data processing</li>
          </ul>
          <p>
            To exercise these rights, please contact us at <a href="mailto:privacy@heygarlic.com" className="text-primary hover:underline">privacy@heygarlic.com</a>
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">7. Data Retention</h2>
          <p>
            We retain your personal data for as long as your account is active or as needed to provide services. 
            When you delete your account:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Your profile and personal data are deleted within 30 days</li>
            <li>Public recipes may be anonymized (author removed) or deleted</li>
            <li>Backup copies are deleted within 90 days</li>
            <li>Some data may be retained for legal compliance (e.g., financial records)</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">8. Children's Privacy</h2>
          <p>
            Hey Garlic is not intended for children under 13 years of age. We do not knowingly collect 
            personal information from children. If you believe we have collected data from a child, 
            please contact us immediately.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">9. Cookies and Tracking</h2>
          <p>We use cookies and similar technologies for:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Essential Cookies:</strong> Authentication, security, and session management</li>
            <li><strong>Functional Cookies:</strong> User preferences and settings</li>
            <li><strong>Analytics Cookies:</strong> Usage statistics and performance monitoring</li>
          </ul>
          <p>
            You can control cookies through your browser settings. Note that disabling certain cookies 
            may affect functionality.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">10. International Data Transfers</h2>
          <p>
            Your data may be transferred to and processed in countries other than your own. 
            We ensure appropriate safeguards are in place to protect your data in accordance with 
            this privacy policy and applicable laws.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">11. Changes to This Policy</h2>
          <p>
            We may update this privacy policy from time to time. We will notify you of significant changes 
            by posting the new policy on this page and updating the "Last updated" date. 
            Your continued use of Hey Garlic after changes constitutes acceptance of the updated policy.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">12. Contact Us</h2>
          <p>If you have questions about this privacy policy or our data practices, please contact us:</p>
          <ul className="list-none space-y-2">
            <li><strong>Email:</strong> <a href="mailto:privacy@heygarlic.com" className="text-primary hover:underline">privacy@heygarlic.com</a></li>
            <li><strong>Support:</strong> <a href="/contact" className="text-primary hover:underline">Contact Form</a></li>
          </ul>
        </section>

        <section className="space-y-4 mt-12 pt-8 border-t">
          <h2 className="text-2xl font-semibold">GDPR Compliance (EU Users)</h2>
          <p>
            If you are in the European Economic Area (EEA), you have additional rights under the 
            General Data Protection Regulation (GDPR):
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Right to be informed about data collection and use</li>
            <li>Right to access your personal data</li>
            <li>Right to rectification of inaccurate data</li>
            <li>Right to erasure ("right to be forgotten")</li>
            <li>Right to restrict processing</li>
            <li>Right to data portability</li>
            <li>Right to object to processing</li>
            <li>Rights related to automated decision-making</li>
          </ul>
          <p>
            Our lawful basis for processing your data includes consent, contract performance, 
            legal obligations, and legitimate interests.
          </p>
        </section>

        <section className="space-y-4 mt-8">
          <h2 className="text-2xl font-semibold">CCPA Compliance (California Users)</h2>
          <p>
            If you are a California resident, you have rights under the California Consumer Privacy Act (CCPA):
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Right to know what personal information is collected</li>
            <li>Right to know if personal information is sold or disclosed</li>
            <li>Right to say no to the sale of personal information (we don't sell your data)</li>
            <li>Right to access your personal information</li>
            <li>Right to equal service and price</li>
            <li>Right to request deletion of personal information</li>
          </ul>
          <p>
            To exercise these rights, contact us at <a href="mailto:privacy@heygarlic.com" className="text-primary hover:underline">privacy@heygarlic.com</a>
          </p>
        </section>
      </div>
    </div>
  );
}
