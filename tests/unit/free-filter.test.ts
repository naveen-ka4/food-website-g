import { describe, it, expect } from "vitest";
import { runFreeContentFilter } from "@/lib/moderation/free-filter";

describe("Free Bad Content & Anti-Spam Filter (Tier 1 Guard)", () => {
  it("passes authentic culinary recipe with zero issues", () => {
    const res = runFreeContentFilter({
      title: "Sri Lankan Dhal Curry",
      description: "Comforting red lentil curry with coconut milk and tempering.",
      category: "Curries",
      ingredients: [
        { name: "red lentils", amount: "1 cup" },
        { name: "coconut milk", amount: "1/2 cup" },
      ],
      instructions: ["Wash lentils.", "Cook with spices and coconut milk."],
      hero_image: "https://example.com/dhal.jpg",
    });

    expect(res.passed).toBe(true);
    expect(res.isSevereViolation).toBe(false);
    expect(res.issues.length).toBe(0);
  });

  it("detects and flags adult / porn keywords", () => {
    const res = runFreeContentFilter({
      title: "Delicious Cake with free porn link",
      description: "Watch adult content here",
    });

    expect(res.passed).toBe(false);
    expect(res.isSevereViolation).toBe(true);
    expect(res.issues).toContain("Adult or sexually explicit content detected");
  });

  it("detects and flags gambling & casino spam", () => {
    const res = runFreeContentFilter({
      title: "Best Pasta Recipe",
      description: "Play slot gacor and casino online bet365 fast cash",
    });

    expect(res.passed).toBe(false);
    expect(res.isSevereViolation).toBe(true);
    expect(res.issues).toContain("Gambling, casino, or financial scam content detected");
  });

  it("detects and flags Telegram & WhatsApp channel links", () => {
    const res = runFreeContentFilter({
      title: "Join our food channel",
      description: "Click here to join t.me/free_crypto_signals or chat.whatsapp.com/12345",
    });

    expect(res.passed).toBe(false);
    expect(res.isSevereViolation).toBe(true);
    expect(res.issues).toContain("Unauthorized external group or link detected (Telegram/WhatsApp/Shortener)");
  });

  it("detects URL shorteners", () => {
    const res = runFreeContentFilter({
      title: "Secret Sauce",
      instructions: ["Download recipe from bit.ly/secretlink"],
    });

    expect(res.passed).toBe(false);
    expect(res.isSevereViolation).toBe(true);
  });

  it("detects repetitive spam keyboard mash", () => {
    const res = runFreeContentFilter({
      title: "Soup Recipe",
      description: "aaaaaaaaaaaaaaaaaaaa check this out",
    });

    expect(res.passed).toBe(false);
    expect(res.isSevereViolation).toBe(true);
    expect(res.issues).toContain("Repetitive spam text or keyboard mash detected");
  });

  it("detects malicious executable image extensions", () => {
    const res = runFreeContentFilter({
      title: "Rice Bowl",
      hero_image: "https://example.com/payload.exe",
    });

    expect(res.passed).toBe(false);
    expect(res.isSevereViolation).toBe(true);
    expect(res.issues).toContain("Malicious file format specified for hero photo");
  });
});

