import { useAuth } from "@/contexts/AuthContext";
import { GridItem } from "@/lib/dashboardConfig";
import { WidgetType, defaultWidgetLayouts } from "@/lib/widgetConfig";
import { useCallback, useEffect, useRef, useState } from "react";
import { useDashboardConfig } from "@/contexts/DashboardConfigContext"; // Import the hook
// Removed duplicate GridItem import
import { CACHE_STALE_DURATION, getDefaultLayout } from "../constants";
import { CachedGridItemData, DashboardName } from "../types";
import {
  deepCompareLayouts,
  getCachedLastSyncTime,
  getCachedLayout,
  setCachedLastSyncTime,
  setCachedLayout,
} from "../utils";

export function useDashboardLayout() {
  const { user, session } = useAuth();
  const token = session?.access_token;
  // Consume the new context functions AND the config map
  const { initializeConfigs, setWidgetConfig, widgetConfigs } =
    useDashboardConfig();

  // State for the currently displayed layout
  const [items, setItems] = useState<GridItem[]>([]);
  // State for the layout being actively edited (null when not editing)
  const [editItems, setEditItems] = useState<GridItem[] | null>(null);

  // Ref to access the latest displayed items state if needed
  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const [isLoadingLayout, setIsLoadingLayout] = useState(true);
  const [isBackgroundFetching, setIsBackgroundFetching] = useState(false);

  // --- Save Function (Now used primarily by saveEditLayout) ---
  const saveLayoutToServerInternal = useCallback(
    async (layoutToSave: GridItem[], dashboardName: DashboardName) => {
      if (!token || !user || !dashboardName) {
        console.error(
          "[SaveInternal] Missing auth token, user, or dashboardName. Aborting save."
        );
        return false; // Indicate failure
      }
      try {
        // Map items, getting the config directly from the context state
        const itemsToSave: CachedGridItemData[] = layoutToSave.map(
          // Destructure without config from layoutToSave
          ({ id, type, x, y, w, h }) => ({
            id,
            type,
            x,
            y,
            w,
            h,
            // Get latest config from context, default to {} if not found
            config: widgetConfigs[id] ?? {},
          })
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
            `[SaveInternal] Error saving layout for ${dashboardName}:`,
            response.status,
            errorData
          );
          return false; // Indicate failure
        } else {
          // Update cache immediately on successful save
          setCachedLayout(dashboardName, layoutToSave);
          setCachedLastSyncTime(Date.now());
          return true; // Indicate success
        }
      } catch (error) {
        console.error(
          `[SaveInternal] Network error saving layout for ${dashboardName}:`,
          error
        );
        return false; // Indicate failure
      }
    },
    // Add widgetConfigs to dependency array as it's now used inside
    [token, user, widgetConfigs]
  );

  // --- Fetch Layout ---
  const fetchLayout = useCallback(
    async (
      dashboardName: DashboardName,
      forceFetch = false,
      options: { background?: boolean; forEditing?: boolean } = {} // Add forEditing flag
    ): Promise<GridItem[] | null> => {
      let isBackground = options.background ?? false;
      let initialItemsSetFromCache = false;
      const forEditing = options.forEditing ?? false; // Check if fetch is for starting edit mode

      if (!token || !user) return null;

      // --- Cache Check Logic ---
      if (!forceFetch && !forEditing) {
        // Don't use cache if fetching specifically for editing
        const lastSyncTime = getCachedLastSyncTime();
        if (lastSyncTime && Date.now() - lastSyncTime < CACHE_STALE_DURATION) {
          const cachedLayout = getCachedLayout(dashboardName);
          if (cachedLayout) {
            // Use cache for immediate display if items state is empty (initial load)
            if (items.length === 0) {
              setItems(cachedLayout);
              setIsLoadingLayout(false);
              initialItemsSetFromCache = true;
            }
            isBackground = true; // Always fetch in background if cache is valid
          }
        }
      }
      // --- End Cache Check ---

      // --- Fetching Logic ---
      if (!isBackground && !initialItemsSetFromCache) {
        setIsLoadingLayout(true);
      } else if (isBackground) {
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
          } else {
            useDefault = true;
          }
        }

        if (useDefault) {
          loadedItems = getDefaultLayout();
        }

        // --- Process Result ---
        // Create initial config map from loaded items
        const initialConfigs: Record<string, GridItem["config"] | undefined> =
          {};
        loadedItems.forEach((item) => {
          if (item.config) {
            initialConfigs[item.id] = item.config;
          }
        });
        initializeConfigs(initialConfigs); // Initialize context state

        if (forEditing) {
          // If fetching for editing, set both layout states
          setEditItems(loadedItems);
          setItems(loadedItems); // Also update main display state initially
          setCachedLayout(dashboardName, loadedItems); // Update cache
          setCachedLastSyncTime(Date.now());
        } else {
          // If fetching for display (background or initial load)
          const currentDisplayItems = itemsRef.current; // Compare against displayed items
          const areLayoutsEqual = deepCompareLayouts(
            currentDisplayItems,
            loadedItems
          );

          if (!areLayoutsEqual) {
            setItems(loadedItems); // Update display state only if different
            setCachedLayout(dashboardName, loadedItems);
            setCachedLastSyncTime(Date.now());
          } else {
            if (!useDefault) {
              setCachedLastSyncTime(Date.now()); // Still update sync time if fetch was successful
            }
          }
        }
        return loadedItems; // Return the fetched/default items
      } catch (error) {
        console.error(`Error fetching layout for ${dashboardName}:`, error);
        // Handle initial load failure
        if (items.length === 0 && !forEditing) {
          const defaultItems = getDefaultLayout();
          setItems(defaultItems);
          setCachedLayout(dashboardName, defaultItems);
          setCachedLastSyncTime(Date.now());
          return defaultItems;
        }
        // Handle edit load failure? Maybe set editItems to current items?
        if (forEditing) {
          console.error(
            `Failed to fetch layout for editing ${dashboardName}. Setting editItems to current display items.`
          );
          setEditItems([...items]); // Fallback to current display items
          return [...items];
        }
        return null;
      } finally {
        if (!isBackground && !initialItemsSetFromCache) {
          setIsLoadingLayout(false);
        }
        setIsBackgroundFetching(false);
      }
    },
    // Dependencies need to include initializeConfigs and potentially items/token/user
    [token, user, items, initializeConfigs]
  );

  // --- Function to save the edited layout ---
  const saveEditLayout = useCallback(
    async (dashboardName: DashboardName): Promise<boolean> => {
      if (!editItems) {
        console.warn("[SaveEdit] No edit items to save.");
        return false;
      }
      // Pass the current editItems state to the internal save function
      const success = await saveLayoutToServerInternal(
        editItems,
        dashboardName
      );
      if (success) {
        // Update the main display state with the saved items
        setItems(editItems);
        // Clear the edit state
        setEditItems(null);
      } else {
        console.error(
          `[SaveEdit] Failed to save layout for ${dashboardName}. Edit state not cleared.`
        );
        // Optionally: Add user feedback about save failure
      }
      return success;
    },
    // Keep dependencies: editItems and the (now updated) saveLayoutToServerInternal
    [editItems, saveLayoutToServerInternal]
  );

  // --- Function to update layout state AND context config ---
  // Renamed and removed currentLayout parameter
  const updateLayoutAndConfig = (
    itemId: string,
    newConfig: Record<string, any>,
    dashboardName: DashboardName,
    // currentLayout: GridItem[], // REMOVED
    isEditing: boolean // Explicit flag
  ) => {
    if (!dashboardName) {
      console.error("[UpdateLayoutAndConfig] dashboardName is required.");
      return;
    }

    // Use the explicit isEditing flag
    if (isEditing) {
      // --- In Edit Mode ---
      // Read current editItems state, update it, then set it
      setEditItems((currentEditItems) => {
        if (!currentEditItems) return null; // Should not happen if isEditing is true, but safety check
        const updatedLayout = currentEditItems.map((item) =>
          item.id === itemId ? { ...item, config: newConfig } : item
        );
        // Check if item was found (optional)
        const itemFound = updatedLayout.some((item) => item.id === itemId);
        if (!itemFound) {
          console.error(
            `[UpdateLayoutAndConfig] Item ${itemId} NOT FOUND in editItems. Aborting state update.`
          );
          return currentEditItems; // Return original state if not found
        }
        return updatedLayout;
      });
      // Update context AFTER state update
      setWidgetConfig(itemId, newConfig);
      // NO server save here
    } else {
      // --- Not in Edit Mode ---
      // Read current items state, update it, then set it
      let finalLayoutToSave: GridItem[] | null = null;
      setItems((currentItems) => {
        const updatedLayout = currentItems.map((item) =>
          item.id === itemId ? { ...item, config: newConfig } : item
        );
        // Check if item was found (optional)
        const itemFound = updatedLayout.some((item) => item.id === itemId);
        if (!itemFound) {
          console.error(
            `[UpdateLayoutAndConfig] Item ${itemId} NOT FOUND in items. Aborting state update.`
          );
          finalLayoutToSave = currentItems; // Prepare to save original state
          return currentItems; // Return original state if not found
        }
        finalLayoutToSave = updatedLayout; // Prepare to save updated state
        return updatedLayout;
      });
      // Update context AFTER state update
      setWidgetConfig(itemId, newConfig);
      // Save immediately if not in edit mode (use the layout determined above)
      if (finalLayoutToSave) {
        saveLayoutToServerInternal(finalLayoutToSave, dashboardName);
      }
    }
  };

  return {
    items, // Currently displayed items
    editItems, // Items being edited (or null)
    setItems, // To update display items (e.g., after save)
    setEditItems, // To update edit items directly (e.g., move/resize/add/delete)
    isLoadingLayout,
    isBackgroundFetching,
    fetchLayout,
    saveEditLayout, // Function to save edits and exit edit mode
    updateLayoutAndConfig, // Renamed function
  };
}
