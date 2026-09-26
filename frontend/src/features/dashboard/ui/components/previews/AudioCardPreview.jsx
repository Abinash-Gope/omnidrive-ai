import React from "react";
import { Music, Disc3, Volume2 } from "lucide-react";

/**
 * AudioCardPreview — Renders an acoustic vinyl/waveform card preview
 * for audio tracks (.flac, .mp3, .wav, .aac, .m4a)
 */
const AudioCardPreview = ({ file }) => {
  const fileName = file?.name || "audio.mp3";
  const ext = fileName.split(".").pop().toUpperCase();
  const title = fileName.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");

  // Static rhythmic soundwave heights
  const waveHeights = [20, 45, 75, 30, 90, 60, 100, 40, 85, 55, 70, 35, 95, 50, 80, 25, 65, 40, 85, 30];

  return (
    <div className="w-full h-full relative overflow-hidden bg-gradient-to-br from-indigo-950 via-slate-950 to-purple-950 border border-purple-500/20 select-none p-3.5 flex flex-col justify-between">
      {/* Top Header: Music Disc Icon & Format Tag */}
      <div className="flex items-center justify-between pb-1.5 border-b border-purple-500/20">
        <div className="flex items-center gap-1.5 text-[9px] font-semibold text-purple-300 font-sans">
          <Disc3 className="w-3 h-3 text-purple-400" />
          <span>Audio Track</span>
        </div>
        <span className="text-[8px] font-mono text-purple-300 bg-purple-500/15 px-1.5 py-0.2 rounded border border-purple-500/25">
          {ext === "FLAC" ? "FLAC LOSSLESS" : ext}
        </span>
      </div>

      {/* Center Soundwave Spectrum */}
      <div className="my-auto flex flex-col items-center justify-center gap-1.5">
        <div className="flex items-center justify-center gap-1 h-9 w-full px-3">
          {waveHeights.map((h, i) => (
            <div
              key={i}
              className="flex-1 bg-gradient-to-t from-purple-600 via-indigo-500 to-blue-400 rounded-full transition-all duration-300 group-hover:brightness-125"
              style={{
                height: `${h}%`,
                opacity: 0.6 + (i % 3) * 0.15,
              }}
            />
          ))}
        </div>

        {/* Track Title */}
        <div className="text-[9px] font-bold text-white/90 truncate max-w-[200px] font-sans text-center">
          {title}
        </div>
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-between text-[7px] text-purple-200/50 font-mono pt-1 border-t border-white/5">
        <div className="flex items-center gap-1">
          <Volume2 className="w-2.5 h-2.5 text-purple-400" />
          <span>Hi-Fi Stereo</span>
        </div>
        <span>24-bit / 48kHz</span>
      </div>

      {/* Vignette Depth */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
    </div>
  );
};

export default AudioCardPreview;
