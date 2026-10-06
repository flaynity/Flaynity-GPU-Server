const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const config = require('./config');
const { transcodeVideo } = require('./ffmpeg');

const jobs = new Map();

function createJob(data = {}) {
  const jobId = data.jobId || uuidv4();
  const now = new Date().toISOString();
  const sourceUrl = data.sourceUrl || '';

  const job = {
    id: jobId,
    status: 'queued',
    createdAt: now,
    updatedAt: now,
    sourceUrl,
    inputFilePath: data.inputFilePath || '',
    outputDir: '',
    masterPlaylistPath: '',
    masterPlaylistUrl: '',
    videoProvider: data.videoProvider || 'r2-hls',
    videoLink: '',
    videoUrl: '',
    hlsUrl: '',
    meta: data.meta || {},
    qualityOutputs: [],
  };

  jobs.set(jobId, job);
  return job;
}

function getJob(jobId) {
  return jobs.get(jobId) || null;
}

function getAllJobs() {
  return Array.from(jobs.values());
}

async function processJob(jobId) {
  const job = jobs.get(jobId);
  if (!job) {
    throw new Error(`Job not found: ${jobId}`);
  }

  job.status = 'processing';
  job.updatedAt = new Date().toISOString();

  try {
    const finalJob = await transcodeVideo(job);
    finalJob.status = 'completed';
    finalJob.updatedAt = new Date().toISOString();
    jobs.set(jobId, finalJob);
    return finalJob;
  } catch (error) {
    job.status = 'failed';
    job.error = error.message;
    job.updatedAt = new Date().toISOString();
    jobs.set(jobId, job);
    throw error;
  }
}

function ensureWorkspace() {
  const workDir = config.workDir;
  fs.mkdirSync(workDir, { recursive: true });
}

module.exports = {
  createJob,
  getJob,
  getAllJobs,
  processJob,
  jobs,
  ensureWorkspace,
};
