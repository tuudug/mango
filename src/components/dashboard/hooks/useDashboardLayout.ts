import { useAuth } from "@/contexts/AuthContext";
import { GridItem } from "@/lib/dashboardConfig";
import { WidgetType, defaultWidgetLayouts } from "@/lib/widgetConfig";
import { useCallback, useEffect, useRef, useState } from "react";
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
      console.log(
        `[SaveInternal] Saving layout for dashboard: ${dashboardName}`
      );
      if (!token || !user || !dashboardName) {
        console.error(
          "[SaveInternal] Missing auth token, user, or dashboardName. Aborting save."
        );
        return false; // Indicate failure
      }
      try {
        const itemsToSave: CachedGridItemData[] = layoutToSave.map(
          ({ minW, minH, ...rest }) => ({
            id: rest.id,
            type: rest.type,
            x: rest.x,
            y: rest.y,
            w: rest.w,
            h: rest.h,
            config: rest.config,
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
          const savedData = await response.json();
          console.log(
            `[SaveInternal] Layout for ${dashboardName} saved successfully. Response ID: ${savedData?.id}`
          );
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
    [token, user]
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
      console.log(
        `Fetching layout from server for: ${dashboardName} (Force: ${forceFetch}, Edit: ${forEditing}, Effective Background: ${isBackground})`
      );
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
        if (forEditing) {
          // If fetching for editing, set both states
          console.log(`Setting editItems and items for ${dashboardName}`);
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
            console.log(
              `Fetched layout for ${dashboardName} differs from current display state. Updating items state.`
            );
            setItems(loadedItems); // Update display state only if different
            setCachedLayout(dashboardName, loadedItems);
            setCachedLastSyncTime(Date.now());
          } else {
            console.log(
              `Fetched layout for ${dashboardName} is same as current display state. Skipping state update.`
            );
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
    [token, user, items] // Added items dependency for fallback in edit fetch failure
  );

  // --- Function to save the edited layout ---
  const saveEditLayout = useCallback(
    async (dashboardName: DashboardName): Promise<boolean> => {
      if (!editItems) {
        console.warn("[SaveEdit] No edit items to save.");
        return false;
      }
      console.log(`[SaveEdit] Saving editItems for ${dashboardName}`);
      const success = await saveLayoutToServerInternal(
        editItems,
        dashboardName
      );
      if (success) {
        // Update the main display state with the saved items
        setItems(editItems);
        // Clear the edit state
        setEditItems(null);
        console.log(
          `[SaveEdit] Successfully saved and cleared editItems for ${dashboardName}`
        );
      } else {
        console.error(
          `[SaveEdit] Failed to save layout for ${dashboardName}. Edit state not cleared.`
        );
        // Optionally: Add user feedback about save failure
      }
      return success;
    },
    [editItems, saveLayoutToServerInternal]
  );

  // --- Function to update widget config ---
  // Now uses an explicit isEditing flag
  const updateWidgetConfig = (
    itemId: string,
    newConfig: Record<string, any>,
    dashboardName: DashboardName,
    currentLayout: GridItem[], // Expects the layout array (either items or editItems)
    isEditing: boolean // Explicit flag
  ) => {
    if (!dashboardName) {
      console.error("[UpdateConfig] dashboardName is required.");
      return;
    }

    // --- MODIFICATION START ---
    // Create a new array with updated item object reference
    const updatedLayout = currentLayout.map((item) => {
      if (item.id === itemId) {
        // Create a completely new object for the updated item
        return {
          ...item, // Copy all existing properties
          config: newConfig, // Set the new config
        };
      }
      return item; // Return unchanged items as they are
    });
    // --- MODIFICATION END ---

    // Check if the item was actually found and updated (optional sanity check)
    const itemFound = updatedLayout.some(
      (item, index) =>
        item.id === itemId && currentLayout[index].config !== newConfig
    );
    if (!itemFound) {
      console.error(
        `[UpdateConfig] Item ${itemId} NOT FOUND or config unchanged in provided layout. Aborting. Layout IDs:`,
        currentLayout.map((i) => i.id)
      );
      return;
    }

    // Use the explicit isEditing flag
    if (isEditing) {
      // --- In Edit Mode ---
      console.log(`[UpdateConfig] Updating editItems state for ${itemId}`);
      setEditItems(updatedLayout);
      // NO server save here
    } else {
      // --- Not in Edit Mode ---
      console.warn(
        `[UpdateConfig] Updating items state directly (not in edit mode) for ${itemId}. Saving immediately.`
      );
      setItems(updatedLayout);
      // Save immediately if not in edit mode
      saveLayoutToServerInternal(updatedLayout, dashboardName);
    }
  };

  // // Debounced save - keep it around? Maybe useful for other things later.
  // const saveLayoutDebounced = useDebouncedCallback(
  //   (layout: GridItem[], name: DashboardName) => {
  //     if (editItems === null) {
  //       // Only save debounced if NOT in edit mode
  //       saveLayoutToServerInternal(layout, name);
  //     } else {
  //       console.log("[DebounceSave] In edit mode, debounced save skipped.");
  //     }
  //   },
  //   1000
  // );

  return {
    items, // Currently displayed items
    editItems, // Items being edited (or null)
    setItems, // To update display items (e.g., after save)
    setEditItems, // To update edit items directly (e.g., move/resize/add/delete)
    isLoadingLayout,
    isBackgroundFetching,
    fetchLayout,
    saveEditLayout, // Function to save edits and exit edit mode
    updateWidgetConfig, // Updates editItems or items based on mode
    // Expose the debounced save? Maybe rename it? For now, keep internal.
    // saveLayoutToServer: saveLayoutDebounced,
  };
}
