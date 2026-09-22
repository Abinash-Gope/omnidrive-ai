import React, { useState } from "react";
import {
  Video,
  Eye,
  FileText,
  UploadCloud,
  CheckCircle2,
  Clock,
  Cpu,
  ShieldCheck,
  Zap,
  Play,
  Layers,
  Sparkles,
  ArrowRight,
  Database,
  Lock,
} from "lucide-react";

const showcaseTabs = [
  {
    id: "video",
    label: "1080p HLS Video",
    shortLabel: "HLS Video",
    icon: Video,
    tag: "ARM64",
    fileName: "keynote_presentation_4k.mp4",
    fileSize: "1.42 GB",
    service: "AWS ECS Fargate (Graviton3)",
    duration: "4.8s transcode",
  },
  {
    id: "vision",
    label: "Vision AI & Safety",
    shortLabel: "Vision AI",
    icon: Eye,
    tag: "Rekognition",
    fileName: "aerial_architecture_survey.jpg",
    fileSize: "18.4 MB",
    service: "Amazon Rekognition",
    duration: "180ms inference",
  },
  {
    id: "document",
    label: "Neural PDF AI",
    shortLabel: "Neural AI",
    icon: FileText,
    tag: "Neural AI",
    fileName: "q3_cloud_infrastructure_audit.pdf",
    fileSize: "4.2 MB (48 pages)",
    service: "OmniDrive Neural Pipeline",
    duration: "1.2s synthesis",
  },
  {
    id: "direct-s3",
    label: "Direct-to-S3 Upload",
    shortLabel: "Direct S3",
    icon: UploadCloud,
    tag: "Presigned S3",
    fileName: "dataset_enterprise_archive.tar.gz",
    fileSize: "12.8 GB",
    service: "Amazon S3 (ap-south-1)",
    duration: "0ms server load",
  },
];

const PipelineShowcase = () => {
  const [activeTab, setActiveTab] = useState("video");
  const [activeBitrate, setActiveBitrate] = useState("1080p");
  const [isSimulating, setIsSimulating] = useState(false);

  const handleSimulate = (tabId) => {
    setActiveTab(tabId);
    setIsSimulating(true);
    setTimeout(() => {
      setIsSimulating(false);
    }, 600);
  };

  const current = showcaseTabs.find((t) => t.id === activeTab) || showcaseTabs[0];

  return (
    <div className="w-full max-w-5xl mx-auto mt-12 mb-8">
      {/* Outer Glow Container */}
      <div className="relative rounded-3xl p-1 bg-gradient-to-b from-blue-500/20 via-slate-200 dark:via-slate-800 to-transparent shadow-xl">
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-[22px] border border-slate-200/80 dark:border-slate-800 overflow-hidden">
          
          {/* Header Bar */}
          <div className="px-6 py-4 border-b border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-800/30">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-rose-400/80" />
                <span className="w-3 h-3 rounded-full bg-amber-400/80" />
                <span className="w-3 h-3 rounded-full bg-emerald-400/80" />
              </div>
              <span className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-1" />
              <div className="flex items-center gap-2 text-xs font-mono text-slate-600 dark:text-slate-300">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-semibold text-slate-800 dark:text-slate-200">Live Pipeline Telemetry</span>
                <span className="text-slate-400 dark:text-slate-500 hidden sm:inline">• EventBridge v2</span>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 text-[#1a73e8] dark:text-blue-300 font-semibold border border-blue-200 dark:border-blue-900/50">
                {current.service}
              </span>
              <span className="text-slate-500 dark:text-slate-400 hidden md:inline">
                Latency: <strong className="text-slate-800 dark:text-slate-200">{current.duration}</strong>
              </span>
            </div>
          </div>

          {/* Interactive Feature Tabs - 4 equal responsive columns so all features are 100% visible */}
          <div className="p-2.5 sm:p-3 bg-slate-50/90 dark:bg-slate-800/50 border-b border-slate-200/80 dark:border-slate-800">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {showcaseTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleSimulate(tab.id)}
                    className={`flex items-center justify-between gap-2 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer border text-left ${
                      isActive
                        ? "bg-white dark:bg-slate-800 text-[#1a73e8] dark:text-blue-400 border-blue-300 dark:border-blue-700 shadow-xs ring-1 ring-blue-500/20"
                        : "bg-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800/60 border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-[#1a73e8] dark:text-blue-400" : "text-slate-400"}`} />
                      <span className="truncate">{tab.label}</span>
                    </div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-md uppercase tracking-wider font-mono shrink-0 hidden lg:inline-block ${
                      isActive
                        ? "bg-blue-50 text-[#1a73e8] dark:bg-blue-950/80 dark:text-blue-300 font-bold"
                        : "bg-slate-200/60 dark:bg-slate-700/60 text-slate-500 dark:text-slate-400"
                    }`}>
                      {tab.tag}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tab Content Display */}
          <div className={`p-6 sm:p-8 transition-opacity duration-200 ${isSimulating ? "opacity-60" : "opacity-100"}`}>
            
            {/* 1. Simulated File Ingestion Card */}
            <div className="mb-6 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/80 text-[#1a73e8] flex items-center justify-center shrink-0">
                  <current.icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900 dark:text-white text-sm font-mono">
                      {current.fileName}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono">
                      {current.fileSize}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Direct multipart S3 ingress • SHA-256 encrypted • Zero web server memory overhead
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Pipeline Completed</span>
                </span>
              </div>
            </div>

            {/* 2. Automated Pipeline Stages Stepper */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
              <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs">
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                  <span>Stage 01</span>
                  <UploadCloud className="w-3.5 h-3.5 text-blue-500" />
                </div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                  Presigned S3 Ingress
                </div>
                <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
                  100% Direct • 0ms server lag
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs">
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                  <span>Stage 02</span>
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                </div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                  Safety Gatekeeper
                </div>
                <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
                  Rekognition Safe (100%)
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs">
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                  <span>Stage 03</span>
                  <Cpu className="w-3.5 h-3.5 text-purple-500" />
                </div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                  Async Worker Compute
                </div>
                <div className="text-[11px] text-purple-600 dark:text-purple-400 font-mono mt-0.5">
                  {activeTab === "video" ? "Graviton3 ARM64 Fargate" : activeTab === "document" ? "OmniDrive Neural Engine" : "Rekognition Vision"}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs">
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                  <span>Stage 04</span>
                  <Database className="w-3.5 h-3.5 text-amber-500" />
                </div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                  DynamoDB Metadata
                </div>
                <div className="text-[11px] text-amber-600 dark:text-amber-400 font-mono mt-0.5">
                  Single-digit ms sync
                </div>
              </div>
            </div>

            {/* 3. Interactive Specific Tab View */}
            {activeTab === "video" && (
              <div className="bg-slate-950 rounded-2xl p-6 text-white border border-slate-800 shadow-md">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-5 pb-4 border-b border-slate-800/80">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono uppercase tracking-wider text-blue-400 font-bold">
                        HLS Adaptive Multi-Bitrate Stream
                      </span>
                      <span className="text-[11px] px-2 py-0.5 rounded bg-blue-900/60 text-blue-300 font-mono">
                        master.m3u8
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Segmented into 6-second cryptographic .ts chunks across 3 streaming tiers.
                    </p>
                  </div>

                  {/* Bitrate Selector Buttons */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 mr-1 hidden sm:inline">Stream Tier:</span>
                    {["1080p", "720p", "480p"].map((res) => (
                      <button
                        key={res}
                        onClick={() => setActiveBitrate(res)}
                        className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                          activeBitrate === res
                            ? "bg-[#1a73e8] text-white shadow-sm"
                            : "bg-slate-800 text-slate-400 hover:text-white"
                        }`}
                      >
                        {res}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Simulated Player Box */}
                <div className="relative aspect-video max-h-[260px] w-full rounded-xl bg-gradient-to-tr from-slate-900 via-slate-800 to-indigo-950 border border-slate-700/60 flex flex-col justify-between p-5 overflow-hidden group">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-md text-emerald-400 border border-emerald-500/30">
                      ● LIVE HLS {activeBitrate} • {activeBitrate === "1080p" ? "4,500 kbps (60fps)" : activeBitrate === "720p" ? "2,500 kbps (30fps)" : "1,200 kbps (30fps)"}
                    </span>
                    <span className="text-xs font-mono text-slate-400 bg-black/60 px-2 py-0.5 rounded">
                      FFmpeg 6.1 AV1/H.264
                    </span>
                  </div>

                  <div className="flex items-center justify-center">
                    <div className="w-14 h-14 rounded-full bg-[#1a73e8]/90 group-hover:bg-[#1a73e8] text-white flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 cursor-pointer">
                      <Play className="w-6 h-6 ml-0.5 fill-current" />
                    </div>
                  </div>

                  {/* Fake Scrubber */}
                  <div className="space-y-1.5">
                    <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full bg-[#1a73e8] rounded-full" style={{ width: "45%" }} />
                    </div>
                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                      <span>02:14</span>
                      <span className="text-slate-500">Buffer: 98% cached on CloudFront</span>
                      <span>05:30</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "vision" && (
              <div className="bg-white dark:bg-slate-800/80 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-bold">
                        AWS Rekognition Computer Vision
                      </span>
                    </div>
                    <h4 className="text-base font-bold text-slate-900 dark:text-white">
                      Automated Metadata & Visual Feature Extraction
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      Deep learning vision models automatically detect objects, scenes, and camera optics
                      without manual tagging. Search files instantly by scene concepts.
                    </p>

                    <div className="space-y-2 pt-2">
                      {[
                        { label: "Architecture", confidence: 99.8 },
                        { label: "Modern Building", confidence: 98.4 },
                        { label: "Urban Landscape", confidence: 96.2 },
                        { label: "Glass Facade", confidence: 92.5 },
                      ].map((tag) => (
                        <div key={tag.label} className="space-y-1">
                          <div className="flex items-center justify-between text-xs font-mono">
                            <span className="text-slate-700 dark:text-slate-200 font-medium">{tag.label}</span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">{tag.confidence}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                              style={{ width: `${tag.confidence}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-700/80 font-mono text-xs space-y-3">
                    <div className="text-xs font-bold text-slate-900 dark:text-white pb-2 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                      <span>EXIF Camera Telemetry</span>
                      <span className="text-emerald-600 dark:text-emerald-400 text-[11px]">Verified S3 Object</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-slate-600 dark:text-slate-400">
                      <div>Camera: <strong className="text-slate-900 dark:text-white">Sony ILCE-7M4</strong></div>
                      <div>Lens: <strong className="text-slate-900 dark:text-white">FE 24-70mm GM</strong></div>
                      <div>Aperture: <strong className="text-slate-900 dark:text-white">f/2.8</strong></div>
                      <div>Shutter: <strong className="text-slate-900 dark:text-white">1/1250s</strong></div>
                      <div>ISO: <strong className="text-slate-900 dark:text-white">100</strong></div>
                      <div>Focal: <strong className="text-slate-900 dark:text-white">24mm</strong></div>
                    </div>
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Rekognition Content Moderation: 0 unsafe flags detected</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "document" && (
              <div className="bg-white dark:bg-slate-800/80 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      <span className="text-xs font-mono uppercase tracking-wider text-purple-600 dark:text-purple-400 font-bold">
                        OmniDrive Neural Document Synthesis
                      </span>
                    </div>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300 font-mono">
                      Textract OCR: 99.8% confidence
                    </span>
                  </div>

                  <div className="p-4 rounded-xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-900/50">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-purple-800 dark:text-purple-300 mb-1.5">
                      Executive Summary
                    </h5>
                    <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed italic">
                      "Analysis of 48-page enterprise migration report: Deploying direct S3 multipart ingestion
                      with decoupled ARM64 Graviton3 workers slashes web-tier latency from 8.4s to 320ms,
                      while cutting compute infrastructure costs by 42%."
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs font-bold text-slate-900 dark:text-white">
                      Synthesized Key Takeaways:
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300">
                        <strong className="block text-slate-900 dark:text-white mb-1">0% Web Bottlenecks</strong>
                        Browser uploads directly to S3 via presigned tokens, preventing memory spikes.
                      </div>
                      <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300">
                        <strong className="block text-slate-900 dark:text-white mb-1">Quarantine Bucket</strong>
                        Automated Rekognition gatekeeper intercepts non-compliant uploads in &lt;80ms.
                      </div>
                      <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300">
                        <strong className="block text-slate-900 dark:text-white mb-1">Single-Digit Sync</strong>
                        DynamoDB commits transcode and AI summary tokens for instant UI telemetry.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "direct-s3" && (
              <div className="bg-white dark:bg-slate-800/80 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                  <div className="space-y-3">
                    <span className="text-xs font-mono uppercase tracking-wider text-[#1a73e8] font-bold">
                      Direct-to-S3 Architecture
                    </span>
                    <h4 className="text-base font-bold text-slate-900 dark:text-white">
                      Eliminate the Monolithic Server Upload Trap
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      Standard web applications route gigabytes of data through Node or Python web servers,
                      exhausting CPU, eating RAM, and dropping connections. OmniDrive AI issues short-lived
                      presigned S3 tokens, allowing browsers to push files directly to AWS S3 storage.
                    </p>
                    <div className="pt-2 flex flex-wrap gap-2 text-xs font-mono">
                      <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                        🔒 SSE-S3 AES-256
                      </span>
                      <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                        ⚡ 10 Gbps S3 Line-Rate
                      </span>
                      <span className="px-2.5 py-1 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                        ✓ 0 Server Choke
                      </span>
                    </div>
                  </div>

                  <div className="bg-slate-950 rounded-xl p-5 text-white font-mono text-xs space-y-3 border border-slate-800">
                    <div className="text-slate-400 text-[11px] pb-2 border-b border-slate-800 flex items-center justify-between">
                      <span>Architecture Comparison</span>
                      <span className="text-emerald-400">OmniDrive AI Advantage</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-2 rounded bg-slate-900 border border-slate-800">
                        <span className="text-slate-400">Traditional Web App:</span>
                        <span className="text-rose-400 font-bold">Browser → Node Server → S3</span>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded bg-blue-950/60 border border-blue-800/80">
                        <span className="text-blue-300 font-semibold">OmniDrive AI:</span>
                        <span className="text-emerald-400 font-bold">Browser ──[Direct]──&gt; S3</span>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-500 pt-1">
                      EventBridge then notifies isolated Fargate & Bedrock workers asynchronously.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PipelineShowcase;
