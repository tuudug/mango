import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../../middleware/auth";

export const reorderTodosHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.userId;
    const supabaseUserClient = req.supabase;
    const { parentId, orderedIds } = req.body;

    if (!userId || !supabaseUserClient) {
      res.status(401).json({ message: "Authentication data missing" });
      return;
    }
    if (!Array.isArray(orderedIds)) {
      res
        .status(400)
        .json({ message: "Missing or invalid 'orderedIds' array" });
      return;
    }
    if (
      parentId !== null &&
      (typeof parentId !== "string" || parentId.length === 0)
    ) {
      res.status(400).json({
        message: "Invalid 'parentId' format (must be null or a UUID string)",
      });
      return;
    }
    if (!orderedIds.every((id) => typeof id === "string" && id.length > 0)) {
      res
        .status(400)
        .json({ message: "Invalid ID format within 'orderedIds' array" });
      return;
    }

    if (parentId) {
      const { data: parentData, error: parentError } = await supabaseUserClient
        .from("manual_todo_items")
        .select("id")
        .eq("id", parentId)
        .eq("user_id", userId)
        .maybeSingle();
      if (parentError || !parentData) {
        res
          .status(404)
          .json({ message: "Parent todo not found or not owned by user" });
        return;
      }
    }

    const updatePromises = orderedIds.map((id, index) => {
      const updateQuery = supabaseUserClient
        .from("manual_todo_items")
        .update({
          position: index + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("user_id", userId);

      if (parentId) {
        updateQuery.eq("parent_id", parentId);
      } else {
        updateQuery.is("parent_id", null);
      }
      return updateQuery;
    });

    const results = await Promise.allSettled(updatePromises);

    const errors = results.filter((r) => r.status === "rejected");
    const failedUpdates = results
      .map((r, i) => (r.status === "rejected" ? orderedIds[i] : null))
      .filter((id) => id !== null);

    if (errors.length > 0) {
      console.error(
        `Failed to update position for ${
          errors.length
        } todo items for user ${userId} under parent ${
          parentId || "NULL"
        }. Failed IDs: ${failedUpdates.join(", ")}`,
        errors.map((e) => (e as PromiseRejectedResult).reason)
      );
      res.status(500).json({
        message: `Failed to update position for some items. Failed IDs: ${failedUpdates.join(
          ", "
        )}`,
      });
      return;
    }

    console.log(
      `Successfully reordered ${
        orderedIds.length
      } todo items for user ${userId} under parent ${parentId || "NULL"}`
    );
    res.status(200).json({ message: "Todo items reordered successfully" });
  } catch (err: unknown) {
    console.error("Server error reordering todo items:", err);
    next(err);
  }
};
