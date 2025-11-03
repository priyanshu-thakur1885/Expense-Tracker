import React from 'react';
import { Link } from 'react-router-dom';

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-3xl mx-auto p-6 sm:p-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white text-center mb-6">
          Privacy Policy
        </h1>
        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mb-10">
          Last updated: {new Date().toLocaleDateString()}
        </p>

        <div className="space-y-6 text-gray-700 dark:text-gray-200 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold mb-2">1. Overview</h2>
            <p>
              This Privacy Policy explains how Expense Tracker ("we", "our", or "us") collects,
              uses, and protects information when you use our Service available at
              https://expense-tracker-0ipq.onrender.com. The Service is provided for educational
              and demo purposes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">2. Information We Collect</h2>
            <p>
              We may collect the following information when you use the Service:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Basic profile information from Google OAuth (name, email, profile photo).</li>
              <li>Expense data you manually add to the application.</li>
              <li>Technical data such as IP address, device/browser information, and usage logs.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">3. Authentication</h2>
            <p>
              Users authenticate via Google OAuth. We do not collect your Google account password.
              Authentication tokens are handled securely and used only to manage your session.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">4. Payments</h2>
            <p>
              Premium features may be purchased using Razorpay. Payment processing is handled by
              Razorpay, and sensitive payment information is not stored on our servers. Please
              refer to Razorpay&apos;s privacy policy for more details on their data practices.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">5. How We Use Information</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>To provide and improve the Service and its features.</li>
              <li>To personalize your experience (e.g., preferences and settings).</li>
              <li>To troubleshoot, monitor, and enhance application performance and security.</li>
              <li>To communicate essential updates related to the Service.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">6. Data Retention</h2>
            <p>
              We retain information for as long as necessary to provide the Service or as required
              by law. You may request deletion of your data by contacting us.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">7. Data Security</h2>
            <p>
              We implement reasonable technical and organizational measures to protect information.
              However, no method of transmission over the internet is 100% secure; use the Service
              at your own risk.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">8. Children&apos;s Privacy</h2>
            <p>
              The Service is intended for educational/demo use and is not directed to children under
              13. If you believe we have collected personal data from a child, please contact us so
              we can take appropriate action.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">9. Third-Party Services</h2>
            <p>
              The Service may link to third-party sites or services (e.g., Google OAuth, Razorpay).
              We are not responsible for the privacy practices of those third parties.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">10. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. Your continued use of the
              Service after updates constitutes acceptance of the revised policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">11. Contact</h2>
            <p>
              If you have questions about this Privacy Policy, contact us at
              <a href="mailto:priyanshut1885@gmail.com" className="text-primary-600 hover:underline ml-1">priyanshut1885@gmail.com</a>.
            </p>
          </section>
        </div>

        <div className="text-center mt-10">
          <Link to="/" className="text-primary-600 hover:text-primary-500 underline">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;


