import type { Metadata } from "next";
import { CONTACT_EMAIL, LegalPage, LegalSection } from "@/components/legal";

export const metadata: Metadata = { title: "Privacy Policy", description: "What PitchPin collects, why, and how to have it deleted." };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" intro="PitchPin helps people in Ahmedabad find and book sports turfs. This page explains what we collect, why, and what you can ask us to do with it.">
      <LegalSection title="What we collect">
        <ul>
          <li><b>Account details:</b> your email address, and a securely hashed password if you sign up with one.</li>
          <li><b>From Google, if you choose “Continue with Google”:</b> your name, email address and Google account ID. We don&apos;t get your Google password, contacts, files or anything else.</li>
          <li><b>Details you add:</b> your phone number if you claim a turf, and your reminder preferences (email and browser notifications).</li>
          <li><b>Bookings:</b> the turf, court, date, time, amount, booking code, and who in your squad has paid their share.</li>
          <li><b>Turf owners:</b> turf details you enter, and the phone number and role you give when claiming a listing.</li>
          <li><b>Payments:</b> PitchPin doesn&apos;t take real payments at the moment, so we hold no card or bank details. If real payments are switched on, they are handled by Razorpay and we only keep payment IDs and status.</li>
        </ul>
      </LegalSection>
      <LegalSection title="How we use it">
        <ul>
          <li>To sign you in and keep you signed in.</li>
          <li>To hold slots, split payments with your squad and show your ticket QR at the gate.</li>
          <li>To send emails you&apos;d expect: a welcome email and booking confirmations, from {CONTACT_EMAIL}.</li>
          <li>To send match reminders by email and browser notification. You can turn either off on your Account page.</li>
          <li>To let a turf&apos;s owner see bookings for their own turf (name or email, phone, time and amount).</li>
        </ul>
        <p>We don&apos;t sell your data, show ads, or share it with anyone except the services that run PitchPin, listed below.</p>
      </LegalSection>
      <LegalSection title="Cookies">
        <p>We use one cookie to keep you signed in, and a short-lived one during Google sign-in. We don&apos;t use advertising or tracking cookies. Your browser may also remember the area you last picked.</p>
      </LegalSection>
      <LegalSection title="Services we use">
        <ul>
          <li>Vercel (hosting) and Neon (database), with servers in Singapore.</li>
          <li>Google, for “Continue with Google” and for sending email through Gmail.</li>
          <li>Razorpay, for payments, if and when real payments are switched on.</li>
        </ul>
      </LegalSection>
      <LegalSection title="How long we keep it">
        <p>We keep your account and booking history while your account exists. Sign-in sessions expire after 30 days.</p>
      </LegalSection>
      <LegalSection title="Your choices">
        <ul>
          <li>Change your reminder settings on your Account page.</li>
          <li>Ask for a copy of your data, a correction, or for your account to be deleted, by emailing {CONTACT_EMAIL}. We reply within 30 days.</li>
          <li>Remove PitchPin&apos;s access to your Google account at any time at myaccount.google.com/permissions.</li>
        </ul>
      </LegalSection>
      <LegalSection title="Children">
        <p>PitchPin isn&apos;t meant for children under 13, and we don&apos;t knowingly collect their data.</p>
      </LegalSection>
      <LegalSection title="Changes">
        <p>If we change this policy we&apos;ll update the date at the top, and tell you by email if the change is significant.</p>
      </LegalSection>
    </LegalPage>
  );
}
