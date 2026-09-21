/**
 * Public Feature API Layer
 * Pure async functions for public marketing and plans.
 */


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
      badge: "Pro Tier",
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
      name: "Enterprise",
      price: "Custom",
      period: "annual billing",
      description: "Dedicated AWS VPC infrastructure with BYOK encryption and custom Graviton3 clusters.",
      badge: "Dedicated VPC",
      features: [
        "Unlimited S3 Storage in Customer VPC",
        "Dedicated ARM64 Fargate Task Cluster",
        "Customer-Managed KMS Keys (BYOK)",
        "Zero Model Retention Bedrock Endpoints",
        "Google Workspace & Cognito SSO (RBAC)",
        "24/7 Solutions Architect & 99.999% SLA",
      ],
      buttonText: "Contact Enterprise Sales",
      popular: false,
    },
  ];
};
