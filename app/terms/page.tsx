import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | Hey Garlic",
  description: "Terms of Service for Hey Garlic - Rules and guidelines for using our platform",
};

export default function TermsOfServicePage() {
  return (
    <div className="container max-w-4xl py-12">
      <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>
      
      <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6">
        <p className="text-muted-foreground">
          Last updated: November 3, 2026
        </p>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">1. Acceptance of Terms</h2>
          <p>
            Welcome to Hey Garlic! By accessing or using our recipe-sharing platform ("Service"), 
            you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, 
            please do not use the Service.
          </p>
          <p>
            These Terms constitute a legally binding agreement between you and Hey Garlic ("we," "us," or "our"). 
            We reserve the right to modify these Terms at any time. Your continued use of the Service after 
            changes constitutes acceptance of the modified Terms.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">2. Eligibility</h2>
          <p>
            You must be at least 13 years old to use Hey Garlic. By using the Service, you represent and warrant that:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>You are at least 13 years of age</li>
            <li>You have the legal capacity to enter into these Terms</li>
            <li>You will comply with these Terms and all applicable laws</li>
            <li>You have not been previously banned from the Service</li>
          </ul>
          <p>
            If you are under 18, you represent that you have your parent or guardian's permission to use the Service.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">3. Account Registration</h2>
          <p>
            To access certain features, you must create an account. You agree to:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Provide accurate, current, and complete information during registration</li>
            <li>Maintain and promptly update your account information</li>
            <li>Keep your password secure and confidential</li>
            <li>Notify us immediately of any unauthorized use of your account</li>
            <li>Accept responsibility for all activities under your account</li>
          </ul>
          <p>
            We reserve the right to suspend or terminate accounts that violate these Terms or 
            contain false, fraudulent, or misleading information.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">4. User Content</h2>
          
          <h3 className="text-xl font-semibold">4.1 Content Ownership</h3>
          <p>
            You retain ownership of any content you post on Hey Garlic, including recipes, images, comments, 
            and other materials ("User Content"). By posting User Content, you grant Hey Garlic a 
            worldwide, non-exclusive, royalty-free, sublicensable, and transferable license to use, 
            reproduce, distribute, prepare derivative works of, display, and perform your User Content 
            in connection with the Service.
          </p>

          <h3 className="text-xl font-semibold mt-4">4.2 Content Standards</h3>
          <p>You agree that your User Content will not:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Violate any third-party rights, including copyright, trademark, privacy, or publicity rights</li>
            <li>Contain hate speech, discrimination, or harassment</li>
            <li>Include sexually explicit or violent content</li>
            <li>Promote illegal activities or substances</li>
            <li>Contain spam, malware, or phishing attempts</li>
            <li>Impersonate any person or entity</li>
            <li>Be false, misleading, or deceptive</li>
            <li>Violate any applicable laws or regulations</li>
          </ul>

          <h3 className="text-xl font-semibold mt-4">4.3 Content Moderation</h3>
          <p>
            We reserve the right to remove, edit, or refuse to post any User Content that violates these Terms 
            or that we deem inappropriate, offensive, or harmful. However, we are not obligated to monitor 
            User Content and are not responsible for content posted by users.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">5. Intellectual Property</h2>
          
          <h3 className="text-xl font-semibold">5.1 Service Content</h3>
          <p>
            The Service, including its design, layout, graphics, functionality, and code, is owned by 
            Hey Garlic and protected by copyright, trademark, and other intellectual property laws. 
            You may not copy, modify, distribute, sell, or lease any part of our Service without 
            express written permission.
          </p>

          <h3 className="text-xl font-semibold mt-4">5.2 Trademarks</h3>
          <p>
            "Hey Garlic" and related logos are trademarks of Hey Garlic. You may not use these trademarks 
            without our prior written consent.
          </p>

          <h3 className="text-xl font-semibold mt-4">5.3 Copyright Infringement</h3>
          <p>
            We respect intellectual property rights. If you believe that your work has been copied in a way 
            that constitutes copyright infringement, please contact us at{" "}
            <a href="mailto:dmca@heygarlic.com" className="text-primary hover:underline">dmca@heygarlic.com</a> with:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Identification of the copyrighted work</li>
            <li>Location of the infringing material on our Service</li>
            <li>Your contact information</li>
            <li>A statement of good faith belief that the use is unauthorized</li>
            <li>A statement that the information is accurate and you are authorized to act</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">6. Prohibited Conduct</h2>
          <p>You agree not to:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Use the Service for any illegal purpose or in violation of any laws</li>
            <li>Access or attempt to access accounts belonging to others</li>
            <li>Interfere with or disrupt the Service or servers</li>
            <li>Attempt to bypass security measures or rate limits</li>
            <li>Use automated systems (bots, scrapers) without permission</li>
            <li>Collect user information without consent</li>
            <li>Transmit viruses, malware, or harmful code</li>
            <li>Engage in spamming or unsolicited advertising</li>
            <li>Create multiple accounts to evade restrictions</li>
            <li>Manipulate metrics (fake likes, follows, etc.)</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">7. Third-Party Links and Services</h2>
          <p>
            The Service may contain links to third-party websites or services. We are not responsible 
            for the content, privacy policies, or practices of third-party sites. Your interactions 
            with third parties are solely between you and the third party.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">8. Disclaimer of Warranties</h2>
          <p>
            THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, 
            EITHER EXPRESS OR IMPLIED. WE DISCLAIM ALL WARRANTIES, INCLUDING BUT NOT LIMITED TO:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Merchantability and fitness for a particular purpose</li>
            <li>Non-infringement of third-party rights</li>
            <li>Accuracy, reliability, or completeness of content</li>
            <li>Uninterrupted or error-free operation</li>
            <li>Security or freedom from viruses</li>
          </ul>
          <p>
            We do not warrant that the Service will meet your requirements or that defects will be corrected.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">9. Limitation of Liability</h2>
          <p>
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, HEY GARLIC SHALL NOT BE LIABLE FOR ANY 
            INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Loss of profits, data, use, or goodwill</li>
            <li>Service interruptions or security breaches</li>
            <li>User content or conduct of other users</li>
            <li>Unauthorized access to your account or data</li>
          </ul>
          <p>
            OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID TO US IN THE PAST SIX MONTHS, 
            OR $100, WHICHEVER IS GREATER.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">10. Indemnification</h2>
          <p>
            You agree to indemnify, defend, and hold harmless Hey Garlic, its officers, directors, 
            employees, and agents from any claims, damages, losses, liabilities, and expenses 
            (including attorney fees) arising from:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Your use of the Service</li>
            <li>Your User Content</li>
            <li>Your violation of these Terms</li>
            <li>Your violation of any third-party rights</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">11. Termination</h2>
          
          <h3 className="text-xl font-semibold">11.1 By You</h3>
          <p>
            You may delete your account at any time through your account settings. 
            Upon deletion, your personal data will be removed in accordance with our Privacy Policy.
          </p>

          <h3 className="text-xl font-semibold mt-4">11.2 By Us</h3>
          <p>
            We reserve the right to suspend or terminate your account at any time, with or without notice, for:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Violation of these Terms</li>
            <li>Fraudulent or illegal activity</li>
            <li>Abusive or harmful conduct</li>
            <li>Extended inactivity</li>
            <li>Any reason at our sole discretion</li>
          </ul>

          <h3 className="text-xl font-semibold mt-4">11.3 Effect of Termination</h3>
          <p>
            Upon termination, your right to access the Service ceases immediately. 
            Sections of these Terms that should survive termination (including disclaimers, 
            limitations of liability, and indemnification) will continue to apply.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">12. Dispute Resolution</h2>
          
          <h3 className="text-xl font-semibold">12.1 Governing Law</h3>
          <p>
            These Terms are governed by and construed in accordance with the laws of [Your Jurisdiction], 
            without regard to conflict of law principles.
          </p>

          <h3 className="text-xl font-semibold mt-4">12.2 Arbitration</h3>
          <p>
            Any disputes arising from these Terms or the Service shall be resolved through binding arbitration, 
            except for disputes that may be brought in small claims court. You waive your right to a jury trial.
          </p>

          <h3 className="text-xl font-semibold mt-4">12.3 Class Action Waiver</h3>
          <p>
            You agree to resolve disputes with us on an individual basis and waive your right to participate 
            in class actions or collective proceedings.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">13. Modifications to the Service</h2>
          <p>
            We reserve the right to modify, suspend, or discontinue the Service (or any part thereof) 
            at any time, with or without notice. We will not be liable to you or any third party for 
            any modification, suspension, or discontinuation of the Service.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">14. General Provisions</h2>
          
          <h3 className="text-xl font-semibold">14.1 Entire Agreement</h3>
          <p>
            These Terms, together with our Privacy Policy, constitute the entire agreement between 
            you and Hey Garlic regarding the Service.
          </p>

          <h3 className="text-xl font-semibold mt-4">14.2 Severability</h3>
          <p>
            If any provision of these Terms is found to be invalid or unenforceable, the remaining 
            provisions will remain in full force and effect.
          </p>

          <h3 className="text-xl font-semibold mt-4">14.3 Waiver</h3>
          <p>
            Our failure to enforce any provision of these Terms does not constitute a waiver of that provision.
          </p>

          <h3 className="text-xl font-semibold mt-4">14.4 Assignment</h3>
          <p>
            You may not assign or transfer these Terms without our prior written consent. 
            We may assign these Terms without restriction.
          </p>

          <h3 className="text-xl font-semibold mt-4">14.5 Force Majeure</h3>
          <p>
            We are not liable for delays or failures due to circumstances beyond our reasonable control, 
            including natural disasters, war, terrorism, labor disputes, or internet disruptions.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">15. Contact Information</h2>
          <p>
            If you have questions about these Terms, please contact us:
          </p>
          <ul className="list-none space-y-2">
            <li><strong>Email:</strong> <a href="mailto:legal@heygarlic.com" className="text-primary hover:underline">legal@heygarlic.com</a></li>
            <li><strong>Support:</strong> <a href="/contact" className="text-primary hover:underline">Contact Form</a></li>
          </ul>
        </section>

        <section className="space-y-4 mt-12 pt-8 border-t">
          <h2 className="text-2xl font-semibold">16. Recipe Content Disclaimer</h2>
          <p>
            Recipes on Hey Garlic are user-generated content. We are not responsible for the accuracy, 
            safety, or nutritional information of recipes. Users should:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Verify ingredient safety and suitability for their dietary needs</li>
            <li>Be aware of food allergies and intolerances</li>
            <li>Follow proper food handling and safety practices</li>
            <li>Consult healthcare professionals for dietary advice</li>
          </ul>
          <p>
            Hey Garlic is not liable for any illness, injury, or adverse reactions resulting from 
            recipes posted on the platform.
          </p>
        </section>

        <section className="space-y-4 mt-8">
          <p className="text-muted-foreground">
            By using Hey Garlic, you acknowledge that you have read, understood, and agree to be bound 
            by these Terms of Service.
          </p>
        </section>
      </div>
    </div>
  );
}
