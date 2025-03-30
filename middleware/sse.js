// middleware/sse.js
function setupSSE(req, res) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
  
    const sendEvent = (data) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };
  
    global.sseSenders = global.sseSenders || [];
    global.sseSenders.push(sendEvent);
  
    req.on('close', () => {
      global.sseSenders = global.sseSenders.filter(sender => sender !== sendEvent);
    });
  }
  
  function sendSSEEvent(requestId, status, products = []) {
    if (!global.sseSenders) return;
    const data = { requestId, status };
    if (products.length > 0) data.products = products;
  
    global.sseSenders.forEach(sender => {
      try {
        sender(data);
      } catch (err) {
        console.error('Error sending SSE event:', err);
      }
    });
  }
  
  module.exports = { setupSSE, sendSSEEvent };