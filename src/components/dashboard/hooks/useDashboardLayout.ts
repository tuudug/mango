import { useState, useCallback, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  GridItem,
  WidgetType,
  defaultWidgetLayouts,
} from "@/lib/dashboardConfig";
import { useDebouncedCallback } from "use-debounce";
import {
  getCachedLayout,
  setCachedLayout,
  getCachedLastSyncTime,
  setCachedLastSyncTime,
} from "../utils";
import { getDefaultLayout, CACHE_STALE_DURATION } from "../constants";
import { DashboardName, CachedGridItemData } from "../types";

export function useDashboardLayout() {
  const { user, session } = useAuth();
  const token = session?.access_token;

  const [items, setItems] = useState<GridItem[]>([]);
  const [isLoadingLayout, setIsLoadingLayout] = useState(true);

  // Function to fetch layout from server (and cache it)
  const fetchLayout = useCallback(
    async (dashboardName: DashboardName, forceFetch = false) => {
      if (!token || !user) return null; // Return null if not authenticated

      // If not forcing fetch, check cache validity first
      if (!forceFetch) {
        const lastSyncTime = getCachedLastSyncTime();
        if (lastSyncTime && Date.now() - lastSyncTime < CACHE_STALE_DURATION) {
          const cachedLayout = getCachedLayout(dashboardName);
          if (cachedLayout) {
            console.log(`Using valid cached layout for: ${dashboardName}`);
            setItems(cachedLayout);
            setIsLoadingLayout(false);
            return cachedLayout; // Return cached layout
          } else {
            console.log(
              `Cache miss for ${dashboardName}, but sync time is recent. Will fetch.`
            );
          }
        } else {
          console.log(
            `Cache stale or missing sync time for ${dashboardName}. Will fetch.`
          );
        }
      }

      console.log(
        `Fetching layout from server for: ${dashboardName} (Force: ${forceFetch})`
      );
      setIsLoadingLayout(true);
      try {
        const response = await fetch(`/api/dashboards/${dashboardName}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!response.ok) {
          if (response.status === 404 || response.status === 401) {
            console.warn(
              `Layout fetch for ${dashboardName} failed (${response.status}), using default.`
            );
            const defaultItems = getDefaultLayout();
            setItems(defaultItems);
            setCachedLayout(dashboardName, defaultItems);
            setCachedLastSyncTime(Date.now());
            return defaultItems;
          } else {
            throw new Error(
              `API error: ${response.status} ${response.statusText}`
            );
          }
        }
        const data = await response.json();
        let loadedItems: GridItem[] = [];
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
          loadedItems = getDefaultLayout();
        }
        setItems(loadedItems);
        setCachedLayout(dashboardName, loadedItems);
        setCachedLastSyncTime(Date.now());
        return loadedItems;
      } catch (error) {
        console.error(`Error fetching layout for ${dashboardName}:`, error);
        const defaultItems = getDefaultLayout();
        setItems(defaultItems);
        setCachedLayout(dashboardName, defaultItems);
        setCachedLastSyncTime(Date.now());
        return defaultItems;
      } finally {
        setIsLoadingLayout(false);
      }
    },
    [token, user]
  );

  // Debounced function to save layout to the server (and update cache)
  const saveLayoutToServer = useDebouncedCallback(
    async (layoutToSave: GridItem[], dashboardName: DashboardName) => {
      if (!token || !user || !dashboardName) return;
      console.log(`Debounced save triggered for dashboard: ${dashboardName}`);
      try {
        const itemsToSave: CachedGridItemData[] = layoutToSave.map(
          ({ minW, minH, ...rest }) => rest
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
    isLoadingLayout,
    setIsLoadingLayout,
    fetchLayout,
    saveLayoutToServer,
  };
}
