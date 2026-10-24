// Mit KI erstellt (KI-Log Nr. 8), vom Team geprüft.
const http = require('http');

/**
 * Ein Mini-Server, der einen Fach-Service (catalog/orders) spielt.
 * Er merkt sich jede Anfrage, damit Tests prüfen können, was das gateway weitergeleitet hat.
 */
function startFakeUpstream(name, respond) {
  const calls = [];
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      const call = { method: req.method, url: req.url, headers: req.headers, body };
      calls.push(call);
      const custom = respond && respond(call);
      const { status = 200, json = { service: name, method: req.method, url: req.url } } = custom || {};
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(json));
    });
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      resolve({
        url: `http://127.0.0.1:${server.address().port}`,
        calls,
        close: () => new Promise((r) => server.close(r))
      });
    });
  });
}

module.exports = { startFakeUpstream };
