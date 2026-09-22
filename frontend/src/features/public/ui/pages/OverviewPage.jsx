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
  Sparkles,
  Play,
} from "lucide-react";
import usePublicPages from "../../hooks/usePublicPages.jsx";
import PipelineShowcase from "../components/PipelineShowcase.jsx";

const OverviewPage = () => {
  const { isAuthenticated, handleOpenLogin, handleOpenRegister } = usePublicPages();

  return (
    <div className="flex flex-col w-full">
      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden pt-12 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex flex-col items-center text-center">
        {/* Ambient Glow Background Effect */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[380px] bg-gradient-to-tr from-blue-400/15 via-indigo-400/10 to-transparent blur-3xl pointer-events-none rounded-full" />

        {/* Feature Announcement Pill */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-blue-500/10 text-[#005bbf] dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/80 shadow-xs mb-6 backdrop-blur-md">
          <Sparkles className="w-3.5 h-3.5 text-[#1a73e8]" />
          <span>Next-Generation Serverless Cloud Storage</span>
          <span className="w-1 h-1 rounded-full bg-blue-400" />
          <span className="text-slate-500 dark:text-slate-400 font-normal hidden sm:inline">
            Direct-to-S3 • ARM64 Graviton3 • AWS Bedrock
          </span>
          <ArrowRight className="w-3 h-3 text-[#1a73e8]" />
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
          video on ARM64 Fargate, extract Rekognition vision tags, and summarize documents with generative AI.
        </p>

        {/* Call to Actions */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5 w-full sm:w-auto">
          {isAuthenticated ? (
            <Link
              to="/dashboard"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-full bg-[#1a73e8] hover:bg-[#1557bf] text-white text-base font-semibold shadow-[0_4px_14px_rgba(26,115,232,0.35)] hover:shadow-[0_6px_20px_rgba(26,115,232,0.45)] transition-all active:scale-95 group"
            >
              <span>Go to My Dashboard</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
          ) : (
            <>
              <button
                onClick={handleOpenRegister}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-full bg-[#1a73e8] hover:bg-[#1557bf] text-white text-base font-semibold shadow-[0_4px_14px_rgba(26,115,232,0.35)] hover:shadow-[0_6px_20px_rgba(26,115,232,0.45)] transition-all active:scale-95 group cursor-pointer"
              >
                <span>Start Free Workspace</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>
              <Link
                to="/how-it-works"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-base font-medium border border-slate-200/80 dark:border-slate-700 transition-all active:scale-95"
              >
                <Play className="w-3.5 h-3.5 fill-current text-slate-500 dark:text-slate-400" />
                <span>Explore Architecture</span>
              </Link>
            </>
          )}
        </div>

        {/* Existing User Login Shortcut */}
        {!isAuthenticated && (
          <div className="mt-4 flex items-center justify-center gap-1.5 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            <span>Already have an OmniDrive account?</span>
            <button
              onClick={handleOpenLogin}
              className="font-semibold text-[#1a73e8] dark:text-blue-400 hover:text-[#1557bf] dark:hover:text-blue-300 hover:underline inline-flex items-center gap-1 cursor-pointer transition-colors"
            >
              <span>Log in here</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Micro-Trust Indicators */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> 15 GB Free S3 Storage
          </span>
          <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600 hidden sm:inline-block" />
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Zero Credit Card Required
          </span>
          <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600 hidden sm:inline-block" />
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Instant Bedrock & Rekognition AI
          </span>
        </div>

        {/* Platform Technology Bar */}
        <div className="mt-10 w-full max-w-4xl bg-white/90 dark:bg-slate-800/80 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-700 px-5 py-3.5 shadow-sm grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 dark:divide-slate-700 text-xs font-mono gap-y-2 sm:gap-y-0">
          <div className="flex items-center gap-2 sm:pr-4 py-1 sm:py-0">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
            <span className="text-slate-500 shrink-0">Storage:</span>
            <span className="font-bold text-slate-900 dark:text-white">Amazon S3 (ap-south-1)</span>
          </div>
          <div className="flex items-center gap-2 sm:px-4 py-1 sm:py-0">
            <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span className="text-slate-500 shrink-0">AI:</span>
            <span className="font-bold text-slate-900 dark:text-white">Vision AI + Document Intelligence</span>
          </div>
          <div className="flex items-center gap-2 sm:pl-4 py-1 sm:py-0">
            <Server className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            <span className="text-slate-500 shrink-0">Compute:</span>
            <span className="font-bold text-slate-900 dark:text-white">ARM64 Fargate + DynamoDB</span>
          </div>
        </div>

        {/* Live Interactive Pipeline Telemetry Showcase */}
        <PipelineShowcase />
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
                Neural Document AI
              </span>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                GenAI PDF Summaries
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                Documents are OCR-parsed and synthesized into bullet takeaways and executive
                summaries with advanced neural intelligence.
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
    </div>
  );
};

export default OverviewPage;
