import axiosInstance from "../../../shared/api/axiosClient.jsx";

/**
 * Layer 1: Dashboard API service
 * Pure async functions. Zero React hooks, zero Redux dispatch.
 */

// Initial mock data simulating DynamoDB records matching Stitch Screen c92855904475481fbd5bf45fb7c28a0b
const MOCK_FILES = [
  {
    id: "file-1",
    name: "product_launch_4k.mp4",
    type: "video",
    size: "64.8 MB",
    duration: "04:15",
    date: "10 mins ago",
    status: "COMPLETED",
    moderationPassed: true,
    hlsQualities: ["1080p", "720p", "480p"],
    activeQuality: "1080p",
    transcoderInfo: "AWS ECS Fargate ARM64 • FFmpeg HLS",
    thumbnail: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=600&q=80",
    previewSnippet: "Multi-bitrate HLS (.m3u8) ready for adaptive streaming.",
  },
  {
    id: "file-2",
    name: "tokyo_skyline.jpg",
    type: "image",
    size: "4.2 MB",
    date: "1 hour ago",
    status: "COMPLETED",
    moderationPassed: true,
    labels: [
      { name: "Urban", confidence: 99.4 },
      { name: "Architecture", confidence: 98.1 },
      { name: "Night Skyline", confidence: 95.7 },
      { name: "Metropolis", confidence: 92.0 },
      { name: "Skyscraper", confidence: 89.3 },
    ],
    exif: {
      camera: "Sony Alpha 7 IV",
      lens: "24-70mm F2.8 GM II",
      iso: "100",
      aperture: "f/2.8",
      shutter: "1/1200s",
    },
    thumbnail: "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=600&q=80",
    previewSnippet: "Detected 5 labels with 99.4% peak confidence.",
  },
  {
    id: "file-3",
    name: "AI_Strategy_2026.pdf",
    type: "pdf",
    size: "2.1 MB",
    pages: 14,
    date: "Yesterday",
    status: "COMPLETED",
    moderationPassed: true,
    summary: {
      executive: "Key takeaways: 3-tier hybrid cloud architecture reduces latency by 42%. Decoupled S3 direct uploads and ARM64 Fargate workers eliminate web server memory bloat while Amazon Bedrock Claude 3 indexes documents in sub-second intervals.",
      takeaways: [
        "Zero web-tier memory bottlenecks via direct presigned S3 uploads.",
        "Rekognition automated safety gate intercepts toxic content in <80ms.",
        "Fargate ARM64 Graviton3 workers transcode 1080p HLS multi-bitrate streams.",
        "Amazon Bedrock Claude 3 operates statelessly with zero customer data retention.",
      ],
      model: "Amazon Bedrock (Anthropic Claude 3 Haiku)",
      pages: 14,
    },
    previewSnippet: "Key takeaways: 3-tier hybrid cloud architecture reduces latency by 42%...",
  },
];

export const getFilesApi = async () => {
  await new Promise((r) => setTimeout(r, 200));
  return [...MOCK_FILES];
};

export const getPresignedUrlApi = async (fileMetadata) => {
  await new Promise((r) => setTimeout(r, 250));
  return {
    file_id: `file-${Date.now()}`,
    upload_url: `https://mock-s3-upload.aws.com/uploads/${encodeURIComponent(fileMetadata.name)}`,
    expires_in: 900,
  };
};

export const uploadToS3Api = async (uploadUrl, file, onProgress) => {
  return new Promise((resolve) => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += 25;
      if (onProgress) onProgress(progress);
      if (progress >= 100) {
        clearInterval(interval);
        resolve({ status: 200, message: "Uploaded to S3 successfully" });
      }
    }, 120);
  });
};

export const pollJobStatusApi = async (fileId) => {
  await new Promise((r) => setTimeout(r, 300));
  return {
    file_id: fileId,
    status: "COMPLETED",
    pipeline_step: "All AI processing finished",
  };
};
