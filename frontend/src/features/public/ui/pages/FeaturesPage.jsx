import React from "react";
import { Link } from "react-router-dom";
import {
  Video,
  Eye,
  FileText,
  ShieldCheck,
  Zap,
  CheckCircle2,
  Sparkles,
  Layers,
  ArrowRight,
} from "lucide-react";
import usePublicPages from "../../hooks/usePublicPages.jsx";

const FeaturesPage = () => {
  const { isAuthenticated, handleOpenRegister } = usePublicPages();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header Banner */}
      <div className="text-center max-w-3xl mx-auto mb-16">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-semibold bg-[#eaedff] text-[#005bbf] dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800 mb-4">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Multimodal Machine Learning & Video Engineering</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Smart AI Features for Modern Media
        </h1>
        <p className="mt-4 text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
          OmniDrive AI runs four specialized event-driven workers. Every file uploaded is automatically
          analyzed, transcoded, and enriched with zero user intervention.
        </p>
      </div>

      {/* Feature 1: Adaptive HLS Video Streaming */}
      <section className="mb-20 bg-white dark:bg-slate-800/80 rounded-3xl p-8 sm:p-12 border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-[#1a73e8] dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              <Video className="w-3.5 h-3.5" />
              <span>ARM64 ECS Fargate Worker</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
              Adaptive Multi-Bitrate HLS Video Streaming
            </h2>
            <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base leading-relaxed">
              Never wait for huge MP4 downloads. OmniDrive AI launches ephemeral Graviton3 ARM64
              containers with FFmpeg 6.1 to transcode raw video into standard HLS streams (1080p, 720p,
              480p) and generates multi-bitrate <code className="text-xs bg-slate-100 dark:bg-slate-700 px-1 py-0.5 rounded text-blue-600">master.m3u8</code> playlists.
            </p>
            <ul className="space-y-2.5 pt-2 text-sm text-slate-700 dark:text-slate-200">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Zero video buffering with automatic network bitrate switching</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Segmented .ts chunks stored securely on S3 and distributed via CloudFront</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Graviton3 architecture reduces compute cost by 40%</span>
              </li>
            </ul>
          </div>
          <div className="bg-slate-950 rounded-2xl p-6 border border-slate-800 text-slate-300 font-mono text-xs shadow-inner">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-slate-500">
              <span>ffmpeg_hls_pipeline.sh</span>
              <span className="text-emerald-400">ARM64 Graviton3</span>
            </div>
            <pre className="mt-4 overflow-x-auto text-emerald-300/90 leading-relaxed">
{`# Generated HLS Manifest
#EXTM3U
#EXT-X-VERSION:3
#EXT-X-STREAM-INF:BANDWIDTH=5000000,RESOLUTION=1920x1080
1080p/index.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=2800000,RESOLUTION=1280x720
720p/index.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=1400000,RESOLUTION=854x480
480p/index.m3u8`}
            </pre>
          </div>
        </div>
      </section>

      {/* Feature 2: Vision AI */}
      <section className="mb-20 bg-white dark:bg-slate-800/80 rounded-3xl p-8 sm:p-12 border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div className="order-2 lg:order-1 bg-gradient-to-tr from-slate-900 to-slate-800 rounded-2xl p-6 border border-slate-700 text-white shadow-inner space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Rekognition Label Extraction</span>
              <span className="text-emerald-400">Confidence: 99.4%</span>
            </div>
            <div className="space-y-2">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>Urban Architecture</span>
                  <span>99.4%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: "99.4%" }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>Night Skyline</span>
                  <span>98.1%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: "98.1%" }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>Metropolis & Skyscraper</span>
                  <span>94.8%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: "94.8%" }} />
                </div>
              </div>
            </div>
          </div>
          <div className="order-1 lg:order-2 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              <Eye className="w-3.5 h-3.5" />
              <span>Amazon Rekognition Computer Vision</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
              Instant Scene Classification & EXIF Search
            </h2>
            <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base leading-relaxed">
              Every photo uploaded is automatically indexed without human tagging. Amazon Rekognition
              detects objects, scenes, and landmarks, while the metadata worker extracts ISO, aperture,
              focal length, and camera model.
            </p>
            <ul className="space-y-2.5 pt-2 text-sm text-slate-700 dark:text-slate-200">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Search by concept: type "Skyline" or "Architecture" in the Drive header</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>High confidence threshold (&gt; 80%) prevents false positives</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Feature 3: GenAI Document Summarizer */}
      <section className="mb-20 bg-white dark:bg-slate-800/80 rounded-3xl p-8 sm:p-12 border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
              <FileText className="w-3.5 h-3.5" />
              <span>Amazon Bedrock + Textract</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
              GenAI Executive Summaries & Takeaways
            </h2>
            <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base leading-relaxed">
              Don't read 50-page reports manually. Amazon Textract extracts clean text from PDFs and
              scans, sending structured context to Bedrock Claude 3 to generate instant executive
              summaries and key action bullets.
            </p>
            <ul className="space-y-2.5 pt-2 text-sm text-slate-700 dark:text-slate-200">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Generates 3-sentence executive summary & 5 key takeaways</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Stateless Bedrock requests: your data is never retained for training</span>
              </li>
            </ul>
          </div>
          <div className="bg-purple-50/60 dark:bg-purple-950/30 rounded-2xl p-6 border border-purple-200 dark:border-purple-800/60 text-slate-800 dark:text-purple-100 text-sm space-y-3">
            <div className="flex items-center gap-2 font-bold text-purple-700 dark:text-purple-300">
              <Sparkles className="w-4 h-4" />
              <span>Bedrock Claude 3 Generated Summary</span>
            </div>
            <p className="italic text-xs text-slate-600 dark:text-slate-300">
              "This proposal details the transition from a monolithic REST architecture to a decoupled
              event-driven model. Deploying S3 direct uploads and ARM64 Fargate workers reduces cloud
              infrastructure spend by 42% while cutting ingestion latency from 8.2s to 340ms."
            </p>
            <div className="pt-2 border-t border-purple-200 dark:border-purple-800/60 text-xs space-y-1">
              <p className="font-semibold text-purple-800 dark:text-purple-200">Key Takeaways:</p>
              <p>• Zero web-tier memory bottlenecks via presigned S3 URLs</p>
              <p>• Rekognition automated content screening before downstream worker execution</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Footer */}
      <div className="text-center py-8">
        {isAuthenticated ? (
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-[#1a73e8] hover:bg-[#1557bf] text-white font-semibold shadow-md hover:shadow-lg transition-all"
          >
            <span>Open Dashboard & Files</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        ) : (
          <button
            onClick={handleOpenRegister}
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-[#1a73e8] hover:bg-[#1557bf] text-white font-semibold shadow-md hover:shadow-lg transition-all cursor-pointer"
          >
            <span>Start Free 15GB Workspace</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

export default FeaturesPage;
