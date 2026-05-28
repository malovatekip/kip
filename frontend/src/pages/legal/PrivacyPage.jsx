import React from 'react'
import LegalLayout, { Section, P, UL, Callout } from '../components/LegalLayout'

export default function PrivacyPage() {
  return (
    <LegalLayout
      title="Privacy Policy"
      subtitle="How Malovate collects, uses, and protects your personal data on the Kwacha Intelligence Platform."
      lastUpdated="May 2026"
    >
      <Callout color="var(--blue-bright)">
        This Privacy Policy is governed by the <strong>Zambia Data Protection Act No. 3 of 2021</strong>. By using KIP, you consent to the practices described in this policy.
      </Callout>

      <Section title="1. Who We Are">
        <P>
          <strong>Malovate Limited</strong> ("Malovate", "we", "us") is the data controller responsible for your personal data on the Kwacha Intelligence Platform ("KIP"). We are incorporated in Zambia.
        </P>
        <P>
          For data protection queries, contact our Data Protection Officer at: <strong>privacy@malovate.com</strong>
        </P>
      </Section>

      <Section title="2. What Data We Collect">
        <P><strong>Account data</strong> — when you register:</P>
        <UL items={[
          'Full name',
          'Email address',
          'Password (stored as a one-way cryptographic hash — we cannot read it)',
          'Account creation date and last login',
        ]} />

        <P><strong>Business data</strong> — when you use KIP's core features:</P>
        <UL items={[
          'Business ideas you generate or add',
          'Daily business logs (revenue, expenses, customer counts)',
          'Market survey responses you submit',
          'Business chat conversations with KIP',
          'Launch plan content and plan updates',
        ]} />

        <P><strong>Usage data</strong> — automatically collected:</P>
        <UL items={[
          'Device type and operating system',
          'Browser type',
          'Pages visited and features used within KIP',
          'Session timestamps',
          'IP address (used for security and fraud prevention only)',
        ]} />

        <P><strong>What we do NOT collect:</strong></P>
        <UL items={[
          'Government ID numbers or National Registration Card details',
          'Bank account numbers or financial account credentials',
          'Biometric data',
          'Location data beyond what you voluntarily enter in surveys',
        ]} />
      </Section>

      <Section title="3. How We Use Your Data">
        <P>We use your data to:</P>
        <UL items={[
          'Provide, operate, and improve the KIP platform',
          'Generate AI-powered business recommendations personalised to your inputs',
          'Send you in-app notifications relevant to your account (e.g. branch manager assignments)',
          'Process subscription payments and manage your account',
          'Detect and prevent fraud, abuse, and security incidents',
          'Comply with Zambian law and regulatory obligations',
          'Improve KIP\'s AI models using anonymised and aggregated data',
          'Send you product updates and important account notifications',
        ]} />

        <Callout color="var(--teal)">
          We do not sell your personal data to third parties. We do not use your data for advertising purposes.
        </Callout>
      </Section>

      <Section title="4. AI Training and Your Data">
        <P>
          KIP uses the Anthropic Claude API to generate AI responses. When you interact with KIP, your messages are processed by Anthropic's systems to generate responses. Anthropic's privacy policy applies to this processing.
        </P>
        <P>
          Malovate may use anonymised and aggregated versions of business survey data, pricing data, and market intelligence to improve KIP's Zambia Intelligence (ZI) knowledge base. This data cannot be traced back to individual users.
        </P>
        <P>
          Your personal conversations and business logs are not used to train AI models without your explicit consent.
        </P>
      </Section>

      <Section title="5. Data Storage and Security">
        <P>
          Your data is stored on Railway.app infrastructure, which provides enterprise-grade security. Your database is stored on encrypted volumes with access controls.
        </P>
        <P>
          Passwords are hashed using bcrypt — a one-way cryptographic function. Even Malovate employees cannot read your password.
        </P>
        <P>
          Authentication tokens expire and are invalidated on logout. We use HTTPS/TLS encryption for all data in transit.
        </P>
        <Callout color="var(--gold)">
          ⚠ No system is 100% secure. While we use industry-standard security measures, we cannot guarantee absolute security. In the event of a data breach that affects your personal data, we will notify you as required by the Zambia Data Protection Act.
        </Callout>
      </Section>

      <Section title="6. Data Retention">
        <P>We retain your data for as long as your account is active. Specifically:</P>
        <UL items={[
          'Account data — retained for the life of your account plus 12 months after deletion',
          'Business logs and plans — retained for the life of your account',
          'Chat conversations — retained for the life of your account',
          'Payment records — retained for 7 years as required by Zambian tax law',
          'Anonymised survey data — retained indefinitely as part of KIP\'s market intelligence',
        ]} />
        <P>
          When you delete your account, your personal data is deleted within 30 days. Anonymised, non-identifiable data derived from your usage may be retained.
        </P>
      </Section>

      <Section title="7. Your Rights Under the Zambia Data Protection Act">
        <P>Under the Zambia Data Protection Act No. 3 of 2021, you have the right to:</P>
        <UL items={[
          'Access — request a copy of the personal data we hold about you',
          'Correction — request that we correct inaccurate data',
          'Deletion — request that we delete your personal data (subject to legal retention obligations)',
          'Portability — request your data in a machine-readable format',
          'Objection — object to processing of your data for certain purposes',
          'Withdraw consent — where processing is based on consent, withdraw it at any time',
        ]} />
        <P>
          To exercise any of these rights, email <strong>privacy@malovate.com</strong> with your request. We will respond within 30 days as required by law.
        </P>
        <Callout color="var(--muted)">
          ⚖ Note to Paul: Confirm that Malovate is registered with the Zambia Information and Communications Technology Authority (ZICTA) as a data controller under the Data Protection Act before mass launch.
        </Callout>
      </Section>

      <Section title="8. Third-Party Services">
        <P>KIP uses the following third-party services which may process your data:</P>
        <UL items={[
          'Anthropic (Claude API) — processes your messages to generate AI responses. Privacy policy at anthropic.com/privacy',
          'Railway.app — cloud infrastructure hosting KIP\'s servers and database',
          'Stripe (coming June 2026) — payment processing for subscriptions',
        ]} />
        <P>
          We only share the minimum data necessary with these providers. We do not share your data with any other third parties without your consent, except as required by Zambian law.
        </P>
      </Section>

      <Section title="9. Children's Privacy">
        <P>
          KIP is not intended for use by persons under the age of 18. We do not knowingly collect personal data from minors. If you believe a minor has created an account, please contact privacy@malovate.com and we will delete the account promptly.
        </P>
      </Section>

      <Section title="10. Changes to This Policy">
        <P>
          We may update this Privacy Policy to reflect changes in our practices or Zambian law. We will notify you of material changes via in-app notification or email. The "last updated" date at the top of this page will always reflect the most recent version.
        </P>
      </Section>

      <Section title="11. Contact">
        <P>
          For privacy-related concerns:<br />
          <strong>Email:</strong> privacy@malovate.com<br />
          <strong>Data Protection Officer:</strong> Malovate Limited, Zambia<br /><br />
          To report a data protection concern to the regulator:<br />
          <strong>ZICTA:</strong> Zambia Information and Communications Technology Authority — zicta.zm
        </P>
      </Section>
    </LegalLayout>
  )
}
