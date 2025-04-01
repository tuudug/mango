import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area"; // Import ScrollArea
import { useEffect, useState } from "react";

interface ChangelogEntryData {
  version: string;
  date: string;
  data: string[];
}

interface ChangelogModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChangelogModal({ isOpen, onOpenChange }: ChangelogModalProps) {
  const [changelogData, setChangelogData] = useState<ChangelogEntryData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      setError(null);
      fetch("/changelog.json") // Fetch from public directory
        .then((response) => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.json();
        })
        .then((data: ChangelogEntryData[]) => {
          // Sort data by version descending (optional, assumes semantic versioning or simple numbers)
          data.sort((a, b) => {
            // Basic version comparison, might need refinement for complex versions (e.g., 1.10 vs 1.2)
            const versionA = parseFloat(a.version);
            const versionB = parseFloat(b.version);
            return versionB - versionA;
          });
          setChangelogData(data);
        })
        .catch((e) => {
          console.error("Failed to fetch changelog:", e);
          setError(e instanceof Error ? e.message : "Failed to load changelog");
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [isOpen]); // Refetch when modal opens

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[80vw] md:max-w-[70vw] lg:max-w-[60vw] h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Changelog</DialogTitle>
          <DialogDescription>
            Recent updates and changes to Mango.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 pr-6 -mr-6">
          {" "}
          {/* Add ScrollArea */}
          <div className="py-4 space-y-6">
            {loading && <p className="text-center text-gray-500">Loading...</p>}
            {error && (
              <p className="text-center text-red-500">Error: {error}</p>
            )}
            {!loading && !error && changelogData.length === 0 && (
              <p className="text-center text-gray-500">
                No changelog entries found.
              </p>
            )}
            {!loading &&
              !error &&
              changelogData.map((entry) => (
                <div key={entry.version}>
                  <h3 className="text-lg font-semibold mb-1">
                    Version {entry.version}
                    <span className="text-sm font-normal text-gray-500 ml-2">
                      ({entry.date})
                    </span>
                  </h3>
                  <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700 dark:text-gray-300">
                    {entry.data.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>
              ))}
          </div>
        </ScrollArea>
        <DialogFooter className="mt-4">
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
