import { NextRequest, NextResponse } from "next/server";
import { createAdminServiceClient } from "@/lib/supabase/service";
import {
  answerTelegramCallback,
  updateTelegramMessageText,
  sendTelegramSpamStrikeWarning,
} from "@/lib/telegram/bot";

export async function POST(req: NextRequest) {
  // 1. Verify Secret Token if TELEGRAM_WEBHOOK_SECRET is set
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  if (expectedSecret) {
    const receivedHeader = req.headers.get("x-telegram-bot-api-secret-token");
    const { searchParams } = new URL(req.url);
    const receivedParam = searchParams.get("secret");

    if (receivedHeader !== expectedSecret && receivedParam !== expectedSecret) {
      return NextResponse.json({ error: "Unauthorized webhook caller" }, { status: 401 });
    }
  }

  try {
    const body = await req.json();

    // Only process callback queries (inline button clicks)
    const callbackQuery = body.callback_query;
    if (!callbackQuery) {
      return NextResponse.json({ ok: true, message: "Ignored non-callback event." });
    }

    const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID?.trim();
    const callerId = callbackQuery.from?.id?.toString();

    // Verify caller is the authorized admin
    if (adminChatId && callerId !== adminChatId) {
      await answerTelegramCallback(callbackQuery.id, "Unauthorized: You are not the registered admin.");
      return NextResponse.json({ ok: false, error: "Unauthorized caller" });
    }

    const data: string = callbackQuery.data || "";
    // format: act:<action>:<entity_type>:<id>
    const parts = data.split(":");
    if (parts[0] !== "act" || parts.length < 4) {
      await answerTelegramCallback(callbackQuery.id, "Invalid action format.");
      return NextResponse.json({ ok: false, error: "Invalid data format" });
    }

    const action = parts[1]; // "approve" | "reject" | "ban"
    const entityType = parts[2]; // "recipe" | "review" | "user"
    const entityId = parts[3];

    const supabase = createAdminServiceClient();
    const nowIso = new Date().toISOString();
    const message = callbackQuery.message;
    const chatId = message?.chat?.id || adminChatId;
    const messageId = message?.message_id;

    if (action === "approve" && entityType === "recipe") {
      const { data: rec } = await supabase
        .from("recipes")
        .select("id, title, user_id")
        .eq("id", entityId)
        .single();

      await supabase
        .from("recipes")
        .update({
          status: "approved",
          is_published: true,
          review_token: null,
          reviewed_at: nowIso,
          moderation_note: "Approved via Telegram Bot action button",
        })
        .eq("id", entityId);

      await supabase.from("ai_moderation_reports").insert({
        entity_type: "recipe",
        entity_id: entityId,
        verdict: "safe",
        executive_summary: "Recipe approved and published by Admin via Telegram.",
        action_taken: "auto_approved",
        reviewed_by_channel: "telegram_button",
        created_at: nowIso,
      });

      if (rec?.user_id) {
        await supabase.from("notifications").insert({
          user_id: rec.user_id,
          type: "system",
          title: "🎉 Recipe Approved!",
          message: `Good news! Your recipe "${rec.title}" has been reviewed and approved.`,
          link: `/recipe/${rec.id}`,
          entity_id: rec.id,
        });
      }

      await answerTelegramCallback(callbackQuery.id, "✅ Recipe approved and published!");
      if (messageId && chatId) {
        await updateTelegramMessageText(
          chatId,
          messageId,
          `✅ <b>Recipe Approved & Published</b>\nExecuted by Admin via Telegram on ${new Date().toLocaleString()}`
        );
      }
    } else if (action === "reject" && entityType === "recipe") {
      const { data: rec } = await supabase
        .from("recipes")
        .select("id, title, user_id, author:user_id(id, username, spam_strikes)")
        .eq("id", entityId)
        .single();

      await supabase
        .from("recipes")
        .update({
          status: "rejected",
          is_published: false,
          review_token: null,
          reviewed_at: nowIso,
          moderation_note: "Rejected via Telegram Bot action button",
        })
        .eq("id", entityId);

      // Apply 5-hour cooldown and increment strike counter
      const cooldownUntil = new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString();
      let newStrikes = 1;

      if (rec?.user_id) {
        const authorProfile: any = rec.author;
        const currentStrikes = authorProfile?.spam_strikes || 0;
        newStrikes = currentStrikes + 1;

        await supabase
          .from("profiles")
          .update({
            cooldown_until: cooldownUntil,
            spam_strikes: newStrikes,
          })
          .eq("id", rec.user_id);

        // Notify user about rejection and 5-hour cooldown
        await supabase.from("notifications").insert({
          user_id: rec.user_id,
          type: "system",
          title: "Recipe Rejected (5-Hour Cooldown)",
          message: `Your recipe "${rec.title}" was rejected for violating community guidelines. Your account is on a 5-hour cooldown from publishing.`,
          link: `/recipe/${rec.id}`,
          entity_id: rec.id,
        });

        // If user reaches 5 strikes, trigger urgent Telegram alert to admin
        if (newStrikes >= 5) {
          await sendTelegramSpamStrikeWarning({
            userId: rec.user_id,
            username: authorProfile?.username || "Unknown",
            strikes: newStrikes,
            lastRecipeTitle: rec.title,
          });
        }
      }

      await supabase.from("ai_moderation_reports").insert({
        entity_type: "recipe",
        entity_id: entityId,
        author_id: rec?.user_id,
        verdict: "rejected",
        executive_summary: `Recipe rejected by Admin via Telegram. Applied 5h cooldown (Strike #${newStrikes}).`,
        action_taken: "manual_reviewed",
        reviewed_by_channel: "telegram_button",
        created_at: nowIso,
      });

      await answerTelegramCallback(callbackQuery.id, `❌ Recipe rejected. 5h cooldown applied (Strike ${newStrikes}).`);
      if (messageId && chatId) {
        await updateTelegramMessageText(
          chatId,
          messageId,
          `❌ <b>Recipe Rejected & Locked Out</b>\n5-hour cooldown applied (Strike #${newStrikes}). Executed on ${new Date().toLocaleString()}`
        );
      }
    } else if (action === "ban" && entityType === "user") {
      await supabase
        .from("profiles")
        .update({ is_banned: true })
        .eq("id", entityId);

      // Unpublish all recipes by this banned user
      await supabase
        .from("recipes")
        .update({ is_published: false, status: "rejected" })
        .eq("user_id", entityId);

      await supabase.from("ai_moderation_reports").insert({
        entity_type: "user",
        entity_id: entityId,
        author_id: entityId,
        verdict: "banned",
        executive_summary: "User banned and all content unpublished via Telegram.",
        action_taken: "manual_reviewed",
        reviewed_by_channel: "telegram_button",
        created_at: nowIso,
      });

      await answerTelegramCallback(callbackQuery.id, "🚫 Spammer banned and recipes unpublished.");
      if (messageId && chatId) {
        await updateTelegramMessageText(
          chatId,
          messageId,
          `🚫 <b>Spammer Banned</b>\nUser banned and all recipes removed via Telegram on ${new Date().toLocaleString()}`
        );
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("Error processing Telegram webhook:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

