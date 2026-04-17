const http = require('http');

const body = JSON.stringify({
  email: "alberthospital77@gmail.com",
  password: "albert123",
  role: "hospital_admin",
  fullName: "Albert Hospital"
});

const req = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/api/developer/create',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body)
  }
}, res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Headers: ${JSON.stringify(res.headers)}`);
    console.log(`Body:\n${data}`);
  });
});

req.on('error', e => console.error(e));
req.write(body);
req.end();
