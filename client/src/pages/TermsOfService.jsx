import React from 'react';
import { Link } from 'react-router-dom';

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-3xl mx-auto p-6 sm:p-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white text-center mb-6">
          Terms of Service
        </h1>
        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mb-10">
          Last updated: {new Date().toLocaleDateString()}
        </p>

        <div className="space-y-6 text-gray-700 dark:text-gray-200 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold mb-2">1. Introduction</h2>
            <p>
              Welcome to Expense Tracker ("we", "our", or "us"). By accessing or using the
              website available at https://expense-tracker-0ipq.onrender.com (the "Service"),
              you agree to be bound by these Terms of Service ("Terms"). If you do not agree
              to these Terms, please do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">2. Purpose of the Service</h2>
            <p>
              Expense Tracker is provided for educational and demo purposes. While we strive to
              offer a smooth experience, the Service may be subject to changes, interruptions, or
              limited availability.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">3. Accounts and Authentication</h2>
            <p>
              Users sign in via Google OAuth. You are responsible for maintaining the security of
              your Google account. You must not share or misuse your access credentials. We are not
              liable for any loss or damage arising from unauthorized access resulting from your
              failure to safeguard your credentials.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">4. Payments</h2>
            <p>
              Certain features may be offered through paid plans. Payments are processed securely via
              Razorpay. By initiating a payment, you agree to Razorpay’s terms and any applicable
              fees. We do not store your full payment details on our servers.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">5. Acceptable Use</h2>
            <p>
              You agree not to misuse the Service, including but not limited to attempting to
              disrupt, reverse-engineer, or gain unauthorized access to any part of the platform.
              You must comply with applicable laws and respect the rights of others.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">6. Intellectual Property</h2>
            <p>
              The Service, including its design and content, is owned by Expense Tracker or its
              licensors. You may not copy, modify, or distribute any part of the Service unless
              expressly permitted.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">7. Disclaimer of Warranties</h2>
            <p>
              The Service is provided on an "as is" and "as available" basis for demo purposes.
              We disclaim all warranties of any kind, whether express or implied, including but not
              limited to merchantability, fitness for a particular purpose, and non-infringement.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">8. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, Expense Tracker shall not be liable for any
              indirect, incidental, special, consequential, or punitive damages, or any loss of data,
              use, reputation, or other intangible losses resulting from your use of the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">9. Termination</h2>
            <p>
              We may suspend or terminate access to the Service at any time, with or without cause
              or notice, particularly in the event of suspected misuse or security risk.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">10. Changes to These Terms</h2>
            <p>
              We may update these Terms from time to time. Continued use of the Service after such
              updates constitutes acceptance of the new Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">11. Contact</h2>
            <p>
              For any questions regarding these Terms, contact us at
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

export default TermsOfService;


