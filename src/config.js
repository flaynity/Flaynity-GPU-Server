const dotenv = require('dotenv');

dotenv.config();

const config = {
  port: Number(process.env.PORT || 3001),
  nodeEnv: process.env.NODE_ENV || 'development',
  r2: {
    endpoint: process.env.R2_ENDPOINT,
    region: process.env.R2_REGION || 'auto',
    bucketName: process.env.R2_BUCKET_NAME,
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    publicBaseUrl: process.env.R2_PUBLIC_BASE_URL || 'https://cdn.flaynity.indevs.in',
  },
  workDir: process.env.WORK_DIR || '/tmp/flaynity-gpu',
  flaynityServerUrl: process.env.FLAYNITY_SERVER_URL || 'http://localhost:3000',
  ffmpegPreset: process.env.FFMPEG_PRESET || 'medium',
  ffmpegCrf: Number(process.env.FFMPEG_CRF || 28),
  gpuEnabled: (process.env.GPU_ENABLED || 'false').toLowerCase() === 'true',
};

module.exports = config;
