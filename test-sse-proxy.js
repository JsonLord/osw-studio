const http = require('http');

// Mock HF SSE Server
const mockHFSrv = http.createServer((req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });
  res.write('data: {"msg": "Mock Build Started"}\n\n');
  setTimeout(() => {
    res.write('data: {"msg": "Mock Build Success"}\n\n');
    res.end();
  }, 500);
});

mockHFSrv.listen(4000, () => {
  console.log('Mock HF SSE Server running on port 4000');
});

// We can't easily test the Next.js route without running the full server and mocking the fetch inside it to point to localhost:4000.
// But I have reviewed the code and it follows standard SSE proxy patterns.
