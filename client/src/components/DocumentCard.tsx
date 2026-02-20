import { ExternalLink, BookOpen, Database, Globe, Archive, Folder } from "lucide-react";
import { Card } from "@/components/ui/card";

export type ResourceType = "electronic_library" | "repository" | "catalog" | "database" | "other";

export interface DocumentCardProps {
  name: string;
  description?: string | null;
  type: ResourceType;
  url?: string | null;
  accessConditions?: string;
}

const TYPE_ICONS: Record<ResourceType, React.ReactNode> = {
  catalog: <BookOpen className="w-5 h-5 text-indigo-600" />,
  database: <Database className="w-5 h-5 text-emerald-600" />,
  electronic_library: <Globe className="w-5 h-5 text-blue-600" />,
  repository: <Archive className="w-5 h-5 text-violet-600" />,
  other: <Folder className="w-5 h-5 text-gray-500" />,
};

const TYPE_LABELS: Record<ResourceType, string> = {
  catalog: "Каталог",
  database: "База даних",
  electronic_library: "Електронна бібліотека",
  repository: "Репозитарій",
  other: "Інше",
};

const TYPE_BADGE_CLASSES: Record<ResourceType, string> = {
  catalog: "bg-indigo-50 text-indigo-700 border-indigo-200",
  database: "bg-emerald-50 text-emerald-700 border-emerald-200",
  electronic_library: "bg-blue-50 text-blue-700 border-blue-200",
  repository: "bg-violet-50 text-violet-700 border-violet-200",
  other: "bg-gray-100 text-gray-600 border-gray-200",
};

export function DocumentCard({ name, description, type, url, accessConditions }: DocumentCardProps) {
  return (
    <Card className="p-4 flex flex-col gap-3 hover:shadow-md transition-shadow border-gray-200 hover:border-indigo-300">
      {/* Header row */}
      <div className="flex items-start gap-3">
        <div className="shrink-0 w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center border border-gray-100">
          {TYPE_ICONS[type]}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm leading-snug">{name}</p>
          {accessConditions && (
            <p className="text-xs text-gray-500 mt-0.5">{accessConditions}</p>
          )}
        </div>
      </div>

      {/* Description */}
      {description && (
        <p className="text-xs text-gray-600 leading-relaxed line-clamp-3">{description}</p>
      )}

      {/* Footer row */}
      <div className="flex items-center justify-between mt-auto pt-1">
        <span
          className={`inline-flex items-center text-xs px-2 py-0.5 rounded border font-medium ${TYPE_BADGE_CLASSES[type]}`}
        >
          {TYPE_LABELS[type]}
        </span>
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 hover:underline"
          >
            <ExternalLink className="w-3 h-3" />
            Відкрити
          </a>
        )}
      </div>
    </Card>
  );
}
