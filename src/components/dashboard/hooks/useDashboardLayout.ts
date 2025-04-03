import { useAuth } from "@/contexts/AuthContext";
import {
  GridItem,
  WidgetType,
  defaultWidgetLayouts,
} from "@/lib/dashboardConfig";
import { useCallback, useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import { CACHE_STALE_DURATION, getDefaultLayout } from "../constants";
import { CachedGridItemData, DashboardName } from "../types";
import {
  getCachedLastSyncTime,
  getCachedLayout,
  setCachedLastSyncTime,
  setCachedLayout,
  deepCompareLayouts, // Import the new comparison function
} from "../utils";

export function useDashboardLayout() {
  const { user, session } = useAuth();
  const token = session?.access_token;

  const [items, setItems] = useState<GridItem[]>([]);
  const [isLoadingLayout, setIsLoadingLayout] = useState(true); // Main loader (for initial/edit switch)
  const [isBackgroundFetching, setIsBackgroundFetching] = useState(false); // Background loader

  // Function to fetch layout from server (and cache it)
  const fetchLayout = useCallback(
    async (
      dashboardName: DashboardName,
      forceFetch = false,
      options: { background?: boolean } = {} // Add options object
    ): Promise<GridItem[] | null> => {
      // Return promise with layout or null
      let isBackground = options.background ?? false; // Default to non-background
      let initialItemsSetFromCache = false;

      if (!token || !user) return null; // Return null if not authenticated

      // --- Cache Check Logic ---
      // If not forcing fetch, check cache validity first
      if (!forceFetch) {
        const lastSyncTime = getCachedLastSyncTime();
        if (lastSyncTime && Date.now() - lastSyncTime < CACHE_STALE_DURATION) {
          const cachedLayout = getCachedLayout(dashboardName);
          if (cachedLayout) {
            console.log(
              `Valid cache found for ${dashboardName}. Using for initial display if needed.`
            );
            // Use cache for immediate display if items are empty (initial load)
            if (items.length === 0) {
              setItems(cachedLayout);
              setIsLoadingLayout(false); // Turn off initial loader early
              initialItemsSetFromCache = true;
            }
            // Don't return here, proceed to fetch in background to check for updates
            isBackground = true; // Force this fetch to be background
            console.log(
              `Proceeding with background fetch for ${dashboardName} despite valid cache.`
            );
          } else {
            console.log(
              `Cache miss for ${dashboardName}, but sync time is recent. Will fetch (Original Background: ${
                options.background ?? false
              }).`
            );
            // Keep original isBackground setting if cache is missing
            isBackground = options.background ?? false;
          }
        } else {
          console.log(
            `Cache stale or missing sync time for ${dashboardName}. Will fetch (Original Background: ${
              options.background ?? false
            }).`
          );
          // Keep original isBackground setting if cache is stale
          isBackground = options.background ?? false;
        }
      }
      // --- End Cache Check ---

      // --- Fetching Logic ---
      console.log(
        `Fetching layout from server for: ${dashboardName} (Force: ${forceFetch}, Effective Background: ${isBackground})`
      );
      // Set appropriate loading state ONLY if not already handled by initial cache display
      if (!isBackground && !initialItemsSetFromCache) {
        setIsLoadingLayout(true);
      } else if (isBackground) {
        // This includes the case where we forced background due to valid cache
        setIsBackgroundFetching(true);
      }

      try {
        const response = await fetch(`/api/dashboards/${dashboardName}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        let loadedItems: GridItem[] = [];
        let useDefault = false;

        if (!response.ok) {
          if (response.status === 404 || response.status === 401) {
            console.warn(
              `Layout fetch for ${dashboardName} failed (${response.status}), using default.`
            );
            useDefault = true;
          } else {
            throw new Error(
              `API error: ${response.status} ${response.statusText}`
            );
          }
        } else {
          const data = await response.json();
          if (data.layout && Array.isArray(data.layout)) {
            loadedItems = data.layout.map((item: CachedGridItemData) => {
              const itemType = item.type as WidgetType;
              const defaults = defaultWidgetLayouts[itemType]
                ? defaultWidgetLayouts[itemType]
                : { w: 6, h: 4, minW: 2, minH: 2 };
              return {
                ...item,
                minW: defaults.minW,
                minH: defaults.minH,
              };
            });
            console.log(`Layout for ${dashboardName} fetched successfully.`);
          } else {
            console.log(
              `No layout data found for ${dashboardName}, using default.`
            );
            useDefault = true;
          }
        }

        if (useDefault) {
          loadedItems = getDefaultLayout();
        }

        // --- Process Result ---
        // Compare potentially fetched items with the *current* state items
        const areLayoutsEqual = deepCompareLayouts(items, loadedItems);

        if (!areLayoutsEqual) {
          console.log(
            `Fetched layout for ${dashboardName} differs from current state. Updating state.`
          );
          setItems(loadedItems); // Update state only if different
          setCachedLayout(dashboardName, loadedItems); // Update cache
          setCachedLastSyncTime(Date.now()); // Update sync time
        } else {
          console.log(
            `Fetched layout for ${dashboardName} is same as current state. Skipping state update.`
          );
          // Update sync time even if layout is the same, indicating a successful check
          if (!useDefault) {
            // Only update sync time if fetch was successful
            setCachedLastSyncTime(Date.now());
          }
        }
        return loadedItems; // Return the fetched (or default) result
      } catch (error) {
        console.error(`Error fetching layout for ${dashboardName}:`, error);
        // Use default layout on error ONLY if items are empty (initial load failed)
        if (items.length === 0) {
          const defaultItems = getDefaultLayout();
          setItems(defaultItems);
          setCachedLayout(dashboardName, defaultItems);
          setCachedLastSyncTime(Date.now());
          return defaultItems;
        }
        return null; // Indicate error without changing state if items already exist
      } finally {
        // --- Cleanup Loading States ---
        // Only turn off main loader if it was potentially turned on
        if (!isBackground && !initialItemsSetFromCache) {
          setIsLoadingLayout(false);
        }
        setIsBackgroundFetching(false); // Always turn off background flag
      }
    },
    [token, user, items] // Add items to dependency array for comparison
  );

  // Debounced function to save layout to the server (and update cache)
  const saveLayoutToServer = useDebouncedCallback(
    async (layoutToSave: GridItem[], dashboardName: DashboardName) => {
      if (!token || !user || !dashboardName) return;
      console.log(`Debounced save triggered for dashboard: ${dashboardName}`);
      try {
        const itemsToSave: CachedGridItemData[] = layoutToSave.map(
          ({ minW: _minW, minH: _minH, ...rest }) => rest
        );

        const response = await fetch(`/api/dashboards/${dashboardName}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ layout: itemsToSave }),
        });
        if (!response.ok) {
          const errorData = await response.json();
          console.error(
            `Error saving layout for ${dashboardName}:`,
            response.status,
            errorData
          );
          // TODO: Add user feedback
        } else {
          console.log(`Layout for ${dashboardName} saved successfully.`);
          // Update cache immediately on successful save
          setCachedLayout(dashboardName, layoutToSave);
          setCachedLastSyncTime(Date.now());
        }
      } catch (error) {
        console.error(
          `Network error saving layout for ${dashboardName}:`,
          error
        );
        // TODO: Add user feedback
      }
    },
    1000 // Debounce time
  );

  return {
    items,
    setItems,
    isLoadingLayout, // For initial load / edit mode switch
    isBackgroundFetching, // For subtle background updates
    // setIsLoadingLayout, // No longer expose setter directly? Managed internally.
    fetchLayout,
    saveLayoutToServer,
  };
}
