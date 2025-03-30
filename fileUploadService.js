const { aws } = require("./config/awsConfig");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { v4: uuidv4 } = require('uuid');


// Configure the AWS S3 client
const s3Client = new S3Client({
  region: aws.region,
  credentials: {
    accessKeyId: aws.access_key_id,
    secretAccessKey: aws.secret_access_Key,
    endpoint: `https://${aws.region}.amazonaws.com`, // Specify the endpoint explicitly
  },
});

async function uploadFileToAwsS3Bucket( fileBuffer, fileName, mimeType) {
    const bucketName = "mystartupdatabucket";
    const uniqueFileName = `folder2/${uuidv4()}-${fileName}`; // Add UUID to ensure unique file name
  
    const uploadParams = {
      Bucket: bucketName,
      Key: uniqueFileName,
      Body: fileBuffer,
      ContentType: mimeType,
    };
  
    try {
      // Upload the file
      const command = new PutObjectCommand(uploadParams);
      await s3Client.send(command);
  
      // Get the file URL
      const fileUrl = `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${uniqueFileName}`;
      return {
        fileUrl,
        fileName: fileName,
      };
    } catch (error) {
      throw new Error(`Failed to upload file to aws: ${error.message}`);
    }
  }
  


  module.exports = {
    uploadFileToAwsS3Bucket,
  };
  