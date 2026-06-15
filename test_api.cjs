const https = require('https');

const options = {
  hostname: 'dietbyrd.buildc3.tech',
  path: '/api/patient/me/appointments',
  method: 'GET',
  headers: {
    'x-user-id': '101',
    'x-user-role': 'patient',
    'x-patient-id': '60'
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Body: ${data}`);
  });
});

req.on('error', (error) => {
  console.error(error);
});

req.end();
