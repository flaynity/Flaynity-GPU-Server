const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');
const config = require('./config');

const r2Client = new S3Client({
  region: config.r2.region,
  endpoint: config.r2.endpoint,
  credentials: {
    accessKeyId: config.r2.accessKeyId,
    secretAccessKey: config.r2.secretAccessKey,
  },
  forcePathStyle: true,
});

async function uploadDirectoryToR2(localDir, keyPrefix, options = {}) {
  const files = [];

  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else {
        files.push(fullPath);
      }
    }
  }

  walk(localDir);

  const uploaded = [];

  for (const filePath of files) {
    const relativePath = path.relative(localDir, filePath).replace(/\\/g, '/');
    const objectKey = `${keyPrefix.replace(/^\/+|\/+$/g, '')}/${relativePath}`;

    const fileContent = fs.readFileSync(filePath);
    await r2Client.send(
      new PutObjectCommand({
        Bucket: config.r2.bucketName,
        Key: objectKey,
        Body: fileContent,
        ContentType: detectContentType(filePath),
        CacheControl: options.cacheControl || 'public, max-age=31536000',
      }),
    );

    uploaded.push({
      key: objectKey,
      url: `${config.r2.publicBaseUrl}/${objectKey}`,
    });
  }

  return uploaded;
}

function detectContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.m3u8') return 'application/vnd.apple.mpegurl';
  if (ext === '.ts') return 'video/mp2t';
  if (ext === '.json') return 'application/json';
  return 'application/octet-stream';
}

module.exports = {
  uploadDirectoryToR2,
  r2Client,
};
