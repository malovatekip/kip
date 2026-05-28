import React from 'react'
import LegalLayout, { Section, P, UL, Callout } from '../../components/LegalLayout'

export default function TermsPage() {
  return (
    <LegalLayout
      title="Terms of Use"
      subtitle="Please read these terms carefully before using the Kwacha Intelligence Platform."
      lastUpdated="May 2026"
    >
      <Callout color="var(--blue-bright)">
        By creating an account or using KIP, you agree to these Terms of Use. If you do not agree, do not use the platform.
      </Callout>

      <Section title="1. About KIP and Malovate">
        <P>
          The Kwacha Intelligence Platform ("KIP") is a product of <strong>Malovate Limited</strong>, a technology company incorporated in Zambia. KIP provides AI-powered business intelligence, idea generation, coaching, and analytics tools designed for Zambian entrepreneurs and businesses.
        </P>
        <P>
          Malovate operates KIP as a Software-as-a-Service (SaaS) platform accessible via web and mobile applications at kip.malovate.com and related domains.
        </P>
      </Section>

      <Section title="2. Eligibility">
        <P>You may use KIP if you:</P>
        <UL items={[
          'Are at least 18 years of age',
          'Are capable of forming a binding contract under Zambian law',
          'Are not prohibited from using the service under any applicable law',
          'Provide accurate and complete registration information',
        ]} />
        <P>
          KIP is intended for use in Zambia and by Zambian entrepreneurs. Users outside Zambia may access the platform but should note that all business intelligence, pricing data, regulatory guidance, and recommendations are calibrated for the Zambian market.
        </P>
      </Section>

      <Section title="3. Your Account">
        <P>
          You are responsible for maintaining the confidentiality of your account credentials. You must notify us immediately at <strong>support@malovate.com</strong> if you suspect unauthorised access to your account.
        </P>
        <P>
          You may not share your account, transfer it to another person, or use another person's account without their explicit permission.
        </P>
        <P>
          We reserve the right to suspend or terminate accounts that violate these Terms or that we reasonably believe are being used fraudulently.
        </P>
      </Section>

      <Section title="4. Acceptable Use">
        <P>You agree not to use KIP to:</P>
        <UL items={[
          'Engage in any illegal activity under Zambian law or applicable international law',
          'Harass, threaten, or harm other users',
          'Upload or transmit malicious code, viruses, or harmful software',
          'Attempt to gain unauthorised access to KIP\'s systems or other users\' accounts',
          'Scrape, copy, or reproduce KIP\'s content or AI outputs for commercial purposes without written permission from Malovate',
          'Use the platform to generate or distribute misinformation, fraudulent business information, or deceptive content',
          'Attempt to reverse-engineer or extract KIP\'s underlying AI models or proprietary data',
          'Use automated bots or scripts to interact with the platform without prior written consent',
        ]} />
      </Section>

      <Section title="5. AI-Generated Content Disclaimer">
        <Callout color="var(--gold)">
          ⚠ Important: KIP uses artificial intelligence to generate business recommendations, financial projections, and coaching advice. This content is informational only and does not constitute professional financial, legal, or business consulting advice.
        </Callout>
        <P>
          KIP's AI responses are generated based on available data, market patterns, and general business principles. They may not account for all factors specific to your situation. Malovate makes no guarantee that any business idea, revenue projection, or recommendation will result in profit or business success.
        </P>
        <P>
          Before making any significant financial or business decision based on KIP's output, you are strongly advised to consult a qualified accountant, business advisor, or legal professional.
        </P>
        <P>
          Malovate is not liable for any financial loss, business failure, or other damage arising from reliance on KIP's AI-generated content.
        </P>
      </Section>

      <Section title="6. Subscription and Payments">
        <P>
          KIP offers a free tier and paid subscription plans. Paid plans are billed as described on the pricing page. By subscribing to a paid plan, you authorise Malovate to charge your payment method on a recurring basis.
        </P>
        <P>
          All fees are quoted and charged in Zambian Kwacha (ZMW) or United States Dollars (USD) as displayed at the time of purchase. Prices are inclusive of applicable taxes where required by Zambian law.
        </P>
        <P>
          Refunds are issued at Malovate's discretion. If you believe you have been incorrectly charged, contact support@malovate.com within 14 days of the charge.
        </P>
      </Section>

      <Section title="7. Intellectual Property">
        <P>
          All content on KIP — including but not limited to the platform design, KIP's system architecture, training data compilations, brand assets, and the Malovate and KIP trademarks — is the exclusive property of Malovate Limited and is protected under Zambian intellectual property law.
        </P>
        <P>
          You retain ownership of any business information, logs, and data you input into KIP. By submitting data, you grant Malovate a non-exclusive, royalty-free licence to use anonymised and aggregated versions of that data to improve KIP's AI models and services.
        </P>
        <P>
          AI-generated responses produced by KIP during your session are provided for your personal use. You may not reproduce, sell, or distribute them as your own original work or as the output of a competing AI product.
        </P>
      </Section>

      <Section title="8. Data and Privacy">
        <P>
          Your use of KIP is also governed by our <a href="/legal/privacy" style={{ color: 'var(--blue-bright)', fontWeight: 600 }}>Privacy Policy</a>, which is incorporated into these Terms by reference. By using KIP, you consent to the data practices described in the Privacy Policy.
        </P>
      </Section>

      <Section title="9. Service Availability">
        <P>
          Malovate aims to maintain KIP's availability 24/7 but does not guarantee uninterrupted access. The platform may be temporarily unavailable due to maintenance, technical issues, or circumstances beyond our control.
        </P>
        <P>
          Malovate reserves the right to modify, suspend, or discontinue any feature of KIP at any time, with or without notice. We will endeavour to provide reasonable advance notice of material changes.
        </P>
      </Section>

      <Section title="10. Limitation of Liability">
        <P>
          To the maximum extent permitted by Zambian law, Malovate and its directors, employees, and agents shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, loss of data, or business interruption, arising from your use of KIP.
        </P>
        <P>
          Malovate's total liability to you for any claim arising from your use of KIP shall not exceed the total amount you paid to Malovate in the 12 months preceding the claim.
        </P>
      </Section>

      <Section title="11. Governing Law">
        <P>
          These Terms are governed by and construed in accordance with the laws of the Republic of Zambia. Any dispute arising from these Terms shall be subject to the exclusive jurisdiction of the courts of Zambia.
        </P>
        <Callout color="var(--muted)">
{/*           ⚖ Note to Paul: This clause and the limitation of liability section should be reviewed by a Zambian commercial lawyer before mass launch to ensure full compliance with the Zambia Consumer Protection Act and any other applicable legislation. */}
        </Callout>
      </Section>

      <Section title="12. Changes to These Terms">
        <P>
          Malovate may update these Terms at any time. We will notify registered users of material changes via in-app notification or email. Continued use of KIP after changes are posted constitutes your acceptance of the revised Terms.
        </P>
      </Section>

      <Section title="13. Contact">
        <P>
          For questions about these Terms, contact us at:<br />
          <strong>Email:</strong> malovate.tech@gmail.com<br />
          <strong>Company:</strong> Malovate Limited, Zambia<br />
          <strong>Support:</strong> <a href="/contact" style={{ color: 'var(--blue-bright)' }}>Contact page</a>
        </P>
      </Section>
    </LegalLayout>
  )
}
