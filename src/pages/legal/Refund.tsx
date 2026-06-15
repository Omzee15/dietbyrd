import LegalLayout from "./LegalLayout";

const Refund = () => (
  <LegalLayout title="Refund Policy" lastUpdated="May 2026">
    <div className="legal-page">
      <h2>1. Full Refund — No Questions Asked</h2>
      <p>You are entitled to a complete, immediate refund if:</p>
      <ul>
        <li>You request a refund within 24 hours of payment and no consultation has been scheduled or taken place</li>
        <li>Your consultation could not take place due to a technical failure on our end</li>
        <li>Your assigned Registered Dietitian was unavailable and we were unable to offer you an alternative slot within 72 hours</li>
        <li>You were charged incorrectly due to a billing error on our system</li>
      </ul>
      <p>In any of the above circumstances, your refund will be initiated within 24 hours of your request and will reflect in your account within 5–7 business days, depending on your bank or payment provider.</p>

      <h2>2. Partial Refund — At Our Discretion</h2>
      <p>We may consider a partial refund in the following circumstances, reviewed case by case with genuine fairness:</p>
      <ul>
        <li>You have a documented personal or medical emergency that prevented you from attending a scheduled consultation</li>
        <li>The quality of your consultation was demonstrably below the standard we hold ourselves to, and we are unable to satisfactorily address your concern</li>
      </ul>
      <p>We will always review such requests with empathy and without bureaucratic rigidity. Write to us at <a href="https://mail.google.com/mail/?view=cm&fs=1&to=hello@dietbyrd.com" target="_blank" rel="noopener noreferrer">hello@dietbyrd.com</a> with a brief explanation. We will respond within 24 hours.</p>

      <h2>3. No Refund</h2>
      <p>A refund will not be issued in the following circumstances:</p>
      <ul>
        <li>The consultation has been completed</li>
        <li>You cancelled your slot with less than 24 hours notice</li>
        <li>You did not attend your scheduled slot</li>
        <li>You request a refund more than 7 days after your payment date without a compelling documented reason</li>
        <li>You disagree with the clinical recommendations made by your Registered Dietitian — our RDs provide evidence-based guidance; we cannot issue refunds on the basis of dietary disagreement</li>
      </ul>
      <p>If you have concerns about the advice you received, please contact us at <a href="https://mail.google.com/mail/?view=cm&fs=1&to=hello@dietbyrd.com" target="_blank" rel="noopener noreferrer">hello@dietbyrd.com</a>. We will review the matter with your RD and follow up with you directly.</p>

      <h2>4. Subscription Refunds</h2>
      <p>Monthly subscription payments are non-refundable once the billing cycle has begun. When you cancel your subscription:</p>
      <ul>
        <li>Your access continues until the end of the period you have already paid for</li>
        <li>You will not be charged again after cancellation</li>
        <li>No partial refund is issued for the remaining days of the current billing period</li>
      </ul>
      <p>This is consistent with standard subscription service practice and is stated transparently at the time of subscription so there are no surprises.</p>

      <h2>5. How to Request a Refund</h2>
      <p>Email us at <a href="https://mail.google.com/mail/?view=cm&fs=1&to=hello@dietbyrd.com" target="_blank" rel="noopener noreferrer">hello@dietbyrd.com</a> with the subject line "Refund Request" and include:</p>
      <ul>
        <li>Your registered mobile number</li>
        <li>Your payment date and amount</li>
        <li>The reason for your refund request</li>
      </ul>
      <p>We will acknowledge your request within 3 business hours and resolve it within 24–48 hours. Approved refunds are processed within 5–7 business days to your original payment method.</p>
    </div>
  </LegalLayout>
);

export default Refund;
