import React, { useState } from "react";
import {
  X,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Settings,
  Cpu,
  Tv,
  Film,
  Check,
  Lock,
} from "lucide-react";
import useAuth from "../../../auth/hooks/useAuth.jsx";
import { setToast } from "../../../../shared/state/uiSlice.jsx";
import { useDispatch } from "react-redux";

const VideoPlayerModal = ({ file, isOpen, onClose, onChangeQuality }) => {
  const dispatch = useDispatch();
  const { plan, planDetails, handleOpenEnterpriseContact } = useAuth();
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(35);
  const [showQualityMenu, setShowQualityMenu] = useState(false);

  if (!isOpen || !file || file.type !== "video") return null;

  // Free plan defaults to 720p max
  const currentQuality = file.activeQuality || (plan === "free" ? "720p" : "1080p");
  const qualities = [
    {
      label: "1080p Full HD",
      value: "1080p",
      bitrate: "5.2 Mbps",
      resolution: "1920x1080",
      isLocked: plan === "free",
    },
    {
      label: "720p HD",
      value: "720p",
      bitrate: "2.8 Mbps",
      resolution: "1280x720",
      isLocked: false,
    },
    {
      label: "480p SD",
      value: "480p",
      bitrate: "1.2 Mbps",
      resolution: "854x480",
      isLocked: false,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-950 text-[#1a73e8] flex items-center justify-center">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white truncate">{file.name}</h3>
              <p className="text-xs text-slate-400 flex items-center gap-2">
                <span>Adaptive HLS Stream (.m3u8)</span>
                <span>•</span>
                <span className="text-[#1a73e8] font-mono font-semibold">{currentQuality}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Player Viewport */}
        <div className="relative aspect-video bg-slate-950 flex items-center justify-center overflow-hidden group">
          {file.thumbnail ? (
            <img
              src={file.thumbnail}
              alt={file.name}
              className={`w-full h-full object-cover transition-opacity duration-300 ${isPlaying ? "opacity-90" : "opacity-60"}`}
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-950 to-black flex items-center justify-center">
              <div className="w-20 h-20 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-center text-blue-400">
                <Film className="w-10 h-10 stroke-[1.5]" />
              </div>
            </div>
          )}

          {/* Center Play/Pause Overlay Button */}
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-16 h-16 rounded-full bg-black/60 hover:bg-[#1a73e8] text-white backdrop-blur-md flex items-center justify-center transition-all transform hover:scale-110 shadow-xl"
          >
            {isPlaying ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7 fill-current translate-x-0.5" />}
          </button>

          {/* Quality Indicator Banner */}
          <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-black/70 backdrop-blur-md text-xs font-mono text-white flex items-center gap-2 border border-white/10">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>HLS {currentQuality}</span>
          </div>

          {/* Player Controls Bar */}
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black via-black/70 to-transparent p-4 flex flex-col gap-2">
            {/* Progress Bar */}
            <div
              className="w-full h-1.5 bg-white/20 hover:h-2 rounded-full cursor-pointer relative transition-all"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const pos = (e.clientX - rect.left) / rect.width;
                setProgress(Math.round(pos * 100));
              }}
            >
              <div
                className="h-full bg-[#1a73e8] rounded-full relative"
                style={{ width: `${progress}%` }}
              >
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-md scale-0 group-hover:scale-100 transition-transform" />
              </div>
            </div>

            {/* Controls Row */}
            <div className="flex items-center justify-between text-white text-xs">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="hover:text-[#1a73e8] transition-colors"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
                </button>
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="hover:text-[#1a73e8] transition-colors"
                >
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
                <span className="font-mono text-[11px] text-slate-300">
                  01:18 / {file.duration || "03:40"}
                </span>
              </div>

              <div className="flex items-center gap-3 relative">
                {/* Quality Menu Selector */}
                <div className="relative">
                  <button
                    onClick={() => setShowQualityMenu(!showQualityMenu)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 transition-colors font-mono text-[11px]"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    <span>{currentQuality}</span>
                  </button>

                  {showQualityMenu && (
                    <div className="absolute bottom-full right-0 mb-2 w-48 rounded-xl bg-slate-800 border border-slate-700 shadow-xl overflow-hidden py-1 text-xs">
                      <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Select Stream Bitrate
                      </div>
                      {qualities.map((q) => (
                        <button
                          key={q.value}
                          onClick={() => {
                            if (q.isLocked) {
                              dispatch(
                                setToast({
                                  type: "info",
                                  message: "1080p Full HD & 4K streaming requires Pro Cloud or Enterprise tier.",
                                })
                              );
                              setShowQualityMenu(false);
                              return;
                            }
                            onChangeQuality(file.id, q.value);
                            setShowQualityMenu(false);
                          }}
                          className={`w-full px-3 py-2 text-left flex items-center justify-between hover:bg-slate-700 transition-colors ${
                            currentQuality === q.value
                              ? "text-[#1a73e8] font-bold"
                              : q.isLocked
                              ? "text-slate-500 hover:text-slate-400"
                              : "text-white"
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span>{q.label}</span>
                              {q.isLocked && <Lock className="w-3 h-3 text-amber-400 shrink-0" />}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {q.isLocked ? "Pro Tier Required" : q.bitrate}
                            </div>
                          </div>
                          {currentQuality === q.value && <Check className="w-4 h-4 text-[#1a73e8]" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button className="hover:text-[#1a73e8] transition-colors">
                  <Maximize className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Technical Transcoder Pipeline Footer */}
        <div className="p-6 bg-slate-950 border-t border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800">
            <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5 mb-1">
              <Cpu className="w-3.5 h-3.5 text-[#1a73e8]" />
              <span>Transcoding Engine</span>
            </span>
            <p className="font-mono text-white text-[11px]">
              {plan === "enterprise"
                ? "Dedicated ARM64 Fargate Cluster"
                : plan === "pro"
                ? "AWS Graviton3 Priority Worker"
                : "AWS ECS Fargate ARM64 Spot"}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              {plan === "enterprise" ? "Private VPC execution" : "FFmpeg 6.1 static binary"}
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800">
            <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5 mb-1">
              <Tv className="w-3.5 h-3.5 text-emerald-400" />
              <span>Streaming Format</span>
            </span>
            <p className="font-mono text-white text-[11px]">
              {plan === "enterprise" ? "HLS .m3u8 (BYOK KMS Encrypted)" : "HLS .m3u8 Master Playlist"}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">6s TS segments with AAC audio</p>
          </div>

          <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800">
            <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5 mb-1">
              <Film className="w-3.5 h-3.5 text-purple-400" />
              <span>Adaptive Renditions</span>
            </span>
            <p className="font-mono text-white text-[11px]">
              {plan === "enterprise"
                ? "4K Cinema • 1080p • 720p"
                : plan === "pro"
                ? "1080p • 720p • 480p"
                : "720p • 480p (Pro: 1080p)"}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              {plan === "enterprise" ? "Customer S3 VPC endpoint" : "Automated S3 distribution"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayerModal;
