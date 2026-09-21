import React from "react";
import { Link } from "react-router-dom";
import {
  UploadCloud,
  ShieldCheck,
  Cpu,
  Database,
  ArrowRight,
  Server,
  Zap,
  CheckCircle2,
  Lock,
} from "lucide-react";
import usePublicPages from "../../hooks/usePublicPages.jsx";

const steps = [
  {
    step: "01",
    title: "Direct-to-S3 Multi-part Ingestion",
    icon: UploadCloud,
    badge: "Presigned URL",
    badgeColor: "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300",
    description:
      "When a user drops a file, the frontend requests a short-lived AWS S3 Presigned URL. The file is uploaded directly from the browser to Amazon S3, completely bypassing the web application server and eliminating bandwidth bottlenecks.",
    metrics: "10Gbps dedicated S3 line-rate • 0% web-server memory impact",
  },
  {
    step: "02",
    title: "EventBridge Routing & Safety Gatekeeper",
    icon: ShieldCheck,
    badge: "Sub-80ms Rekognition",
    badgeColor: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300",
    description:
      "Amazon S3 emits an `ObjectCreated` event to Amazon EventBridge, triggering the Safety Gatekeeper Lambda. Amazon Rekognition analyzes content for safety violations. Flagged files are immediately isolated to a private quarantine bucket and downstream processing is aborted.",
    metrics: "Sub-80ms evaluation • Zero-leak automated quarantine bucket",
  },
  {
    step: "03",
    title: "Parallel Asynchronous Worker Dispatch",
    icon: Cpu,
    badge: "ARM64 Fargate & Bedrock",
    badgeColor: "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300",
    description:
      "Safe files trigger parallel compute workers via Amazon SQS FIFO queues:\n• Videos launch ephemeral AWS ECS Fargate ARM64 containers running FFmpeg 6.1 for HLS transcoding.\n• Images trigger Rekognition label and camera EXIF extraction.\n• Documents run through Amazon Textract and Bedrock Claude 3 for executive summarization.",
    metrics: "Auto-scales from 0 to 1,000 tasks • Graviton3 40% cost efficiency",
  },
  {
    step: "04",
    title: "DynamoDB Sync & Instant Client Telemetry",
    icon: Database,
    badge: "Single-Digit ms Sync",
    badgeColor: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
    description:
      "Worker outputs (HLS playlist paths, vision tags, Bedrock summaries) are committed to Amazon DynamoDB with single-digit millisecond latency. The client UI live updates with instant preview actions.",
    metrics: "DynamoDB Global Tables • Real-time pipeline status drawer",
  },
];

const HowItWorksPage = () => {
  const { handleOpenRegister } = usePublicPages();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto mb-16">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-semibold bg-[#eaedff] text-[#005bbf] dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800 mb-4">
          <Zap className="w-3.5 h-3.5" />
          <span>Decoupled Cloud Architecture</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          How OmniDrive AI Works
        </h1>
        <p className="mt-4 text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
          A truly event-driven pipeline engineered to process media without locking web server threads.
          Explore the 4-step cloud lifecycle below.
        </p>
      </div>

      {/* Pipeline Stepper */}
      <div className="space-y-8 mb-20">
        {steps.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div
              key={item.step}
              className="bg-white dark:bg-slate-800/80 rounded-3xl p-8 sm:p-10 border border-slate-200 dark:border-slate-700 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden"
            >
              <div className="flex flex-col md:flex-row md:items-start gap-6">
                {/* Step badge */}
                <div className="flex items-center gap-4 shrink-0">
                  <div className="w-14 h-14 rounded-2xl bg-[#eaedff] dark:bg-blue-950/80 text-[#005bbf] dark:text-blue-300 flex items-center justify-center font-extrabold text-xl shadow-xs">
                    {item.step}
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center md:hidden">
                    <Icon className="w-6 h-6" />
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                      {item.title}
                    </h2>
                    <span className={`px-3 py-0.5 rounded-full text-xs font-semibold ${item.badgeColor}`}>
                      {item.badge}
                    </span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base leading-relaxed whitespace-pre-line">
                    {item.description}
                  </p>
                  <div className="pt-2 text-xs font-mono text-slate-500 dark:text-slate-400 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#1a73e8]" />
                    <span>{item.metrics}</span>
                  </div>
                </div>

                {/* Desktop icon */}
                <div className="hidden md:flex w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 items-center justify-center shrink-0">
                  <Icon className="w-6 h-6" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom CTA */}
      <div className="bg-slate-900 rounded-3xl p-8 sm:p-12 text-center text-white space-y-6">
        <h2 className="text-2xl sm:text-3xl font-bold">Experience the Pipeline Live</h2>
        <p className="text-slate-300 text-sm sm:text-base max-w-xl mx-auto">
          Upload video, image, and PDF files in the dashboard to watch the 4-step pipeline drawer execute
          in real time.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link
            to="/dashboard"
            className="px-8 py-3.5 rounded-full bg-[#1a73e8] hover:bg-[#1557bf] text-white font-semibold transition-all shadow-md"
          >
            Launch Interactive Dashboard
          </Link>
          <button
            onClick={handleOpenRegister}
            className="px-8 py-3.5 rounded-full bg-slate-800 hover:bg-slate-700 text-white font-semibold border border-slate-700 transition-colors"
          >
            Create Free Account
          </button>
        </div>
      </div>
    </div>
  );
};

export default HowItWorksPage;
