"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface NotificationItem {
  id: string;
  userId: string;
  actorId?: string;
  actorName: string;
  actorUsername?: string;
  actorAvatar?: string;
  type: "review" | "review_reply" | "save" | "recipe_like" | "milestone" | "system" | "follow";
  title: string;
  message: string;
  link: string;
  isRead: boolean;
  entityId?: string;
  createdAt: string;
}

/**
 * Server Action: Get notifications for the current user
 */
export async function getNotificationsAction(options?: {
  limit?: number;
  filter?: "all" | "unread";
}): Promise<NotificationItem[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const limit = options?.limit ?? 25;
  const filter = options?.filter ?? "all";

  let query = supabase
    .from("notifications")
    .select(`
      id,
      user_id,
      actor_id,
      type,
      title,
      message,
      link,
      is_read,
      entity_id,
      created_at,
      actor:actor_id (
        id,
        full_name,
        username,
        avatar_url
      )
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (filter === "unread") {
    query = query.eq("is_read", false);
  }

  const { data, error } = await query;
  if (error) {
    console.warn("Error fetching notifications:", error.message);
    return [];
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    userId: row.user_id,
    actorId: row.actor_id || undefined,
    actorName: row.actor?.full_name || row.actor?.username || "Someone",
    actorUsername: row.actor?.username || undefined,
    actorAvatar: row.actor?.avatar_url || undefined,
    type: row.type,
    title: row.title,
    message: row.message,
    link: row.link,
    isRead: Boolean(row.is_read),
    entityId: row.entity_id || undefined,
    createdAt: row.created_at,
  }));
}

/**
 * Server Action: Get unread notification count
 */
export async function getUnreadNotificationCountAction(): Promise<number> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return 0;

  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("is_read", false);

  if (error) {
    console.warn("Error checking unread notifications count:", error.message);
    return 0;
  }

  return count || 0;
}

/**
 * Server Action: Mark a single notification as read
 */
export async function markNotificationAsReadAction(notificationId: string): Promise<{ success: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false };

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId)
    .eq("user_id", user.id);

  if (error) {
    console.warn("Error marking notification read:", error.message);
    return { success: false };
  }

  revalidatePath("/notifications");
  return { success: true };
}

/**
 * Server Action: Mark all notifications as read for current user
 */
export async function markAllNotificationsAsReadAction(): Promise<{ success: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false };

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", user.id)
    .eq("is_read", false);

  if (error) {
    console.warn("Error marking all notifications read:", error.message);
    return { success: false };
  }

  revalidatePath("/notifications");
  return { success: true };
}

/**
 * Server Action: Delete a single notification
 */
export async function deleteNotificationAction(notificationId: string): Promise<{ success: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false };

  const { error } = await supabase
    .from("notifications")
    .delete()
    .eq("id", notificationId)
    .eq("user_id", user.id);

  if (error) {
    console.warn("Error deleting notification:", error.message);
    return { success: false };
  }

  revalidatePath("/notifications");
  return { success: true };
}

/**
 * Server Action: Delete all read notifications
 */
export async function clearReadNotificationsAction(): Promise<{ success: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false };

  const { error } = await supabase
    .from("notifications")
    .delete()
    .eq("user_id", user.id)
    .eq("is_read", true);

  if (error) {
    console.warn("Error clearing read notifications:", error.message);
    return { success: false };
  }

  revalidatePath("/notifications");
  return { success: true };
}

/**
 * Internal Dispatcher: Create notification for a recipient
 * - Ensures no self-notification (actor !== recipient)
 * - Safe fail (doesn't break primary user actions)
 */
export async function createNotificationInternal(data: {
  userId: string; // Recipient
  actorId?: string; // Performer
  type: "review" | "review_reply" | "save" | "recipe_like" | "milestone" | "system" | "follow";
  title: string;
  message: string;
  link: string;
  entityId?: string;
  metadata?: Record<string, any>;
}): Promise<boolean> {
  // Never notify oneself
  if (data.actorId && data.actorId === data.userId) {
    return false;
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.from("notifications").insert({
      user_id: data.userId,
      actor_id: data.actorId || null,
      type: data.type,
      title: data.title,
      message: data.message,
      link: data.link,
      is_read: false,
      entity_id: data.entityId || null,
      metadata: data.metadata || {},
    });

    if (error) {
      console.warn("Could not insert notification:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("Notification dispatch exception:", err);
    return false;
  }
}

