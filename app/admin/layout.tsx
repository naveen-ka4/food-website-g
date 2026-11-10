import { redirect } from "next/navigation";

export const metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

/**
 * Traditional web admin dashboard has been decommissioned.
 * All recipe moderation is autonomously handled by AI + Telegram Bot + Secret Review URLs.
 */
export default function AdminLayout() {
  redirect("/");
}
