import React, { useState, useEffect } from "react";
import axios from "axios";
import { FileSpreadsheet } from "lucide-react";

// In-memory cache for fast CSV snippet rows
const csvSnippetCache = new Map();

/**
 * CsvCardPreview — Renders a miniature glassmorphic spreadsheet grid preview
 */
const CsvCardPreview = ({ file }) => {
  const fileId = file?.id || file?.file_id || file?.name;
  const downloadUrl = file?.downloadUrl || file?.download_url;
  const isTsv = (file?.name || "").toLowerCase().endsWith(".tsv");
  const delimiter = isTsv ? "\t" : ",";

  const [gridData, setGridData] = useState(() => {
    return csvSnippetCache.get(fileId) || null;
  });

  useEffect(() => {
    if (gridData || !downloadUrl) return;

    let isMounted = true;
    axios
      .get(downloadUrl, {
        headers: { Range: "bytes=0-1500" }, // lightweight first chunk
        responseType: "text",
      })
      .then((res) => {
        if (!isMounted) return;
        const text = typeof res.data === "string" ? res.data : String(res.data);
        const lines = text
          .split(/\r?\n/)
          .filter((l) => l.trim().length > 0)
          .slice(0, 4);

        if (lines.length > 0) {
          const rows = lines.map((line) =>
            line
              .split(delimiter)
              .map((c) => c.trim().replace(/^"|"$/g, ""))
              .slice(0, 4)
          );
          csvSnippetCache.set(fileId, rows);
          setGridData(rows);
        }
      })
      .catch(() => {
        // Fallback to synthetic grid if network blocked
        const defaultHeaders = ["ID", "Name", "Category", "Status"];
        const defaultRows = [
          ["001", "Record Alpha", "Production", "Active"],
          ["002", "Record Beta", "Staging", "Ready"],
          ["003", "Record Gamma", "Dev", "Synced"],
        ];
        setGridData([defaultHeaders, ...defaultRows]);
      });

    return () => {
      isMounted = false;
    };
  }, [downloadUrl, fileId, delimiter, gridData]);

  const headers = gridData?.[0] || ["Col A", "Col B", "Col C", "Col D"];
  const rows = gridData?.slice(1) || [
    ["—", "—", "—", "—"],
    ["—", "—", "—", "—"],
  ];

  return (
    <div className="w-full h-full relative overflow-hidden bg-slate-900 border border-emerald-500/20 select-none p-3 flex flex-col justify-between">
      {/* Top Header: Sheet Icon & Format Tag */}
      <div className="flex items-center justify-between pb-1.5 border-b border-emerald-500/20">
        <div className="flex items-center gap-1.5 text-[9px] font-semibold text-emerald-400 font-mono">
          <FileSpreadsheet className="w-3 h-3 text-emerald-400" />
          <span>Spreadsheet Data</span>
        </div>
        <span className="text-[8px] font-mono text-emerald-300 bg-emerald-500/15 px-1.5 py-0.2 rounded border border-emerald-500/30">
          GRID
        </span>
      </div>

      {/* Mini Data Grid */}
      <div className="my-auto w-full rounded border border-slate-700/60 overflow-hidden bg-slate-950/70 shadow-xs">
        {/* Table Header */}
        <div className="grid grid-cols-4 bg-emerald-950/40 border-b border-slate-800 text-[7px] font-mono font-bold text-emerald-300">
          {headers.slice(0, 4).map((h, i) => (
            <div key={i} className="px-1.5 py-0.5 truncate border-r border-slate-800 last:border-0">
              {h || `Col ${i + 1}`}
            </div>
          ))}
        </div>

        {/* Table Rows */}
        {rows.slice(0, 3).map((row, rIdx) => (
          <div
            key={rIdx}
            className={`grid grid-cols-4 text-[7px] font-mono text-slate-300 border-b border-slate-800/80 last:border-0 ${
              rIdx % 2 === 0 ? "bg-white/5" : "bg-transparent"
            }`}
          >
            {row.slice(0, 4).map((cell, cIdx) => (
              <div
                key={cIdx}
                className="px-1.5 py-0.5 truncate border-r border-slate-800/60 last:border-0 text-slate-300"
              >
                {cell || "—"}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-between text-[7px] text-slate-400 font-mono pt-1 border-t border-slate-800">
        <span>Table Sheet</span>
        <span className="text-emerald-400/80 font-semibold">{file?.name?.split(".").pop().toUpperCase()}</span>
      </div>

      {/* Vignette Depth */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
    </div>
  );
};

export default CsvCardPreview;
