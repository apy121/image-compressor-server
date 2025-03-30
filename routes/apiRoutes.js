// routes/apiRoutes.js
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const csv = require('csv-parser');
const fs = require('fs');
const Request = require('../models/requestModel');
const { setupSSE, sendSSEEvent } = require('../middleware/sse');
const { processImages } = require('../utils/ImageProcessing');

router.post('/upload', async (req, res) => {
  if (!req.files || !req.files.csvFile) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const requestId = uuidv4();
  const filePath = req.files.csvFile.tempFilePath;
  const products = [];

  fs.createReadStream(filePath)
    .pipe(csv())
    .on('data', (row) => {
      const inputImageUrls = row['Input Image Urls'] 
        ? row['Input Image Urls'].split(',').map((url) => url.trim()) 
        : [];
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

      processImages(request);
      res.json({ requestId });
    });
});

router.get('/status/:requestId', async (req, res) => {
  const request = await Request.findOne({ requestId: req.params.requestId });
  if (!request) return res.status(404).json({ error: 'Request not found' });
  res.json({ status: request.status, products: request.products });
});

router.post('/webhook', (req, res) => {
  const { requestId, status, products } = req.body;
  console.log(`Received webhook for request ${requestId}: ${status}`);
  res.status(200).send('Webhook received');
});

router.get('/webhook', setupSSE);

module.exports = router;