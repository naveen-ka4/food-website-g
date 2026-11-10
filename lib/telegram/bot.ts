/**
 * Telegram Interactive Bot Client for Hey Garlic AI Moderation.
 * Dispatches real-time alerts with inline decision buttons and handles interactive webhook responses.
 */

export interface TelegramAlertParams {
  entityType: "recipe" | "review" | "user";
  entityId: string;
  authorId?: string;
  authorName?: string;
  title: string;
  verdict: "safe" | "needs_info" | "flagged";
  confidenceScore: number;
  executiveSummary: string;
  issues: string[];
  viewUrl?: string;
  reviewToken?: string;
}

export function isTelegramConfigured(): boolean {
  return Boolean(
    process.env.TELEGRAM_BOT_TOKEN?.trim() &&
    process.env.TELEGRAM_ADMIN_CHAT_ID?.trim()
  );
}

/**
 * Sends a rich, visual moderation alert with 1-click interactive action buttons to the Telegram Admin Chat.
 */
export async function sendTelegramModerationAlert(params: TelegramAlertParams): Promise<{
  success: boolean;
  messageId?: number;
  error?: string;
}> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID?.trim();

  if (!token || !chatId) {
    return { success: false, error: "Telegram bot credentials not configured in .env." };
  }

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
  const inspectUrl = params.reviewToken
    ? `${siteUrl}/secret-review/${params.reviewToken}`
    : params.viewUrl || `${siteUrl}/secret-review/pending`;

  const verdictEmoji = params.verdict === "flagged" ? "🚨" : params.verdict === "needs_info" ? "⚠️" : "✨";
  const verdictTitle =
    params.verdict === "flagged"
      ? "LOCKED SPAM / POLICY VIOLATION"
      : params.verdict === "needs_info"
      ? "NEEDS AUTHOR REVISION"
      : "SAFE TO PUBLISH";

  const scorePercent = Math.round(params.confidenceScore * 100);

  // Clean Markdown formatting for Telegram
  const messageText = `
${verdictEmoji} <b>Hey Garlic Autonomous Security Alert</b>

<b>Item:</b> ${escapeHtml(params.title)} (${params.entityType})
<b>Author:</b> ${escapeHtml(params.authorName || "Community User")}
<b>Status:</b> <code>LOCKED (Anti-Tamper)</code>
<b>AI / Filter Confidence:</b> ${scorePercent}%

<b>Executive Summary:</b>
<i>"${escapeHtml(params.executiveSummary)}"</i>

${params.issues.length > 0 ? `<b>Violations Detected:</b>\n${params.issues.map((i) => `• ${escapeHtml(i)}`).join("\n")}\n` : ""}
<i>Decision buttons (or tap Secret Review below):</i>
`.trim();

  const inlineKeyboard: Array<Array<{ text: string; callback_data?: string; url?: string }>> = [
    [
      {
        text: "✅ Approve & Publish",
        callback_data: `act:approve:${params.entityType}:${params.entityId}`,
      },
      {
        text: "❌ Reject (5h Cooldown)",
        callback_data: `act:reject:${params.entityType}:${params.entityId}`,
      },
    ],
    [
      {
        text: "🔍 Open Secret Review",
        url: inspectUrl,
      },
    ],
  ];

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: messageText,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: inlineKeyboard,
        },
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.ok) {
      console.warn("Telegram sendMessage failed:", data);
      return { success: false, error: data.description || "Failed to deliver Telegram message." };
    }

    return { success: true, messageId: data.result?.message_id };
  } catch (err: any) {
    console.warn("Exception sending Telegram alert:", err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Acknowledges callback button click in Telegram (stops button loading spinner)
 */
export async function answerTelegramCallback(
  callbackQueryId: string,
  alertText?: string
): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) return false;

  try {
    await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text: alertText || "Action executed successfully!",
        show_alert: Boolean(alertText),
      }),
    });
    return true;
  } catch (err) {
    console.warn("Error answering Telegram callback:", err);
    return false;
  }
}

/**
 * Updates an existing Telegram message after an admin clicks an action button
 */
export async function updateTelegramMessageText(
  chatId: string | number,
  messageId: number,
  updatedText: string
): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) return false;

  try {
    await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        text: updatedText,
        parse_mode: "HTML",
      }),
    });
    return true;
  } catch (err) {
    console.warn("Error editing Telegram message:", err);
    return false;
  }
}

/**
 * Dispatches a high-priority strike escalation alert when a user accumulates 5+ strikes.
 */
export async function sendTelegramSpamStrikeWarning(params: {
  userId: string;
  username?: string;
  strikes: number;
  lastRecipeTitle?: string;
}): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID?.trim();
  if (!token || !chatId) return false;

  const text = `
🚨 <b>CRITICAL USER SPAM STRIKE ALERT</b>

<b>User:</b> @${escapeHtml(params.username || "Unknown")}
<b>User ID:</b> <code>${escapeHtml(params.userId)}</code>
<b>Total Rejection Strikes:</b> <code>${params.strikes}</code>
${params.lastRecipeTitle ? `<b>Latest Infraction:</b> "${escapeHtml(params.lastRecipeTitle)}"\n` : ""}
⚠️ <b>Action Required:</b> This user has reached <b>5 policy violation strikes</b>.
Please review their account and consider suspending or banning them directly in your <b>Supabase Dashboard</b>.
`.trim();

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
      }),
    });
    return res.ok;
  } catch (err) {
    console.warn("Error sending spam strike Telegram warning:", err);
    return false;
  }
}

function escapeHtml(text: string): string {
  return (text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
