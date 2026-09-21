/**
 * Public Feature API Layer
 * Pure async functions for public marketing telemetry and plans.
 */

export const getTelemetryStats = async () => {
  // Simulated AWS EventBridge & SQS live stream telemetry
  return {
    msgsPerSec: 14280 + Math.floor(Math.random() * 450 - 225),
    latencyMs: +(11.4 + (Math.random() * 0.8 - 0.4)).toFixed(1),
    activeRunners: 48,
    uptimeSla: "99.999%",
    zeroNatCost: true,
  };
};

export const getPricingPlans = async () => {
  return [
    {
      id: "free",
      name: "Free Sandbox",
      price: "$0",
      period: "forever",
      description: "Ideal for individual developers exploring AWS serverless AI media pipelines.",
      badge: "AWS Free Tier",
      features: [
        "15 GB Amazon S3 Storage",
        "Direct-to-S3 Multi-Part Uploads",
        "Rekognition Content Moderation",
        "720p HLS Video Transcoding",
        "Bedrock Claude 3 Document Summaries (50 docs/mo)",
        "Community Support",
      ],
      buttonText: "Start Free with Google",
      popular: false,
    },
    {
      id: "pro",
      name: "Pro Cloud",
      price: "$19",
      period: "/month",
      description: "For creators and fast-growing teams needing fast parallel transcoding and deep AI extraction.",
      badge: "Most Popular",
      features: [
        "2 TB Dedicated S3 Multi-Region Storage",
        "Instant 1080p & 4K HLS Adaptive Streaming",
        "Unlimited Rekognition Scene & Face Tagging",
        "High-Throughput Bedrock Claude 3 Indexing",
        "Automated Quarantine & Moderation Webhooks",
        "99.99% Availability SLA & Priority Support",
      ],
      buttonText: "Start 14-Day Free Trial",
      popular: true,
    },
    {
      id: "enterprise",
      name: "Enterprise Dedicated",
      price: "Custom",
      period: "annual billing",
      description: "Dedicated AWS VPC infrastructure, BYOK encryption, and custom Graviton3 container clusters.",
      badge: "Enterprise Dedicated",
      features: [
        "Unlimited AWS S3 Storage within Customer VPC",
        "Dedicated ARM64 Fargate Cluster (1,000+ tasks)",
        "Customer-Managed KMS Keys (FIPS 140-2 Level 3)",
        "Zero Model Retention Bedrock LLM Endpoints",
        "Google Workspace SAML & AWS Cognito SSO (RBAC)",
        "24/7 Dedicated Solutions Architect & 99.999% SLA",
      ],
      buttonText: "Contact Enterprise Sales",
      popular: false,
    },
  ];
};
