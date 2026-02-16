
const http = require('http');

const payload = JSON.stringify({
    candidates: [{ text: "Test Invalid", type: "INVALID_TYPE" }]
});

const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/projects/1/extract/confirm',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': payload.length
    }
};

const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    res.on('end', () => {
        const fs = require('fs');
        fs.writeFileSync('probe_result.txt', `Status: ${res.statusCode}\nBody: ${data}`);
        console.log('Response written to probe_result.txt');
    });
});

req.on('error', (error) => {
    const fs = require('fs');
    fs.writeFileSync('probe_result.txt', `Error: ${error.message}`);
});

req.write(payload);
req.end();
