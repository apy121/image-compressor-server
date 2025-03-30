// services/imageProcessing.js
const axios = require('axios');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const { uploadFileToAwsS3Bucket } = require('../fileUploadService');
const { sendSSEEvent } = require('../middleware/sse');

async function processImages(request) {
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

  request.status = 'completed';
  await request.save();
  sendSSEEvent(request.requestId, 'completed', request.products);
}

module.exports = { processImages };