import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../../middleware/auth";
import { PostgrestError } from "@supabase/supabase-js";

export const moveTodoHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.userId;
    const supabaseUserClient = req.supabase;
    const { itemId } = req.params;
    const { direction } = req.body; // Expect 'up' or 'down'

    if (!userId || !supabaseUserClient || !itemId || !direction) {
      res
        .status(400)
        .json({ message: "Missing user auth, item ID, or direction" });
      return;
    }

    if (direction !== "up" && direction !== "down") {
      res
        .status(400)
        .json({ message: "Invalid direction specified. Use 'up' or 'down'." });
      return;
    }

    // Use a transaction to ensure atomicity
    const { error: transactionError } = await supabaseUserClient.rpc(
      "move_todo_item",
      {
        p_user_id: userId,
        p_item_id: itemId,
        p_direction: direction,
      }
    );

    if (transactionError) {
      console.error(
        `Error moving todo ${itemId} ${direction}:`,
        transactionError
      );
      // Check for specific function errors if needed (e.g., item not found, cannot move further)
      if (transactionError.message.includes("Item not found")) {
        res.status(404).json({ message: transactionError.message });
      } else if (transactionError.message.includes("Cannot move")) {
        res.status(400).json({ message: transactionError.message });
      } else {
        throw transactionError; // Throw other DB errors
      }
      return;
    }

    console.log(
      `Successfully moved todo ${itemId} ${direction} for user ${userId}`
    );
    res.status(200).json({ message: `Item moved ${direction} successfully` });
  } catch (err: unknown) {
    console.error("Server error moving todo item:", err);
    next(err); // Pass error to global handler
  }
};

// --- Corresponding PostgreSQL Function (move_todo_item) ---
/*
-- Function to move a todo item up or down within its siblings
CREATE OR REPLACE FUNCTION move_todo_item(p_user_id UUID, p_item_id UUID, p_direction TEXT)
RETURNS VOID AS $$
DECLARE
    v_item_parent_id UUID;
    v_item_position INT;
    v_target_item_id UUID;
    v_target_item_position INT;
BEGIN
    -- Find the item and its position/parent
    SELECT parent_id, position INTO v_item_parent_id, v_item_position
    FROM manual_todo_items
    WHERE id = p_item_id AND user_id = p_user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Item not found or not owned by user.';
    END IF;

    -- Find the target item to swap with
    IF p_direction = 'up' THEN
        SELECT id, position INTO v_target_item_id, v_target_item_position
        FROM manual_todo_items
        WHERE user_id = p_user_id
          AND parent_id IS NOT DISTINCT FROM v_item_parent_id -- Handles NULL parent_id correctly
          AND position < v_item_position
        ORDER BY position DESC
        LIMIT 1;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Cannot move item further up.';
        END IF;

    ELSIF p_direction = 'down' THEN
        SELECT id, position INTO v_target_item_id, v_target_item_position
        FROM manual_todo_items
        WHERE user_id = p_user_id
          AND parent_id IS NOT DISTINCT FROM v_item_parent_id
          AND position > v_item_position
        ORDER BY position ASC
        LIMIT 1;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Cannot move item further down.';
        END IF;
    ELSE
        RAISE EXCEPTION 'Invalid direction specified.';
    END IF;

    -- Swap positions
    UPDATE manual_todo_items
    SET position = v_target_item_position
    WHERE id = p_item_id AND user_id = p_user_id;

    UPDATE manual_todo_items
    SET position = v_item_position
    WHERE id = v_target_item_id AND user_id = p_user_id;

END;
$$ LANGUAGE plpgsql;

-- Grant execute permission (adjust role as needed)
-- GRANT EXECUTE ON FUNCTION move_todo_item(UUID, UUID, TEXT) TO authenticated;
-- GRANT EXECUTE ON FUNCTION move_todo_item(UUID, UUID, TEXT) TO service_role;

*/
