import { SearchIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type KnowledgeBaseResultsProps = {
  output: string;
  className?: string;
};

// The tool execute function returns a pre-formatted string like:
// "[1] content\n\n[2] other content"
// or a plain message like "No relevant information found in the knowledge base."
function parseEntries(output: string): string[] {
  // Split on numbered entries like "[1] ", "[2] ", etc.
  const entries = output.split(/\n\n(?=\[\d+\])/).map((s) => s.trim()).filter(Boolean);
  return entries.length > 1 ? entries : [output];
}

const SNIPPET_MAX_LENGTH = 200;

function truncate(text: string): string {
  return text.length > SNIPPET_MAX_LENGTH
    ? text.slice(0, SNIPPET_MAX_LENGTH).trimEnd() + "…"
    : text;
}

export function KnowledgeBaseResults({ output, className }: KnowledgeBaseResultsProps) {
  const isNoResults =
    output.startsWith("No relevant") || output.startsWith("Error");
  const entries = isNoResults ? [] : parseEntries(output);

  return (
    <div className={cn("flex flex-col gap-2 text-sm", className)} data-testid="knowledge-base-results">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <SearchIcon className="size-3.5" />
        <span className="font-medium">Knowledge base searched</span>
      </div>

      {entries.length === 0 ? (
        <p className="text-muted-foreground text-xs pl-5" data-testid="no-results">
          {output}
        </p>
      ) : (
        <ul className="flex flex-col gap-1.5 pl-5" data-testid="results-list">
          {entries.map((entry, i) => (
            <li
              key={i}
              className="rounded-md border bg-muted/40 px-3 py-2"
              data-testid="result-card"
            >
              <p className="text-xs text-foreground/80 leading-relaxed">
                {truncate(entry)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
