#!/bin/bash
echo "Testing Invalid Type..."
curl -v -X POST http://localhost:3001/api/projects/1/extract/confirm \
  -H "Content-Type: application/json" \
  -d '{"candidates":[{"text":"Test Invalid","type":"INVALID_TYPE"}]}' > invalid_response.txt 2>&1

echo "Testing Ignore Type..."
curl -v -X POST http://localhost:3001/api/projects/1/extract/confirm \
  -H "Content-Type: application/json" \
  -d '{"candidates":[{"text":"Test Ignore","type":"ignore"}]}' > ignore_response.txt 2>&1
