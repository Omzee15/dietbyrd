import LegalLayout from "./LegalLayout";

const Privacy = () => (
  <LegalLayout
    title="Privacy Policy"
    lastUpdated="May 2026"
    introCallout={
      <>
        <strong>Before we begin:</strong> We built Diet By RD because we believe healthcare deserves honesty. That principle applies here too. This Privacy Policy is not a wall of legal text designed to confuse you — it is a clear, honest explanation of what information we collect, why we need it, who can see it, and the complete control you have over it. We have written it to be read, not just scrolled past.
      </>
    }
  >
    <div className="legal-page">
      <h2>1. Who We Are</h2>
      <p>Diet By RD is India's first clinical nutrition platform where every single consultation is exclusively with a Registered Dietitian — a licensed professional whose title is legally protected by the Indian Dietetic Association. We are not a wellness app. We are a clinical service, and we treat your health information with the seriousness that entails.</p>
      <p><strong>Legal Entity:</strong> Diet By RD Private Limited</p>
      <p><strong>Contact:</strong> <a href="mailto:hello@dietbyrd.com">hello@dietbyrd.com</a></p>
      <p><strong>Grievance Officer:</strong> Aryan Bhagat, Founder — <a href="mailto:hello@dietbyrd.com">hello@dietbyrd.com</a></p>
      <p>We operate exclusively within India and serve only Indian residents.</p>

      <h2>2. The Information We Collect — And Why</h2>
      <p>We collect the minimum information necessary to provide you with safe, personalised clinical care. Nothing more.</p>

      <h3>A. When You Are Referred by a Doctor</h3>
      <p>When your doctor refers you to Diet By RD, we receive your name, mobile number, age, and primary diagnosis. This information is held temporarily in a secure buffer and enters our main system only after you complete your payment — which constitutes your explicit consent to proceed. If you do not pay within 24 hours, this information is automatically and permanently deleted.</p>

      <h3>B. When You Create Your Profile</h3>
      <ul>
        <li>Your name, mobile number, and age</li>
        <li>Your dietary preferences, food restrictions, and cultural food habits — because a plan that ignores your food culture is a plan that will not work</li>
        <li>Your health goal or diagnosis as shared by your referring doctor</li>
      </ul>

      <h3>C. During and After Your Consultation</h3>
      <ul>
        <li>Clinical notes written by your Registered Dietitian — a precise record of what was discussed and recommended</li>
        <li>Blood reports, prescriptions, or other health documents you choose to upload</li>
        <li>Your personalised diet plan</li>
      </ul>
      <p>Your consultations are not recorded in any form — audio or video. Your RD's clinical notes are the complete and authoritative record of every session.</p>

      <h3>D. Payment Information</h3>
      <p>We use Razorpay, an RBI-licensed payment aggregator, to process all payments. Diet By RD never sees or stores your card number, UPI ID, or banking credentials. Razorpay handles this entirely. We receive only a confirmation that payment was successful, along with a transaction reference number.</p>

      <h3>E. Technical Information</h3>
      <p>Like all modern web applications, we collect basic technical information — your device type, browser, IP address, and activity within the app. This is used solely to keep the platform secure and functional. We do not build advertising profiles from this data.</p>

      <h2>3. How We Use Your Information</h2>
      <p>Every piece of information we collect has one purpose: to help your Registered Dietitian provide you with the best possible clinical care. Specifically:</p>
      <ul>
        <li>To schedule and conduct your consultations</li>
        <li>To prepare and deliver your personalised diet plan</li>
        <li>To send you appointment reminders via WhatsApp</li>
        <li>To allow your RD to maintain accurate clinical notes and track your progress</li>
        <li>To respond to your support queries</li>
        <li>To comply with our legal obligations under Indian law</li>
      </ul>
      <p>If you have opted in to receive health updates and service announcements, we may send these occasionally. You can withdraw this consent at any time by replying STOP to any such message.</p>

      <h2>4. Who Can See Your Information</h2>
      <p>Access to your information is strictly controlled based on role. We use technical permission systems — not just policies — to enforce this.</p>
      <ul>
        <li><strong>Your clinical information (notes, reports, diet plans):</strong> Your assigned Registered Dietitian</li>
        <li><strong>Our operations team:</strong> Our operations team has visibility of your name, contact details, booking status, and payment status — what they need to serve you, nothing more</li>
        <li><strong>Payment processing:</strong> Razorpay processes your payment and operates under its own privacy policy and RBI regulations</li>
        <li><strong>Operational tools:</strong> We use Zoho for our internal operations and WhatsApp Business API for messages — both are operated under binding data processing agreements</li>
        <li><strong>Everyone else:</strong> Nobody else. Not your referring doctor. Not third parties. Not us for any purpose other than your care</li>
      </ul>
      <p>Your blood reports, prescriptions, and consultation notes are visible only to your assigned RD and Qualified Professionals. Our support team cannot see them. This is enforced at the technical level.</p>

      <h2>5. WhatsApp Communication</h2>
      <p>Diet By RD communicates with you through WhatsApp because that is where you are — and we believe friction in healthcare is a problem worth solving. Here is what we send and why:</p>
      <ul>
        <li>Your consultation booking link — sent once after payment</li>
        <li>Your consultation reminder — sent 24 hours before your slot, one hour before the consultation and/or exactly at the time of the booked time slot for consultation.</li>
        <li>Your diet plan — delivered as a secure file after your consultation</li>
        <li>Your follow-up check-in — sent 3–15 days after your consultation</li>
        <li>Your monthly re-booking reminder — sent on Day 25 of each month</li>
      </ul>
      <p>We will never send you unsolicited promotional messages without your explicit opt-in. Every message we send serves a clinical or operational purpose. You can opt out of non-essential communications at any time by replying STOP.</p>

      <h2>6. How Long We Keep Your Information</h2>
      <p>We do not keep your data a day longer than we need to. Here is our retention schedule:</p>
      <ul>
        <li><strong>Clinical notes and diet plans:</strong> Kept for the duration of your active relationship with Diet By RD, plus 3 years thereafter — as required by clinical record-keeping standards in India</li>
        <li><strong>Payment records:</strong> Retained for 7 years as required by Indian GST and tax compliance law. We cannot delete these on request — this is a legal obligation, and we will tell you so clearly if you ask</li>
        <li><strong>Referral data before payment:</strong> Deleted automatically within 24 hours if you do not complete your payment</li>
        <li><strong>Account data:</strong> Deleted within 30 days of your account closure, unless retained as part of clinical or financial records above</li>
        <li><strong>Audit logs:</strong> Retained for 7 years as our legal evidence archive — this is your protection as much as ours</li>
      </ul>

      <h2>7. How We Protect Your Information</h2>
      <p>We have built security into the foundation of Diet By RD — not as an afterthought.</p>
      <ul>
        <li>Every page of Diet By RD uses 256-bit SSL encryption — the same standard used by banks</li>
        <li>Your sensitive data — phone number, clinical notes — is encrypted in our database, not stored as plain text</li>
        <li>Your uploaded documents are stored in an encrypted, private file storage system. Files are never publicly accessible and links expire after 72 hours</li>
        <li>Access to your data is controlled by technical permission systems based on role — not just internal policies</li>
        <li>Every sensitive action in our system is recorded in a tamper-resistant audit log. If anyone accesses your data inappropriately, we will know</li>
        <li>We conduct regular security reviews and patch vulnerabilities before they can be exploited</li>
      </ul>

      <h2>8. Your Rights — And How to Exercise Them</h2>
      <p>Under India's Digital Personal Data Protection Act 2023, you have rights over your data. We respect these rights and have built tools to help you exercise them without friction.</p>
      <ul>
        <li><strong>Right to Access:</strong> Request a complete export of everything we hold about you. Available from your profile in the app — verified by OTP, delivered to your WhatsApp within 24 hours</li>
        <li><strong>Right to Correction:</strong> Ask us to correct any inaccurate information in your profile. Email us at <a href="mailto:hello@dietbyrd.com">hello@dietbyrd.com</a></li>
        <li><strong>Right to Erasure:</strong> Request deletion of your account and personal data. Some records — clinical notes and payment records — may need to be retained by law. We will tell you exactly what we can and cannot delete, and why</li>
        <li><strong>Right to Withdraw Marketing Consent:</strong> Stop receiving marketing or non-essential communications at any time by replying STOP to any WhatsApp message or emailing <a href="mailto:hello@dietbyrd.com">hello@dietbyrd.com</a></li>
      </ul>

      <h3>Our Grievance Officer</h3>
      <p>If you have a concern about how we have handled your data — or anything at all about your privacy — contact our Grievance Officer directly:</p>
      <p>Aryan<br />
      Founder, Diet By RD Private Limited<br />
      Email: <a href="mailto:hello@dietbyrd.com">hello@dietbyrd.com</a></p>
      <p><strong>Response commitment:</strong> We will acknowledge your concern within 3 business days and resolve it within 30 days. This is not a legal formality — it is a personal commitment.</p>

      <h2>9. Not an Emergency Service</h2>
      <p>Diet By RD is not an emergency medical service. If you are experiencing a medical emergency, please call your local emergency number or visit the nearest hospital immediately.</p>

      <h2>10. Changes to This Policy</h2>
      <p>When we update this Privacy Policy, we will notify you via WhatsApp or email before the changes take effect. We will tell you what changed and why. The updated version will always be available at dietbyrd.com/privacy, with the version number and effective date clearly displayed.</p>
    </div>
  </LegalLayout>
);

export default Privacy;
