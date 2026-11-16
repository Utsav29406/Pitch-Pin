import type { Metadata } from "next";
import { CONTACT_EMAIL, LegalPage, LegalSection } from "@/components/legal";

export const metadata: Metadata = { title: "Terms of Service", description: "The rules for using PitchPin to find and book turfs in Ahmedabad." };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" intro="These terms apply when you use PitchPin to find, book or list a sports turf. By creating an account or booking, you agree to them.">
      <LegalSection title="About PitchPin">
        <p>
          PitchPin lists sports turfs across Ahmedabad and lets you book the ones that take bookings through PitchPin. The turf itself runs the
          facility; PitchPin handles the listing, the booking and splitting the payment. PitchPin doesn&apos;t charge any money
          at the moment: paying in the app confirms the booking without a charge.
        </p>
      </LegalSection>
      <LegalSection title="Your account">
        <ul>
          <li>Give a real email address and keep your password to yourself. You&apos;re responsible for bookings made from your account.</li>
          <li>You can sign in with an email and password or with Google.</li>
          <li>We may suspend accounts used for fake bookings, abuse or fraud.</li>
        </ul>
      </LegalSection>
      <LegalSection title="Listings">
        <p>
          Turfs marked “Call to book” are directory listings collected from public sources. Their details may be out of date; call or visit the
          turf to confirm. Prices, hours and facilities on bookable turfs are set by the turf&apos;s owner.
        </p>
      </LegalSection>
      <LegalSection title="Bookings and squad payments">
        <ul>
          <li>Picking a slot holds it for a short time while you pay. If the full amount isn&apos;t paid before the hold ends, the slot is released.</li>
          <li>With a squad split, each player pays their own share. The booking is confirmed only when every share is paid; shares paid for a booking that lapses are refunded.</li>
          <li>Arrive on time and show your ticket QR at the gate. Follow the turf&apos;s own rules on footwear, behaviour and safety.</li>
        </ul>
      </LegalSection>
      <LegalSection id="cancellations" title="Cancellations and refunds">
        <ul>
          <li>Bookings can&apos;t yet be cancelled from the app. To cancel, contact the turf or email {CONTACT_EMAIL} as early as you can.</li>
          <li>If PitchPin or the turf cancels your booking, every share that was paid is refunded in full to the original payment method.</li>
          <li>If you don&apos;t turn up, the booking isn&apos;t refunded.</li>
        </ul>
      </LegalSection>
      <LegalSection title="Turf owners">
        <ul>
          <li>Only claim a listing you own or manage. We check claims by phone before approving them.</li>
          <li>Keep your prices, hours and courts accurate, and honour bookings made through PitchPin.</li>
        </ul>
      </LegalSection>
      <LegalSection title="Responsibility">
        <p>
          Playing sport carries a risk of injury. Turfs are run by their owners, and PitchPin isn&apos;t responsible for the condition of a turf,
          injuries, or lost belongings. We try to keep PitchPin running and accurate but can&apos;t promise it will always be available or error-free.
        </p>
      </LegalSection>
      <LegalSection title="Changes">
        <p>We may update these terms. We&apos;ll change the date at the top, and tell you by email if the change is significant.</p>
      </LegalSection>
      <LegalSection title="Governing law">
        <p>These terms are governed by the laws of India, with courts in Ahmedabad, Gujarat.</p>
      </LegalSection>
    </LegalPage>
  );
}
