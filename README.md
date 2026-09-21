# OmniDrive AI

> **Next-Generation Autonomous Serverless Cloud Storage & Multimodal Intelligence Platform**

[![React](https://img.shields.io/badge/React-18.x-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5.x-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![AWS](https://img.shields.io/badge/AWS-Serverless-FF9900?logo=amazon-aws&logoColor=white)](https://aws.amazon.com/)
[![Terraform](https://img.shields.io/badge/Terraform-1.5+-844FBA?logo=terraform&logoColor=white)](https://www.terraform.io/)
[![Cognito](https://img.shields.io/badge/Auth-Amazon_Cognito-D05C4C?logo=amazon-aws&logoColor=white)](https://aws.amazon.com/cognito/)
[![Bedrock](https://img.shields.io/badge/GenAI-Claude_3_Haiku-00A67E)](https://aws.amazon.com/bedrock/)

---

## 1. Executive Summary

**OmniDrive AI** is a cloud-native, event-driven intelligent storage engine engineered on AWS serverless technologies and React. Designed for high throughput and zero idle costs ($0 baseline), it combines high-speed direct client-to-S3 binary streaming with autonomous multimodal AI transformation pipelines:

- **Automated Safety Gatekeeper**: Real-time content moderation powered by **AWS Rekognition**, instantly purging toxic or illegal media before ingestion.
- **Multimodal AI Pipelines**:
  - **Vision AI**: Object detection, scene classification, and dimensional extraction via AWS Rekognition.
  - **Document Intelligence**: Text extraction via **Amazon Textract** synthesized into executive summaries via **Amazon Bedrock (Anthropic Claude 3 Haiku)**.
  - **Adaptive Video Transcoder**: Event-driven **ECS Fargate ARM64** worker executing **FFmpeg 6.1** to produce multi-bitrate HLS adaptive streams (`1080p`, `720p`, `480p`).
- **Single-Table DynamoDB Registry**: Sub-millisecond queries, optimistic concurrency, and lifecycle tracking.
- **Enterprise Identity**: Full SRP email/password and Google OAuth 2.0 federation via **Amazon Cognito User Pools**.

---

## 2. System Architecture

```mermaid
graph TD
    User([User / Browser SPA]) -->|1. Authenticate with SRP or Google OAuth| Cognito[Amazon Cognito User Pool]
    Cognito -->|Returns JWT idToken| User

    User -->|2. POST /upload-url with JWT| APIGW[API Gateway HTTP API v2]
    APIGW -->|Cognito JWT Authorizer| PresignedLambda[Lambda: Presigned URL Generator]
    PresignedLambda -->|Writes PENDING_UPLOAD| DynamoDB[(DynamoDB: OmniDrive_Registry)]
    PresignedLambda -->|Returns 300s PUT URL| User

    User -->|3. Direct Binary Stream PUT| RawS3[S3: Raw Ingestion Bucket]
    RawS3 -->|4. ObjectCreated Event| EventBridge[Amazon EventBridge]
    EventBridge -->|Rule: prefix raw/*| IngestSQS[SQS: omnidrive-upload-queue]

    IngestSQS -->|Triggers Batch| ModerationLambda[Lambda: Moderation Gatekeeper]
    ModerationLambda -->|DetectModerationLabels| RekogMod[AWS Rekognition]

    ModerationLambda -->|VIOLATION: Delete binary & Quarantine| RawS3
    ModerationLambda -->|VIOLATION: Set REJECTED_SAFETY_VIOLATION| DynamoDB

    ModerationLambda -->|APPROVED: Dispatch by MIME| Router{Queue Router}
    Router -->|Images| VisionSQS[SQS: vision-queue]
    Router -->|PDFs| PdfSQS[SQS: pdf-queue]
    Router -->|Videos| VideoSQS[SQS: video-queue]

    VisionSQS -->|Triggers| VisionLambda[Lambda: Vision AI Worker]
    VisionLambda -->|DetectLabels & EXIF| DynamoDB

    PdfSQS -->|Triggers| PdfLambda[Lambda: PDF Summarizer Worker]
    PdfLambda -->|Textract OCR + Bedrock Claude 3| DynamoDB

    VideoSQS -->|Triggers| FargateWorker[ECS Fargate ARM64 Worker]
    FargateWorker -->|FFmpeg Multi-Bitrate HLS| ProcessedS3[S3: Processed Bucket]
    FargateWorker -->|HLS Master Playlist URL| DynamoDB

    User -->|5. GET /files or /files/{id}| APIGW
    APIGW -->|Cognito Authorizer| FilesLambda[Lambda: Files Registry API]
    FilesLambda -->|Query PK USER#...| DynamoDB
```

---

## 3. Project Structure

```
omnidrive-ai/
├── frontend/                     # Modern React Single Page Application (SPA)
│   ├── src/
│   │   ├── features/
│   │   │   ├── auth/             # Cognito AuthContext, SRP API, Google OAuth Hosted UI
│   │   │   ├── dashboard/        # Storage management, file viewer, HLS video player
│   │   │   └── public/           # Landing page, pricing calculator, safety portal
│   │   ├── shared/               # Custom hooks, design system, API clients
│   │   └── routes/               # Protected and public route guards
│   ├── package.json
│   ├── vite.config.js
│   └── .gitignore
│
├── backend/                      # Cloud & Serverless Infrastructure
│   ├── lambda/                   # Python 3.11+ Event-Driven Microservices
│   │   ├── presigned_url/        # POST /upload-url (S3 PUT generator + DynamoDB initialization)
│   │   ├── files/                # GET /files & GET /files/{id} (Registry reader with Decimal handling)
│   │   ├── moderation_gate/      # Rekognition content moderation gatekeeper & dispatcher
│   │   ├── vision_ai/            # Rekognition scene/object detection & dimensional inspection
│   │   └── pdf_summarizer/       # Amazon Textract OCR + Amazon Bedrock Claude 3 synthesis
│   │
│   ├── terraform/                # Infrastructure as Code (AWS Free-Tier Optimized)
│   │   ├── main.tf               # Root module composition
│   │   ├── variables.tf          # Configurable parameters
│   │   ├── outputs.tf            # Exported endpoints, ARNs, and resource IDs
│   │   └── modules/              # Reusable Terraform Modules
│   │       ├── api_gateway/      # HTTP API v2 with CORS & Cognito JWT Authorizer
│   │       ├── cognito/          # User Pool, Public SPA Client, and Hosted UI Domain
│   │       ├── dynamodb/         # Single-table schema, GSIs, and On-Demand billing
│   │       ├── ecs_fargate/      # ARM64 Graviton task definition & IAM execution roles
│   │       ├── lambda/           # Packaging, IAM least-privilege roles, & event triggers
│   │       ├── s3_buckets/       # Raw & processed buckets with CORS & EventBridge
│   │       └── sqs_eventbridge/  # Dead-letter queues, ingestion queue, worker fan-out
│   │
│   ├── workers/                  # Containerized Heavy-Compute Task Workers
│   │   └── video_transcoder/     # ECS Fargate ARM64 Dockerfile & FFmpeg HLS script
│   │
│   ├── tests/                    # Automated Backend Test Suite
│   │   └── test_lambda_handlers.py # Comprehensive unit tests with mocked AWS SDK
│   └── .gitignore
│
├── .gitignore                    # Repository-level OS & editor ignore rules
└── README.md                     # Platform documentation
```

---

## 4. Getting Started

### Prerequisites
- **Node.js**: v18.0 or higher
- **Python**: v3.11 or higher
- **AWS CLI**: Configured with appropriate IAM permissions
- **Terraform**: v1.5 or higher (for cloud deployment)

---

### Local Frontend Development

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. Configure environment variables (copy from example):
   ```bash
   cp .env.example .env
   ```
   Fill in your AWS Cognito configuration values:
   ```env
   VITE_AWS_REGION=us-east-1
   VITE_COGNITO_USER_POOL_ID=us-east-1_xxxxxxxxx
   VITE_COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
   VITE_COGNITO_DOMAIN=omnidrive-ai-auth.auth.us-east-1.amazoncognito.com
   VITE_REDIRECT_SIGN_IN=http://localhost:3000/dashboard
   VITE_REDIRECT_SIGN_OUT=http://localhost:3000
   VITE_API_GATEWAY_URL=https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com
   ```
4. Launch Vite development server:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

---

### Running Backend Unit Tests

The backend includes a comprehensive mock test suite covering all 5 Lambda handlers and the video transcoder worker:

```bash
# Run tests from repository root
py backend/tests/test_lambda_handlers.py
```

Expected output:
```
..SAFETY VIOLATION DETECTED for s3://test-raw-bucket/raw/user-12345/file-999/bad_image.jpg: [{'name': 'Explicit Nudity', 'parent': None, 'confidence': 98.5}]
.........
----------------------------------------------------------------------
Ran 9 tests in 0.059s

OK
```

---

### Deploying AWS Infrastructure via Terraform

1. Navigate to the Terraform module:
   ```bash
   cd backend/terraform
   ```
2. Initialize Terraform providers:
   ```bash
   terraform init
   ```
3. Review planned resources:
   ```bash
   terraform plan
   ```
4. Deploy the serverless infrastructure:
   ```bash
   terraform apply -auto-approve
   ```
5. Copy the output values (`api_endpoint`, `cognito_user_pool_id`, `cognito_client_id`, `cognito_hosted_ui_domain`) directly into your `frontend/.env` file.

---

## 5. Security & Architectural Best Practices

- **Zero Client Credentials**: The frontend never receives AWS access keys or secret keys. Authentication relies strictly on short-lived Cognito JWT ID tokens.
- **Direct S3 Streaming**: Clients stream binaries directly to S3 via temporary (300-second) presigned URLs. No file binaries ever pass through API Gateway or Lambda memory buffers, preventing timeouts and out-of-memory errors.
- **Least-Privilege IAM**: Every microservice and container task operates under a strictly scoped IAM role.
- **Quarantine-on-Arrival**: Untrusted content is isolated in `raw/`. Toxic or explicit files are immediately and permanently erased by the moderation gatekeeper before any downstream processing begins.
- **True $0 Idle Scale**: DynamoDB on-demand billing, SQS pay-per-request, Lambda sub-second execution billing, and self-terminating Fargate tasks ensure zero charges when the platform is idle.

---

## 6. License & Maintainers

Built with modern cloud-native engineering standards. Licensed under the [MIT License](LICENSE).
