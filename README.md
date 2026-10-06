# Flaynity GPU Server

A Node.js-based transcoding worker for the Flaynity platform.

This server accepts a source video, creates HLS playlists in multiple qualities, and uploads the generated assets to Cloudflare R2.

## Highlights
- Supports adaptive bitrate HLS output
- Quality ladder: 360p, 480p, 720p, 1080p
- Supports CPU and GPU (NVENC) transcoding when available
- Generates `master.m3u8`
- Uploads to R2 bucket with layout:
  - `/media/uploads/hls/{jobId}/master.m3u8`
  - `/media/uploads/hls/{jobId}/360p/playlist.m3u8`
  - `/media/uploads/hls/{jobId}/480p/playlist.m3u8`
  - `/media/uploads/hls/{jobId}/720p/playlist.m3u8`
  - `/media/uploads/hls/{jobId}/1080p/playlist.m3u8`

## Environment variables
Copy `.env.example` to `.env` and fill in the values.

## Local run
```bash
npm install
cp .env.example .env
npm run dev
```

## Example request
```bash
curl -X POST http://localhost:3001/api/jobs/create \
  -H "Content-Type: application/json" \
  -d '{
    "sourceUrl": "https://example.com/video.mp4",
    "jobId": "demo-job-123",
    "meta": {
      "videoProvider": "r2-hls"
    }
  }'
```

## Result
The server responds with a job object like:
```json
{
  "id": "demo-job-123",
  "status": "processing",
  "videoProvider": "r2-hls",
  "videoLink": "https://cdn.flaynity.indevs.in/media/uploads/hls/demo-job-123/master.m3u8",
  "videoUrl": "demo-job-123/master.m3u8",
  "hlsUrl": "demo-job-123/master.m3u8"
}
```

## Deployment
The app is designed to work behind a Node.js hosting platform and can be deployed to:
- Render
- Railway
- DigitalOcean App Platform
- VPS / Docker host

## Notes
- If a GPU encoder is available, the worker prefers `h264_nvenc`.
- If not, it falls back to `libx264`.
- HLS output should be fed through a CDN or Cloudflare R2 public URL.
