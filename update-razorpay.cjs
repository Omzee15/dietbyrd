const fs = require('fs');

const files = [
  'src/pages/PatientDashboard.tsx',
  'src/pages/patient/PatientAppointments.tsx',
  'src/components/PublicBookingModal.tsx'
];

const configStr = `
        config: {
          display: {
            blocks: {
              upi: {
                name: "Pay via UPI",
                instruments: [{ method: "upi" }],
              },
              other: {
                name: "Other Payment Modes",
                instruments: [{ method: "card" }, { method: "netbanking" }, { method: "wallet" }],
              },
            },
            sequence: ["block.upi", "block.other"],
            preferences: { show_default_blocks: false },
          },
        },`;

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  if (!content.includes('config: {') || !content.includes('sequence: ["block.upi"')) {
    content = content.replace(/order_id:\s*(order|response)\.razorpay_order_id,/, match => match + configStr);
    fs.writeFileSync(f, content);
    console.log('Updated ' + f);
  } else {
    console.log('Skipped ' + f);
  }
});
