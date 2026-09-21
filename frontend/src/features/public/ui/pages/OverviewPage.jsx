import React from "react";
import { Link } from "react-router-dom";
import {
  Video,
  Eye,
  FileText,
  ShieldCheck,
  Zap,
  ArrowRight,
  CheckCircle2,
  Server,
  Play,
  Sparkles,
} from "lucide-react";
import usePublicPages from "../../hooks/usePublicPages.jsx";

const OverviewPage = () => {
  const { isAuthenticated, handleOpenLogin, handleOpenRegister } = usePublicPages();

  return (
    <div className="flex flex-col w-full">
      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden pt-12 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex flex-col items-center text-center">
        {/* Glow ambient background effect */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-blue-400/15 via-indigo-400/10 to-transparent blur-3xl pointer-events-none rounded-full" />

        {/* Live Feature Chip */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold bg-[#eaedff] text-[#005bbf] dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800 mb-8 animate-fadeIn">
          <Sparkles className="w-3.5 h-3.5 text-[#1a73e8]" />
          <span>Decoupled AWS Serverless AI & 1080p HLS Media Streaming</span>
        </div>

        {/* Main Headline */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white max-w-4xl leading-[1.15]">
          Simple, Smart Cloud Storage with{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#1a73e8] via-blue-600 to-indigo-600">
            Automated AI Pipelines
          </span>
        </h1>

        {/* Subhead */}
        <p className="mt-6 text-lg sm:text-xl text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
          Upload files directly to Amazon S3 via presigned URLs. Automatically transcode adaptive HLS
          video on ARM64 Fargate, extract Rekognition vision tags, and summarize PDFs with Claude 3.
        </p>

        {/* Call to Actions */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          {isAuthenticated ? (
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-full bg-[#1a73e8] hover:bg-[#1557bf] text-white text-base font-semibold shadow-md hover:shadow-lg transition-all active:scale-95"
            >
              <span>Go to My Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <button
              onClick={handleOpenRegister}
              className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-full bg-[#1a73e8] hover:bg-[#1557bf] text-white text-base font-semibold shadow-md hover:shadow-lg transition-all active:scale-95"
            >
              <svg className="w-5 h-5 fill-current shrink-0" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>Try Free with Google (15GB)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}

          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-semibold border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60 shadow-xs transition-all"
          >
            <Play className="w-4 h-4 text-[#1a73e8] fill-current" />
            <span>Launch Live Sandbox</span>
          </Link>
        </div>

        {/* Platform Technology Bar */}
        <div className="mt-14 w-full max-w-3xl bg-white/90 dark:bg-slate-800/80 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-700 px-5 py-3.5 shadow-sm grid grid-cols-3 divide-x divide-slate-200 dark:divide-slate-700 text-xs font-mono">
          <div className="flex items-center gap-2 pr-4">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            <span className="text-slate-500 shrink-0">Storage:</span>
            <span className="font-bold text-slate-900 dark:text-white truncate">Amazon S3 (ap-south-1)</span>
          </div>
          <div className="flex items-center gap-2 px-4">
            <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span className="text-slate-500 shrink-0">AI:</span>
            <span className="font-bold text-slate-900 dark:text-white truncate">Rekognition + Bedrock Claude 3</span>
          </div>
          <div className="flex items-center gap-2 pl-4">
            <Server className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            <span className="text-slate-500 shrink-0">Compute:</span>
            <span className="font-bold text-slate-900 dark:text-white truncate">ARM64 Fargate + DynamoDB</span>
          </div>
        </div>
      </section>

      {/* 2. CORE CAPABILITY CARDS */}
      <section className="py-16 bg-slate-50/60 dark:bg-slate-900/40 border-y border-slate-200/80 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#1a73e8] mb-2">
              Automated Cloud Intelligence
            </h2>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">
              What happens when you drop files into OmniDrive AI
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Card 1: Video HLS */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-xs hover:shadow-md transition-shadow group">
              <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#1a73e8] flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
                <Video className="w-6 h-6" />
              </div>
              <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 mb-2">
                ARM64 FFmpeg 6.1
              </span>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                1080p HLS Streaming
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                Videos upload directly to S3, triggering an ECS Fargate worker that segments files into
                multi-bitrate HLS streams (.m3u8).
              </p>
              <Link
                to="/features"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1a73e8] hover:underline"
              >
                Learn about HLS transcode <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Card 2: Vision AI */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-xs hover:shadow-md transition-shadow group">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
                <Eye className="w-6 h-6" />
              </div>
              <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 mb-2">
                AWS Rekognition
              </span>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                Computer Vision AI
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                Photos are analyzed for scene classification, landmarks, objects, and EXIF camera data.
                Search photos by keyword instantly.
              </p>
              <Link
                to="/features"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:underline"
              >
                Explore Vision AI <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Card 3: GenAI PDF */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-xs hover:shadow-md transition-shadow group">
              <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
                <FileText className="w-6 h-6" />
              </div>
              <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300 mb-2">
                Claude 3 + Textract
              </span>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                GenAI PDF Summaries
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                Documents are OCR-parsed via Textract and synthesized into bullet takeaways and executive
                summaries with Amazon Bedrock.
              </p>
              <Link
                to="/features"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-600 hover:underline"
              >
                View PDF summarizer <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Card 4: Moderation */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-xs hover:shadow-md transition-shadow group">
              <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 mb-2">
                Safety Gatekeeper
              </span>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                Automated Moderation
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                Zero unsafe content leaks. Rekognition automatically quarantines sensitive or toxic uploads,
                cancelling downstream processing.
              </p>
              <Link
                to="/safety"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 hover:underline"
              >
                Inspect safety protocols <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 3. STORAGE COMPARISON SECTION */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-br from-white to-blue-50/40 dark:from-slate-800 dark:to-slate-900 rounded-3xl p-8 sm:p-12 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col lg:flex-row items-center justify-between gap-10">
          <div className="space-y-4 max-w-xl">
            <span className="text-xs font-bold uppercase tracking-wider text-[#1a73e8]">
              Decoupled Architecture
            </span>
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white">
              Why Direct-to-S3 Processing Beats Monolithic Web Servers
            </h2>
            <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
              Standard web apps upload gigabyte videos through heavy Node/Python servers, choking CPU
              and draining memory. OmniDrive AI issues short-lived presigned S3 URLs, letting your browser
              upload directly to Amazon S3 while serverless EventBridge workers do the heavy lifting in parallel.
            </p>
            <div className="pt-2 space-y-2 text-sm">
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Zero web server memory bottlenecks or upload timeouts</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>ARM64 Graviton3 Fargate containers auto-scale from 0 to 1,000</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>DynamoDB single-digit millisecond metadata retrieval</span>
              </div>
            </div>
          </div>

          <div className="w-full lg:w-auto shrink-0 flex flex-col gap-3">
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className="px-8 py-3.5 rounded-full bg-[#1a73e8] hover:bg-[#1557bf] text-white font-semibold text-center shadow-md hover:shadow-lg transition-all"
              >
                Go to My Dashboard
              </Link>
            ) : (
              <button
                onClick={handleOpenRegister}
                className="px-8 py-3.5 rounded-full bg-[#1a73e8] hover:bg-[#1557bf] text-white font-semibold text-center shadow-md hover:shadow-lg transition-all"
              >
                Start Free 15GB Workspace
              </button>
            )}
            <Link
              to="/how-it-works"
              className="px-8 py-3.5 rounded-full bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-semibold text-center hover:bg-slate-50 transition-colors"
            >
              View Full Architecture
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default OverviewPage;
