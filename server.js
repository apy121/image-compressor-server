const express = require('express');
const mongoose = require('mongoose');
const csv = require('csv-parser');
const fs = require('fs');
const fileUpload = require('express-fileupload');
const { v4: uuidv4 } = require('uuid');
const sharp = require('sharp');
const axios = require('axios');
const cors = require('cors');
const { uploadFileToAwsS3Bucket } = require('./fileUploadService');
const mongodbConfig = require('./config/mongodbConfig');

const app = express();
const PORT = 3000;

// Enable CORS middleware
app.use(cors());

// Enable file upload middleware
app.use(fileUpload({ useTempFiles: true, tempFileDir: '/tmp/' }));
app.use(express.json());

// MongoDB Connection
mongoose.connect(mongodbConfig.mongoDB.baseUrl, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Schema
const RequestSchema = new mongoose.Schema({
  requestId: String,
  status: { type: String, default: 'pending' },
  products: [
    {
      serialNumber: Number,
      productName: String,
      inputImageUrls: [String],
      outputImageUrls: [String],
    },
  ],
  webhookUrl: String,
});

const Request = mongoose.model('Request', RequestSchema);

// Upload API
app.post('/api/upload', async (req, res) => {
  if (!req.files || !req.files.csvFile) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const requestId = uuidv4();
  const filePath = req.files.csvFile.tempFilePath;

  const products = [];
  fs.createReadStream(filePath)
    .pipe(csv())
    .on('data', (row) => {
      const inputImageUrls = row['Input Image Urls'] ? row['Input Image Urls'].split(',').map((url) => url.trim()) : [];
      products.push({
        serialNumber: parseInt(row['S. No.']) || 0,
        productName: row['Product Name'] || '',
        inputImageUrls,
        outputImageUrls: [],
      });
    })
    .on('end', async () => {
      const request = new Request({
        requestId,
        products,
        webhookUrl: req.body.webhookUrl || '',
      });
      await request.save();

      // Start async processing with the request object
      processImages(request); // Pass the request object, not just requestId

      res.json({ requestId });
    });
});

// Status API
app.get('/api/status/:requestId', async (req, res) => {
  const request = await Request.findOne({ requestId: req.params.requestId });
  if (!request) return res.status(404).json({ error: 'Request not found' });
  res.json({ status: request.status, products: request.products }); // Include products for debugging
});

// Add this new route before app.listen()
app.post('/api/webhook', (req, res) => {
  const { requestId, status, products } = req.body;
  console.log(`Received webhook for request ${requestId}: ${status}`);
  res.status(200).send('Webhook received');
});

// Add SSE endpoint for real-time updates
app.get('/api/webhook', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  // This is a simple implementation - in production you'd want to track connections
  const sendEvent = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  // In a real app, you'd register this sender with a proper event system
  global.sseSenders = global.sseSenders || [];
  global.sseSenders.push(sendEvent);

  req.on('close', () => {
    global.sseSenders = global.sseSenders.filter(sender => sender !== sendEvent);
  });
});

// Modify the processImages function to send SSE events
async function processImages(request) {
  // Update status to processing
  request.status = 'processing';
  await request.save();
  sendSSEEvent(request.requestId, 'processing');

  await Promise.all(
    request.products.map(async (product) => {
      if (!product.outputImageUrls) product.outputImageUrls = [];
      await Promise.all(
        product.inputImageUrls.map(async (url) => {
          try {
            const response = await axios.get(url, { responseType: 'arraybuffer' });
            const compressedImage = await sharp(response.data)
              .jpeg({ quality: 50 })
              .toBuffer();

            const uploadResponse = await uploadFileToAwsS3Bucket(
              compressedImage,
              `${uuidv4()}.jpg`,
              'image/jpeg'
            );

            product.outputImageUrls.push(uploadResponse.fileUrl);
          } catch (error) {
            console.error(`Error processing ${url}:`, error);
          }
        })
      );
    })
  );

  // Update status to completed
  request.status = 'completed';
  await request.save();
  sendSSEEvent(request.requestId, 'completed', request.products);
}

// Helper function to send SSE events
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

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));