## Summary
Batch 1 of client feedback fixes mapped to handwritten notes + Om Gupta WhatsApp call transcript + dietbyrd-website.html blueprint + dietbyrd-legal-document.docx.

## Phases shipped
- **Phase 0** - Enter key fix on patient booking
- **Phase 1** - Landing aligned to client blueprint (navy header, rectangular Rs 999, founder cards, Our Vision, Road Ahead, motion intro, scroll reveals)
- **Phase 2** - Legal pages /privacy /terms /refund /cancellation (verbatim from docx)
- **Phase 3** - Reset password for Doctor / Dietician / Patient
- **Phase 4** - Join-request messaging admin/MLT to doctor/dietician
- **Phase 5** - Support portal (patients list, ticket lifecycle, patient threads)
- **Phase 6** - Microcopy: Book New Appointment
- **Phase 7** - Doctor commission system (15 percent default, admin-editable, post-payment)
- **Phase 8** - Profile dropdown when authenticated

## DB migrations included
- password_reset_tokens
- join_request_messages
- support_tickets + support_ticket_messages
- doctor_commissions + users.commission_percent

## Risk areas - review carefully
- Razorpay webhook handler (commission insert): verify no payment regression
- Supabase RLS for new tables: confirm policies for each role
- Landing.tsx is 1188 lines: large diff, skim section-by-section

## Skipped - need client clarification
- Admin-panel delete button: delete what entity?
- Functional coupon orders / partnership flow: unparseable from notes

## Testing
- npx pnpm build OK
- Local smoke test: Enter key on booking, /privacy loads, /forgot-password reachable, dummy Razorpay test payment

## Preview
Netlify preview URL will be posted by the deploy bot below.
