const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const ffmpegPath = require('ffmpeg-static');
const config = require('./config');

const QUALITY_PRESETS = [
  { name: '360p', scale: '640:360', bitrate: '800k', width: 640, height: 360 },
  { name: '480p', scale: '854:480', bitrate: '1200k', width: 854, height: 480 },
  { name: '720p', scale: '1280:720', bitrate: '2500k', width: 1280, height: 720 },
  { name: '1080p', scale: '1920:1080', bitrate: '5000k', width: 1920, height: 1080 },
];

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(`Command failed (${code}): ${stderr || stdout}`));
      }
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}

function getVideoEncoderArgs() {
  if (config.gpuEnabled) {
    return ['-c:v', 'h264_nvenc', '-preset', config.ffmpegPreset, '-crf', String(config.ffmpegCrf)];
  }

  return ['-c:v', 'libx264', '-preset', config.ffmpegPreset, '-crf', String(config.ffmpegCrf)];
}

async function processQuality(job, preset) {
  const qualityDir = path.join(job.outputDir, preset.name);
  ensureDir(qualityDir);

  const playlistPath = path.join(qualityDir, 'playlist.m3u8');
  const segmentPattern = path.join(qualityDir, 'segment-%03d.ts');

  const args = [
    '-y',
    '-i', job.inputFilePath,
    '-vf', `scale=${preset.scale}:force_original_aspect_ratio=decrease,pad=${preset.width}:${preset.height}:(ow-iw)/2:(oh-ih)/2`,
    '-c:v', config.gpuEnabled ? 'h264_nvenc' : 'libx264',
    '-preset', config.ffmpegPreset,
    '-crf', String(config.ffmpegCrf),
    '-c:a', 'aac',
    '-ar', '48000',
    '-movflags', '+faststart',
    '-f', 'hls',
    '-hls_time', '6',
    '-hls_playlist_type', 'vod',
    '-hls_flags', 'independent_segments',
    '-hls_segment_filename', segmentPattern,
    playlistPath,
  ];

  await runCommand(ffmpegPath, args);

  return {
    name: preset.name,
    playlist: playlistPath,
    publicPlaylistUrl: `${config.r2.publicBaseUrl}/media/uploads/hls/${job.id}/${preset.name}/playlist.m3u8`,
  };
}

function generateMasterPlaylist(job, qualityOutputs) {
  const playlistLines = [
    '#EXTM3U',
    '#EXT-X-VERSION:3',
  ];

  for (const quality of qualityOutputs) {
    const bandwidth = getBandwidthForQuality(quality.name);
    const resolution = getResolutionForQuality(quality.name);
    playlistLines.push(`#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth},RESOLUTION=${resolution}`);
    playlistLines.push(`${quality.name}/playlist.m3u8`);
  }

  const masterPath = path.join(job.outputDir, 'master.m3u8');
  fs.writeFileSync(masterPath, `${playlistLines.join('\n')}\n`);
  return masterPath;
}

function getBandwidthForQuality(name) {
  const map = {
    '360p': 800000,
    '480p': 1200000,
    '720p': 2500000,
    '1080p': 5000000,
  };
  return map[name] || 800000;
}

function getResolutionForQuality(name) {
  const map = {
    '360p': '640x360',
    '480p': '854x480',
    '720p': '1280x720',
    '1080p': '1920x1080',
  };
  return map[name] || '640x360';
}

async function transcodeVideo(job) {
  const workBaseDir = path.join(config.workDir, job.id);
  const outputDir = path.join(workBaseDir, 'hls');
  ensureDir(outputDir);

  job.outputDir = outputDir;
  job.inputFilePath = job.inputFilePath || path.join(workBaseDir, 'source.mp4');

  const qualityOutputs = [];

  for (const preset of QUALITY_PRESETS) {
    const result = await processQuality(job, preset);
    qualityOutputs.push(result);
  }

  const masterPlaylistPath = generateMasterPlaylist(job, qualityOutputs);
  const masterPublicUrl = `${config.r2.publicBaseUrl}/media/uploads/hls/${job.id}/master.m3u8`;

  job.hlsDir = outputDir;
  job.masterPlaylistPath = masterPlaylistPath;
  job.masterPlaylistUrl = masterPublicUrl;
  job.videoLink = masterPublicUrl;
  job.videoUrl = `${job.id}/master.m3u8`;
  job.hlsUrl = `${job.id}/master.m3u8`;
  job.qualityOutputs = qualityOutputs;

  return job;
}

module.exports = {
  transcodeVideo,
  QUALITY_PRESETS,
  generateMasterPlaylist,
};
