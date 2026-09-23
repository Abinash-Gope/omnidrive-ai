import React from "react";
import {
  Sparkles,
  Users,
  Trees,
  Building2,
  FileText,
  Car,
  Tag,
  X,
  LayoutGrid,
  Columns,
  CheckSquare,
} from "lucide-react";

/**
 * Smart AI Category & Rekognition Tag Bar
 * 
 * Auto-clusters photos based on AWS Rekognition Vision AI labels and provides
 * instant, single-click tag filtering and gallery layout switching.
 */
export const PhotoCategoryBar = ({
  images = [],
  activeCategory = "all",
  onSelectCategory,
  activeTag = null,
  onSelectTag,
  photoViewMode = "cards",
  onToggleViewMode,
  isSelectionMode = false,
  selectedCount = 0,
  onToggleSelectionMode,
}) => {
  // Category definition with keyword matchers for Rekognition labels
  const categories = [
    {
      id: "all",
      label: "All Photos",
      icon: Sparkles,
      matcher: () => true,
    },
    {
      id: "people",
      label: "People & Portraits",
      icon: Users,
      matcher: (labels) =>
        labels.some((l) =>
          /person|face|human|portrait|smile|man|woman|people|girl|boy/i.test(l.name || "")
        ),
    },
    {
      id: "nature",
      label: "Nature & Outdoors",
      icon: Trees,
      matcher: (labels) =>
        labels.some((l) =>
          /nature|landscape|sky|plant|tree|flower|water|ocean|mountain|cloud|sunset|sunrise/i.test(
            l.name || ""
          )
        ),
    },
    {
      id: "urban",
      label: "Urban & Architecture",
      icon: Building2,
      matcher: (labels) =>
        labels.some((l) =>
          /city|building|architecture|street|house|urban|skyscraper|downtown|bridge/i.test(
            l.name || ""
          )
        ),
    },
    {
      id: "documents",
      label: "Screenshots & Docs",
      icon: FileText,
      matcher: (labels) =>
        labels.some((l) =>
          /text|paper|document|webpage|screenshot|poster|book|font|diagram|receipt/i.test(
            l.name || ""
          )
        ),
    },
    {
      id: "vehicles",
      label: "Vehicles & Travel",
      icon: Car,
      matcher: (labels) =>
        labels.some((l) =>
          /car|vehicle|transportation|automobile|road|highway|airplane|train|boat/i.test(
            l.name || ""
          )
        ),
    },
  ];

  // Calculate photo count per smart category
  const categoryCounts = React.useMemo(() => {
    const counts = {};
    categories.forEach((cat) => {
      counts[cat.id] = images.filter((img) => cat.matcher(img.labels || [])).length;
    });
    return counts;
  }, [images]);

  // Aggregate and sort top Rekognition tags across all photos
  const topTags = React.useMemo(() => {
    const tagFreq = {};
    images.forEach((img) => {
      (img.labels || []).forEach((l) => {
        const name = l.name?.trim();
        if (name) {
          tagFreq[name] = (tagFreq[name] || 0) + 1;
        }
      });
    });

    return Object.entries(tagFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));
  }, [images]);

  return (
    <div className="space-y-3 pt-1 pb-2">
      {/* Category Pills & View Mode Bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {/* Smart Categories */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full scrollbar-none">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const count = categoryCounts[cat.id] || 0;
            const isSelected = activeCategory === cat.id && !activeTag;

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onSelectCategory(cat.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition-all shrink-0 active:scale-95 ${
                  isSelected
                    ? "bg-[#1a73e8] text-white shadow-xs font-semibold"
                    : "bg-white/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/80 border border-slate-200/80 dark:border-slate-700/80"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isSelected ? "text-white" : "text-slate-400 dark:text-slate-400"}`} />
                <span>{cat.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isSelected
                      ? "bg-white/20 text-white"
                      : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* View Switcher & Selection Mode */}
        <div className="flex items-center gap-1.5 shrink-0 ml-auto">
          {/* Multi-Select Toggle Button */}
          <button
            type="button"
            onClick={onToggleSelectionMode}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 border transition-all ${
              isSelectionMode
                ? "bg-blue-50 dark:bg-blue-950/50 border-[#1a73e8] text-[#1a73e8] dark:text-blue-400 font-semibold"
                : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
            }`}
            title="Toggle multi-select mode"
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">
              {isSelectionMode ? `Select Mode (${selectedCount})` : "Select"}
            </span>
          </button>

          {/* Photo Wall vs Cards Mode Switcher */}
          <div className="flex items-center p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700">
            <button
              type="button"
              onClick={() => onToggleViewMode("cards")}
              className={`p-1.5 rounded-lg text-xs font-medium transition-all ${
                photoViewMode === "cards"
                  ? "bg-white dark:bg-slate-700 text-[#1a73e8] dark:text-blue-400 shadow-xs"
                  : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              }`}
              title="Card View (Details & EXIF)"
            >
              <Columns className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onToggleViewMode("wall")}
              className={`p-1.5 rounded-lg text-xs font-medium transition-all ${
                photoViewMode === "wall"
                  ? "bg-white dark:bg-slate-700 text-[#1a73e8] dark:text-blue-400 shadow-xs"
                  : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              }`}
              title="Photo Wall View (Immersive Timeline)"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Top Rekognition AI Tags Bar */}
      {topTags.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full scrollbar-none text-xs">
          <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider shrink-0 mr-1">
            <Tag className="w-3 h-3" />
            <span>AI Tags:</span>
          </div>

          {topTags.map((tag) => {
            const isTagActive = activeTag === tag.name;
            return (
              <button
                key={tag.name}
                type="button"
                onClick={() => onSelectTag(isTagActive ? null : tag.name)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all shrink-0 flex items-center gap-1 ${
                  isTagActive
                    ? "bg-emerald-500 text-white shadow-xs font-semibold"
                    : "bg-slate-100/80 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-600 dark:hover:text-emerald-400 border border-slate-200/60 dark:border-slate-700/60"
                }`}
              >
                <span>#{tag.name}</span>
                <span className={`text-[10px] opacity-75 font-mono`}>({tag.count})</span>
              </button>
            );
          })}

          {(activeTag || activeCategory !== "all") && (
            <button
              type="button"
              onClick={() => {
                onSelectCategory("all");
                onSelectTag(null);
              }}
              className="px-2 py-1 rounded-lg text-[11px] font-medium text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-1 shrink-0 ml-1 transition-colors"
            >
              <X className="w-3 h-3" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default PhotoCategoryBar;
