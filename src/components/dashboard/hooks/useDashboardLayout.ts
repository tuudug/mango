import { useAuth } from "@/contexts/AuthContext";
import { GridItem } from "@/lib/dashboardConfig";
import { WidgetType, defaultWidgetLayouts } from "@/lib/widgetConfig";
import { useCallback, useEffect, useRef, useState } from "react";
import { useDashboardConfig } from "@/contexts/DashboardConfigContext"; // Import the hook
import { useToast } from "@/contexts/ToastContext"; // Import useToast
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

  // --- Edit Mode State ---
  const [isEditing, setIsEditing] = useState(false);
  const [editTarget, setEditTarget] = useState<DashboardName>("default");
  const [isSaving, setIsSaving] = useState(false);
  const [isSwitchingTarget, setIsSwitchingTarget] = useState(false);
  const prevEditTargetRef = useRef<DashboardName>(editTarget);
  const { showToast } = useToast(); // Use toast for feedback

  // --- Save Function (Internal) ---
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
      if (!isBackground && !initialItemsSetFromCache && !forEditing) {
        // Only show main loader if not background and not fetching for edit start
        setIsLoadingLayout(true);
      } else if (isBackground) {
        setIsBackgroundFetching(true);
      }
      // No separate loading state needed for 'forEditing' as Dashboard handles it

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
          // If fetching for editing, set editItems directly
          setEditItems(loadedItems);
          // Optionally update main items if needed, or let the calling component handle it
          // setItems(loadedItems); // Decided against this, let Dashboard handle initial sync
          setCachedLayout(dashboardName, loadedItems);
          setCachedLastSyncTime(Date.now());
        } else {
          // If fetching for display
          const currentDisplayItems = itemsRef.current;
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
        if (forEditing) {
          console.error(
            `Failed to fetch layout for editing ${dashboardName}. Setting editItems to current display items.`
          );
          // Fallback: Set editItems to a copy of the current display items
          const currentDisplayItems = itemsRef.current;
          setEditItems([...currentDisplayItems]);
          return [...currentDisplayItems]; // Return the fallback items
        }
        return null; // Fetch failed for display
      } finally {
        if (!isBackground && !initialItemsSetFromCache && !forEditing) {
          setIsLoadingLayout(false);
        }
        setIsBackgroundFetching(false);
      }
    },
    [token, user, initializeConfigs] // Removed 'items' dependency
  );

  // --- Edit Mode Control Functions ---

  const startEditing = useCallback(
    (initialTarget: DashboardName) => {
      setIsEditing(true);
      setEditTarget(initialTarget);
      prevEditTargetRef.current = initialTarget; // Sync ref
      // Fetch layout specifically for editing, replacing current editItems
      fetchLayout(initialTarget, true, { forEditing: true });
    },
    [fetchLayout]
  );

  const stopEditing = useCallback(async (): Promise<boolean> => {
    if (!editItems) {
      console.warn("[StopEdit] No edit items found.");
      setIsEditing(false); // Still exit edit mode
      return true; // Consider it a success in terms of exiting mode
    }
    setIsSaving(true);
    let success = false;
    try {
      success = await saveLayoutToServerInternal(editItems, editTarget);
      if (success) {
        // Update main display state ONLY on successful save
        setItems(editItems);
        setEditItems(null); // Clear edit state
        setIsEditing(false);
        // Reset edit target to default after successful save and exit
        setEditTarget("default");
      } else {
        showToast({
          title: "Save Failed",
          description: "Could not save dashboard changes. Please try again.",
          variant: "destructive",
        });
        // Keep isEditing true and editItems populated on failure
      }
    } catch (error) {
      console.error("[StopEdit] Error during save:", error);
      showToast({
        title: "Save Error",
        description: "An unexpected error occurred while saving.",
        variant: "destructive",
      });
      // Keep isEditing true and editItems populated on failure
    } finally {
      setIsSaving(false);
    }
    return success;
  }, [editItems, editTarget, saveLayoutToServerInternal, showToast]);

  const switchEditTarget = useCallback(
    async (newTarget: DashboardName) => {
      if (newTarget === editTarget) return; // No change

      setIsSwitchingTarget(true);
      setEditTarget(newTarget); // Optimistically update target
      prevEditTargetRef.current = newTarget; // Sync ref

      try {
        // Fetch layout for the new target, replacing current editItems
        await fetchLayout(newTarget, true, { forEditing: true });
      } catch (error) {
        console.error(
          `[SwitchEditTarget] Error fetching layout for ${newTarget}:`,
          error
        );
        // Optionally revert target or show error
        setEditTarget(prevEditTargetRef.current); // Revert if fetch fails?
        showToast({
          title: "Switch Failed",
          description: `Could not load layout for ${newTarget}.`,
          variant: "destructive",
        });
      } finally {
        setIsSwitchingTarget(false);
      }
    },
    [editTarget, fetchLayout, showToast]
  );

  // Effect to sync prevEditTargetRef when editTarget changes externally (if ever needed)
  useEffect(() => {
    prevEditTargetRef.current = editTarget;
  }, [editTarget]);

  // --- Function to update item config (works in both modes) ---
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
    // saveEditLayout, // Removed old save function
    updateLayoutAndConfig, // Function to update config (works in both modes)

    // Edit Mode State & Controls
    isEditing,
    editTarget,
    isSaving, // True while stopEditing is saving
    isSwitchingTarget, // True while switchEditTarget is fetching
    startEditing, // Function to enter edit mode
    stopEditing, // Function to save changes and exit edit mode
    switchEditTarget, // Function to change the layout being edited (mobile/default)
  };
}
