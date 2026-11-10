import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  isTelegramConfigured,
  sendTelegramModerationAlert,
  answerTelegramCallback,
  updateTelegramMessageText,
} from "../../lib/telegram/bot";

describe("Telegram Interactive Moderation Bot Client", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it("identifies when Telegram credentials are fully configured", () => {
    delete process.env.TELEGRAM_BOT_TOKEN;
    delete process.env.TELEGRAM_ADMIN_CHAT_ID;
    expect(isTelegramConfigured()).toBe(false);

    process.env.TELEGRAM_BOT_TOKEN = "12345:TOKEN";
    process.env.TELEGRAM_ADMIN_CHAT_ID = "987654";
    expect(isTelegramConfigured()).toBe(true);
  });

  it("sends formatted moderation alert with 1-click action buttons", async () => {
    process.env.TELEGRAM_BOT_TOKEN = "12345:TOKEN";
    process.env.TELEGRAM_ADMIN_CHAT_ID = "987654";
    process.env.NEXT_PUBLIC_SITE_URL = "https://heygarlic.com";

    const globalFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        result: { message_id: 101 },
      }),
    });
    vi.stubGlobal("fetch", globalFetch);

    const result = await sendTelegramModerationAlert({
      entityType: "recipe",
      entityId: "rec-123",
      authorId: "usr-456",
      authorName: "Kasun Perera",
      title: "Spicy Garlic Naan",
      verdict: "flagged",
      confidenceScore: 0.25,
      executiveSummary: "Spam link detected in recipe directions.",
      issues: ["External promotion link detected"],
    });

    expect(result.success).toBe(true);
    expect(result.messageId).toBe(101);

    expect(globalFetch).toHaveBeenCalledWith(
      "https://api.telegram.org/bot12345:TOKEN/sendMessage",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("act:approve:recipe:rec-123"),
      })
    );

    // Verify inline keyboard contains reject and ban callbacks
    const callArgs = globalFetch.mock.calls[0][1];
    const parsedBody = JSON.parse(callArgs.body);
    expect(parsedBody.chat_id).toBe("987654");
    expect(parsedBody.parse_mode).toBe("HTML");

    const buttons = parsedBody.reply_markup.inline_keyboard.flat();
    expect(buttons.some((b: any) => b.callback_data === "act:approve:recipe:rec-123")).toBe(true);
    expect(buttons.some((b: any) => b.callback_data === "act:reject:recipe:rec-123")).toBe(true);
    expect(buttons.some((b: any) => typeof b.url === "string" && b.url.includes("secret-review"))).toBe(true);
  });

  it("answers Telegram callback queries cleanly", async () => {
    process.env.TELEGRAM_BOT_TOKEN = "12345:TOKEN";

    const globalFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    });
    vi.stubGlobal("fetch", globalFetch);

    const ok = await answerTelegramCallback("cb-query-999", "Recipe Approved!");
    expect(ok).toBe(true);
    expect(globalFetch).toHaveBeenCalledWith(
      "https://api.telegram.org/bot12345:TOKEN/answerCallbackQuery",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("cb-query-999"),
      })
    );
  });
});

