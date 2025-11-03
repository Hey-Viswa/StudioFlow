export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-gray-100">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold mb-4">Privacy Policy</h1>
        <p className="text-gray-400 mb-8">Last updated: {new Date().toLocaleDateString()}</p>

        <div className="space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Information We Collect</h2>
            <div className="text-gray-300 space-y-3">
              <p>We collect information that you provide directly to us when you:</p>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li>Create an account and use StudioFlow services</li>
                <li>Upload, create, or share content including projects, files, and comments</li>
                <li>Communicate with us via support channels</li>
                <li>Participate in surveys or promotional activities</li>
              </ul>
              
              <p className="mt-4"><strong>Personal Information may include:</strong></p>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li>Name and email address</li>
                <li>Profile information and preferences</li>
                <li>Payment information (processed securely via Razorpay)</li>
                <li>Usage data and activity logs</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. How We Use Your Information</h2>
            <div className="text-gray-300 space-y-3">
              <p>We use the information we collect to:</p>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li>Provide, maintain, and improve our services</li>
                <li>Process transactions and send related information</li>
                <li>Send technical notices, updates, and security alerts</li>
                <li>Respond to your comments and questions</li>
                <li>Analyze usage patterns to enhance user experience</li>
                <li>Detect, prevent, and address technical issues or fraud</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. Authentication & Security</h2>
            <div className="text-gray-300 space-y-3">
              <p>
                We use Clerk for authentication services. Your authentication data is handled securely
                with industry-standard encryption. We implement appropriate security measures including:
              </p>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li>JWT-based authentication with RS256 encryption</li>
                <li>HTTPS encryption for all data transmission</li>
                <li>Secure password hashing (bcrypt with 12 rounds)</li>
                <li>Rate limiting to prevent abuse</li>
                <li>Regular security audits and updates</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Data Storage & Retention</h2>
            <div className="text-gray-300 space-y-3">
              <p>
                Your data is stored securely on MongoDB Atlas servers. We retain your information
                for as long as your account is active or as needed to provide services. You may
                request deletion of your account and associated data at any time.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Information Sharing</h2>
            <div className="text-gray-300 space-y-3">
              <p>We do not sell your personal information. We may share information with:</p>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li>Service providers (Clerk, MongoDB, Razorpay) who assist in operations</li>
                <li>Team members you explicitly invite to projects</li>
                <li>Law enforcement when required by applicable law</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Your Rights</h2>
            <div className="text-gray-300 space-y-3">
              <p>You have the right to:</p>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li>Access, update, or delete your personal information</li>
                <li>Export your project data</li>
                <li>Opt-out of marketing communications</li>
                <li>Request data portability</li>
                <li>Lodge a complaint with supervisory authorities</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Cookies & Tracking</h2>
            <div className="text-gray-300 space-y-3">
              <p>
                We use cookies and similar technologies to maintain session state and improve
                your experience. You can control cookie preferences through your browser settings.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Children's Privacy</h2>
            <div className="text-gray-300 space-y-3">
              <p>
                StudioFlow is not intended for users under 13 years of age. We do not knowingly
                collect information from children under 13.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. International Data Transfers</h2>
            <div className="text-gray-300 space-y-3">
              <p>
                Your information may be transferred to and processed in countries other than
                your country of residence. We ensure appropriate safeguards are in place.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Changes to Privacy Policy</h2>
            <div className="text-gray-300 space-y-3">
              <p>
                We may update this Privacy Policy from time to time. We will notify you of
                material changes by posting the new policy and updating the "Last updated" date.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">11. Contact Us</h2>
            <div className="text-gray-300 space-y-3">
              <p>
                If you have questions about this Privacy Policy, please contact us at:
              </p>
              <p className="ml-4">
                Email: <a href="mailto:privacy@studioflow.com" className="text-purple-400 hover:text-purple-300">privacy@studioflow.com</a>
              </p>
            </div>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-800">
          <a href="/" className="text-purple-400 hover:text-purple-300 font-medium">
            ← Back to Home
          </a>
        </div>
      </div>
    </div>
  );
}
