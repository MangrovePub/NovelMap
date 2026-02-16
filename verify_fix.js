
const http = require('http');
const fs = require('fs');

const payload = JSON.stringify({
    candidates: [
        { text: "Test Ignore", type: "ignore" },
        { text: "Test Valid", type: "character" },
        { text: "Test Invalid", type: "INVALID_TYPE" }
    ]
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
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        const output = `Status: ${res.statusCode}\nBody: ${data}`;
        console.log(output);
        fs.writeFileSync('verify_result.txt', output);
    });
});

req.on('error', (error) => {
    console.log(`Error: ${error.message}`);
    fs.writeFileSync('verify_result.txt', `Error: ${error.message}`);
});

req.write(payload);
req.end();
