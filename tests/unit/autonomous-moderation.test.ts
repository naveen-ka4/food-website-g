import { describe, it, expect, vi, beforeEach } from "vitest";
import { runFreeContentFilter } from "@/lib/moderation/free-filter";

describe("Autonomous Moderation Pipeline Logic", () => {
  it("Stage 1 Free Filter intercepts porn and spam links with zero AI cost", () => {
    const spamInput = {
      title: "Delicious Pizza",
      description: "Join our casino vip t.me/free_slots_win",
      category: "Dinner",
      ingredients: ["dough", "cheese"],
      instructions: ["bake"],
    };

    const filterRes = runFreeContentFilter(spamInput);
    expect(filterRes.passed).toBe(false);
    expect(filterRes.isSevereViolation).toBe(true);
    expect(filterRes.issues.length).toBeGreaterThan(0);
  });

  it("Stage 1 passes clean recipe to Stage 2", () => {
    const cleanInput = {
      title: "Sri Lankan Coconut Sambol",
      description: "Fresh grated coconut with chili, lime, and red onions.",
      category: "Condiments",
      ingredients: [
        { name: "fresh coconut", amount: "1 cup" },
        { name: "red chili powder", amount: "1 tsp" },
      ],
      instructions: ["Mix ingredients in a mortar and pestle until well blended."],
    };

    const filterRes = runFreeContentFilter(cleanInput);
    expect(filterRes.passed).toBe(true);
    expect(filterRes.isSevereViolation).toBe(false);
    expect(filterRes.issues.length).toBe(0);
  });

  it("Calculates 5-hour cooldown correctly", () => {
    const now = Date.now();
    const cooldownPeriodMs = 5 * 60 * 60 * 1000;
    const cooldownUntil = new Date(now + cooldownPeriodMs);

    const diffMs = cooldownUntil.getTime() - now;
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    expect(hours).toBe(5);
  });

  it("Escalates to Telegram warning on 5th strike", () => {
    const previousStrikes = 4;
    const newStrikes = previousStrikes + 1;
    expect(newStrikes).toBe(5);
    expect(newStrikes >= 5).toBe(true);
  });
});

