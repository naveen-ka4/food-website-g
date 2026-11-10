"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Menu, Mail, MessageSquare, Send, Sparkles, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useSidebar } from "@/components/Sidebar";
import { UserDropdown } from "@/components/UserDropdown";

function GarlicIcon({ className = "size-7" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M24 8C20 12 10 20 10 29C10 36.5 16 42 24 42C32 42 38 36.5 38 29C38 20 28 12 24 8Z"
        fill="#F6F1E8"
        stroke="#42382F"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path
        d="M17 26C17 33 20 39 24 41.5"
        stroke="#D5C7B3"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M31 26C31 33 28 39 24 41.5"
        stroke="#D5C7B3"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M24 14V42"
        stroke="#42382F"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M24 6C23.5 4.5 24 3 25 2C25.5 3.5 25 5 24 6Z"
        fill="#C8B89F"
        stroke="#42382F"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function ContactPage() {
  const { openSidebar } = useSidebar();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      toast.error("Please fill in all fields.");
      return;
    }
    setSubmitted(true);
    toast.success("Thank you! Your message has been sent to the Hey Garlic team.");
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between selection:bg-yellow-300 selection:text-black dark:selection:bg-yellow-400 dark:selection:text-black">
      {/* Top Header */}
      <header className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 flex items-center justify-between">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <button
            type="button"
            aria-label="Open side menu"
            onClick={openSidebar}
            className="flex md:hidden size-10 rounded-2xl border border-border/80 bg-card items-center justify-center text-foreground hover:bg-muted shadow-2xs hover:shadow-xs active:scale-95 transition-all cursor-pointer shrink-0"
          >
            <Menu className="size-5" />
          </button>

          <Link
            href="/"
            className="flex items-center gap-2 group transition-opacity hover:opacity-90"
          >
            <span className="font-heading text-2xl sm:text-[1.75rem] font-medium tracking-tight text-foreground">
              Hey Garlic
            </span>
            <GarlicIcon className="size-7 sm:size-8 -mt-0.5 transition-transform duration-300 group-hover:rotate-6" />
          </Link>
        </div>

        <UserDropdown />
      </header>

      {/* Main Content */}
      <main className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 flex-1 flex flex-col pt-10 sm:pt-14 pb-20">
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground transition-colors group cursor-pointer"
          >
            <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1" />
            <span>Back to home</span>
          </Link>
        </div>

        <div className="space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
            <Sparkles className="size-3.5" />
            <span>Get in Touch</span>
          </div>

          <h1 className="font-heading text-4xl sm:text-5xl font-normal tracking-tight text-foreground leading-[1.12]">
            We&apos;d love to hear from you.
          </h1>

          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed pt-1 max-w-2xl">
            Have questions about a recipe, feedback for the platform, or want to collaborate? Drop us a note and we&apos;ll get back to you as soon as possible.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 md:grid-cols-12 gap-8">
          {/* Contact Details Column */}
          <div className="md:col-span-5 flex flex-col gap-5">
            <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-2xs flex items-start gap-4">
              <div className="size-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Mail className="size-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Email Us</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  General inquiries & support
                </p>
                <a
                  href="mailto:hello@heygarlic.com"
                  className="mt-2 text-xs font-medium text-primary hover:underline block"
                >
                  hello@heygarlic.com
                </a>
              </div>
            </div>

            <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-2xs flex items-start gap-4">
              <div className="size-11 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <MessageSquare className="size-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Community Feedback</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Recipe requests & feature ideas
                </p>
                <span className="mt-2 text-xs text-foreground/80 block">
                  @heygarlic on socials
                </span>
              </div>
            </div>
          </div>

          {/* Contact Form Column */}
          <div className="md:col-span-7">
            <div className="rounded-3xl border border-border/80 bg-card p-6 sm:p-8 shadow-2xs">
              {submitted ? (
                <div className="py-10 text-center flex flex-col items-center justify-center gap-3">
                  <div className="size-12 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <CheckCircle2 className="size-6" />
                  </div>
                  <h3 className="font-heading text-xl font-normal text-foreground">
                    Message Sent!
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground max-w-sm">
                    Thank you for reaching out. We will review your message and reply back shortly.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSubmitted(false);
                      setName("");
                      setEmail("");
                      setMessage("");
                    }}
                    className="mt-3 text-xs font-medium text-primary hover:underline cursor-pointer"
                  >
                    Send another note &rarr;
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                      Your Name
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Maya Fernando"
                      className="w-full rounded-2xl border border-border/90 bg-background px-4 py-2.5 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground/70 outline-none focus:ring-2 focus:ring-ring focus:border-ring transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="maya@example.com"
                      className="w-full rounded-2xl border border-border/90 bg-background px-4 py-2.5 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground/70 outline-none focus:ring-2 focus:ring-ring focus:border-ring transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                      Message
                    </label>
                    <textarea
                      required
                      rows={4}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Share your culinary ideas, questions, or recipe feedback..."
                      className="w-full rounded-2xl border border-border/90 bg-background p-4 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground/70 outline-none focus:ring-2 focus:ring-ring focus:border-ring transition-all resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 rounded-full bg-foreground text-background text-xs sm:text-sm font-medium hover:opacity-90 active:scale-95 transition-all shadow-2xs flex items-center justify-center gap-2 cursor-pointer mt-2"
                  >
                    <Send className="size-3.5" />
                    <span>Send Message</span>
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
