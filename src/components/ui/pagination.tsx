import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

type PaginationProps = {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  const pages = buildPageList(page, totalPages);

  return (
    <nav
      aria-label="Pagination"
      className="flex items-center justify-center gap-1 pt-4"
    >
      <Button
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        size="sm"
        type="button"
        variant="ghost"
      >
        <ChevronLeft className="h-4 w-4" />
        <span className="sr-only">Previous</span>
      </Button>

      {pages.map((entry, index) =>
        entry === "..." ? (
          <span
            className="px-2 text-sm text-stone-500"
            key={`ellipsis-${index}`}
          >
            ...
          </span>
        ) : (
          <Button
            className={entry === page ? "bg-amber-300/20 text-amber-300" : ""}
            key={entry}
            onClick={() => onPageChange(entry)}
            size="sm"
            type="button"
            variant="ghost"
          >
            {entry}
          </Button>
        ),
      )}

      <Button
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        size="sm"
        type="button"
        variant="ghost"
      >
        <span className="sr-only">Next</span>
        <ChevronRight className="h-4 w-4" />
      </Button>
    </nav>
  );
}

function buildPageList(
  current: number,
  total: number,
): (number | "...")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | "...")[] = [1];

  if (current > 3) {
    pages.push("...");
  }

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (current < total - 2) {
    pages.push("...");
  }

  pages.push(total);

  return pages;
}
