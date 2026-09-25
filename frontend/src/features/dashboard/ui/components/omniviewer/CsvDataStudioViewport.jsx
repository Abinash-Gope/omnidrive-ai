import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import {
  Table as TableIcon,
  Search,
  ArrowUpDown,
  Download,
  Copy,
  Check,
  Loader2,
  AlertCircle,
  FileSpreadsheet,
  Share2,
  X,
} from "lucide-react";

/**
 * Robust CSV/TSV parser supporting quotes and escaped commas
 */
const parseCsv = (text, delimiter = ",") => {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lines.length === 0) return { headers: [], rows: [] };

  const parseLine = (line) => {
    const values = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === delimiter && !inQuotes) {
        values.push(current.trim().replace(/^"|"$/g, ""));
        current = "";
      } else {
        current += char;
      }
    }
    values.push(current.trim().replace(/^"|"$/g, ""));
    return values;
  };

  const headers = parseLine(lines[0]);
  const rows = lines.slice(1).map(parseLine);

  return { headers, rows };
};

const CsvDataStudioViewport = ({ file, onClose, onShare, downloadLink }) => {
  const [data, setData] = useState({ headers: [], rows: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortCol, setSortCol] = useState(null);
  const [sortAsc, setSortAsc] = useState(true);
  const [copied, setCopied] = useState(false);

  const fileUrl = file.downloadUrl || file.download_url || downloadLink || null;
  const isTsv = (file.name || "").toLowerCase().endsWith(".tsv");
  const delimiter = isTsv ? "\t" : ",";

  useEffect(() => {
    let isMounted = true;
    if (!fileUrl) {
      setError("Download URL not available for this CSV.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    axios
      .get(fileUrl, { responseType: "text" })
      .then((res) => {
        if (!isMounted) return;
        const text = typeof res.data === "string" ? res.data : String(res.data);
        const parsed = parseCsv(text, delimiter);
        setData(parsed);
        setIsLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.warn("Could not fetch CSV content:", err);
        setError("Unable to load CSV data. File might be blocked by CORS or too large for live preview.");
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [fileUrl, delimiter]);

  // Sort rows
  const sortedRows = useMemo(() => {
    if (sortCol === null) return data.rows;
    return [...data.rows].sort((a, b) => {
      const valA = a[sortCol] || "";
      const valB = b[sortCol] || "";
      const numA = Number(valA);
      const numB = Number(valB);

      if (!isNaN(numA) && !isNaN(numB)) {
        return sortAsc ? numA - numB : numB - numA;
      }
      return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
    });
  }, [data.rows, sortCol, sortAsc]);

  // Filter rows based on search
  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return sortedRows;
    const q = searchQuery.toLowerCase();
    return sortedRows.filter((row) =>
      row.some((cell) => (cell || "").toLowerCase().includes(q))
    );
  }, [sortedRows, searchQuery]);

  const handleSort = (colIndex) => {
    if (sortCol === colIndex) {
      setSortAsc(!sortAsc);
    } else {
      setSortCol(colIndex);
      setSortAsc(true);
    }
  };

  const handleCopyTable = () => {
    const tsv = [
      data.headers.join("\t"),
      ...filteredRows.map((r) => r.join("\t")),
    ].join("\n");
    navigator.clipboard.writeText(tsv);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 text-slate-400">
        <Loader2 className="w-8 h-8 text-[#1a73e8] animate-spin mb-3" />
        <span className="text-xs font-mono">Parsing spreadsheet data grid...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 p-6 text-center text-slate-300">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mb-3">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h4 className="text-sm font-bold text-white mb-1">Cannot Preview Dataset</h4>
        <p className="text-xs text-slate-400 max-w-md mb-4">{error}</p>
        {fileUrl && (
          <a
            href={fileUrl}
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2 rounded-xl bg-[#1a73e8] hover:bg-[#1557b0] text-white text-xs font-semibold shadow-lg transition-all"
          >
            Download CSV Directly
          </a>
        )}
      </div>
    );
  }

  return (
    <div
      style={{ maxHeight: "calc(100vh - 105px)" }}
      className="w-full h-full max-w-5xl flex flex-col rounded-3xl border border-white/10 bg-slate-900/80 backdrop-blur-2xl shadow-2xl overflow-hidden relative select-text font-mono text-xs"
    >
      {/* Standardized Studio In-Stage Header Toolbar */}
      <div className="h-12 px-4 sm:px-5 bg-slate-900/90 border-b border-white/10 flex items-center justify-between text-slate-300 shrink-0 z-20">
        {/* Left: Format & Spreadsheet Metrics */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-semibold text-white text-xs truncate max-w-[160px] sm:max-w-xs font-sans">
            {file.name}
          </span>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shrink-0">
            {isTsv ? "TSV TABLE" : "CSV DATA"}
          </span>
          <span className="text-slate-400 text-[11px] hidden sm:inline">
            {filteredRows.length} rows • {data.headers.length} columns
          </span>
        </div>

        {/* Right: Actions (Filter, Copy Data, Share, Download, Close) */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Row Filter Input */}
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Filter rows..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1 rounded-xl bg-black/40 border border-white/10 text-white placeholder-slate-500 text-[11px] focus:outline-hidden focus:border-emerald-500 w-36 sm:w-44"
            />
          </div>

          {/* Copy Table TSV */}
          <button
            onClick={handleCopyTable}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-white text-xs font-sans font-medium transition-colors"
            title="Copy table data to clipboard"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>

          {/* Share Link */}
          {onShare && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onShare();
              }}
              className="p-1.5 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-slate-300 hover:text-white transition-colors"
              title="Copy share link"
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Download Link */}
          {(downloadLink || fileUrl) && (
            <a
              href={downloadLink || fileUrl}
              download={file.name || "table.csv"}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="p-1.5 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-slate-300 hover:text-white transition-colors"
              title="Download CSV file"
            >
              <Download className="w-3.5 h-3.5" />
            </a>
          )}

          {/* Close Button */}
          {onClose && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="p-1.5 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-white/80 hover:text-white transition-colors"
              title="Close (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Spreadsheet Data Grid */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse text-left">
          {/* Sticky Header */}
          <thead className="sticky top-0 bg-slate-900 border-b border-slate-700 z-10">
            <tr>
              <th className="py-2.5 px-3 text-[10px] text-slate-500 font-bold uppercase border-r border-slate-800 w-12 text-center">
                #
              </th>
              {data.headers.map((h, i) => (
                <th
                  key={i}
                  onClick={() => handleSort(i)}
                  className="py-2.5 px-4 text-xs font-bold text-slate-200 border-r border-slate-800/80 hover:bg-slate-800/60 cursor-pointer select-none transition-colors"
                >
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="truncate max-w-[200px]">{h || `Col ${i + 1}`}</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-500 hover:text-emerald-400 shrink-0" />
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-slate-800/60">
            {filteredRows.slice(0, 500).map((row, rIdx) => (
              <tr
                key={rIdx}
                className="hover:bg-slate-900/60 transition-colors group"
              >
                <td className="py-2 px-3 text-[10px] font-mono text-slate-600 text-center border-r border-slate-800/60 bg-slate-950 group-hover:bg-slate-900/80">
                  {rIdx + 1}
                </td>
                {data.headers.map((_, cIdx) => (
                  <td
                    key={cIdx}
                    className="py-2 px-4 text-xs text-slate-300 border-r border-slate-800/40 truncate max-w-[320px]"
                    title={row[cIdx] || ""}
                  >
                    {row[cIdx] || <span className="text-slate-600">—</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {filteredRows.length > 500 && (
          <div className="py-4 text-center text-xs text-slate-500 bg-slate-950 border-t border-slate-800">
            Showing first 500 rows of {filteredRows.length} total rows.
          </div>
        )}
      </div>
    </div>
  );
};

export default CsvDataStudioViewport;
