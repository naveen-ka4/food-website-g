"use client";

import React, { useEffect, useState, useTransition } from "react";
import {
  Users,
  Search,
  ShieldCheck,
  Shield,
  User,
  UserX,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import {
  getAdminUsersAction,
  updateUserRoleAction,
  toggleUserBanAction,
} from "@/app/actions/admin";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [bannedOnly, setBannedOnly] = useState(false);

  const [isPending, startTransition] = useTransition();

  const fetchUsers = async (currentPage = page) => {
    setLoading(true);
    const res = await getAdminUsersAction({
      page: currentPage,
      limit: 20,
      search: searchTerm,
      role: roleFilter,
      bannedOnly,
    });

    if (res.success) {
      setUsers(res.users || []);
      setTotal(res.total || 0);
      setPage(res.page);
      setTotalPages(res.totalPages || 1);
    } else {
      toast.error(res.error || "Failed to load users.");
    }
    setLoading(false);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, roleFilter, bannedOnly]);

  const handleRoleChange = (userId: string, newRole: "user" | "moderator" | "admin") => {
    if (!window.confirm(`Are you sure you want to change this user's role to "${newRole}"?`)) {
      return;
    }

    startTransition(async () => {
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );

      const res = await updateUserRoleAction(userId, newRole);
      if (res.success) {
        toast.success(`User role updated to ${newRole}.`);
        fetchUsers(page);
      } else {
        toast.error(res.error || "Failed to update user role.");
        fetchUsers(page);
      }
    });
  };

  const handleToggleBan = (userId: string, currentBanStatus: boolean, username: string) => {
    const nextStatus = !currentBanStatus;
    if (
      !window.confirm(
        `Are you sure you want to ${nextStatus ? "BAN" : "UNBAN"} @${username}?`
      )
    ) {
      return;
    }

    startTransition(async () => {
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, is_banned: nextStatus } : u))
      );

      const res = await toggleUserBanAction(userId, nextStatus);
      if (res.success) {
        toast.success(`@${username} has been ${nextStatus ? "suspended" : "unbanned"}.`);
        fetchUsers(page);
      } else {
        toast.error(res.error || "Failed to update ban status.");
        fetchUsers(page);
      }
    });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold font-heading text-foreground">
            User Moderation & Roles
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage permissions, grant staff badges, and ban abusive or spam accounts.
          </p>
        </div>

        <button
          type="button"
          onClick={() => fetchUsers(page)}
          disabled={loading}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border border-border hover:bg-muted/70 transition-all text-foreground"
        >
          <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-card p-4 rounded-2xl border border-border flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="size-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by username or name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl text-sm bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">Role:</span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-muted/50 border border-border text-foreground focus:outline-none"
            >
              <option value="all">All Roles</option>
              <option value="admin">Administrators</option>
              <option value="moderator">Moderators</option>
              <option value="user">Regular Users</option>
            </select>
          </div>

          <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground cursor-pointer select-none">
            <input
              type="checkbox"
              checked={bannedOnly}
              onChange={(e) => setBannedOnly(e.target.checked)}
              className="rounded border-border text-primary focus:ring-primary size-4"
            />
            Suspended Only
          </label>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
                <th className="py-3.5 px-4">User</th>
                <th className="py-3.5 px-4">Username</th>
                <th className="py-3.5 px-4">Role</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Joined Date</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">
                    Loading users...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">
                    No users found.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                    {/* User */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        {u.avatar_url ? (
                          <img
                            src={u.avatar_url}
                            alt=""
                            className="size-9 rounded-full object-cover border border-border shrink-0"
                          />
                        ) : (
                          <div className="size-9 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
                            {u.username?.[0]?.toUpperCase() || <User className="size-4" />}
                          </div>
                        )}
                        <div className="min-w-0">
                          <span className="font-semibold text-foreground text-xs block">
                            {u.full_name || "No name provided"}
                          </span>
                          <span className="text-[11px] text-muted-foreground font-mono block">
                            {u.id.slice(0, 8)}...
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Username */}
                    <td className="py-3 px-4 text-xs font-medium text-foreground whitespace-nowrap">
                      @{u.username || "—"}
                    </td>

                    {/* Role Badge */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {u.role === "admin" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/20">
                          <ShieldCheck className="size-3" />
                          Admin
                        </span>
                      ) : u.role === "moderator" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                          <Shield className="size-3" />
                          Moderator
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium text-muted-foreground bg-muted">
                          User
                        </span>
                      )}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {u.is_banned ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                          <UserX className="size-3" />
                          Suspended
                        </span>
                      ) : (
                        <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                          Active
                        </span>
                      )}
                    </td>

                    {/* Joined Date */}
                    <td className="py-3 px-4 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        {/* Role Select */}
                        <select
                          value={u.role || "user"}
                          onChange={(e) =>
                            handleRoleChange(u.id, e.target.value as any)
                          }
                          disabled={isPending}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-muted/60 border border-border text-foreground focus:outline-none cursor-pointer"
                        >
                          <option value="user">User</option>
                          <option value="moderator">Moderator</option>
                          <option value="admin">Admin</option>
                        </select>

                        {/* Ban / Unban Toggle Button */}
                        <button
                          type="button"
                          onClick={() =>
                            handleToggleBan(u.id, u.is_banned, u.username || "user")
                          }
                          disabled={isPending}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            u.is_banned
                              ? "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                              : "bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                          }`}
                        >
                          {u.is_banned ? "Unban" : "Ban"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Showing {users.length} of {total} users
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => {
                const prev = page - 1;
                setPage(prev);
                fetchUsers(prev);
              }}
              className="p-1.5 rounded-lg border border-border hover:bg-muted disabled:opacity-40 disabled:pointer-events-none transition-colors"
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="font-semibold text-foreground">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages || loading}
              onClick={() => {
                const next = page + 1;
                setPage(next);
                fetchUsers(next);
              }}
              className="p-1.5 rounded-lg border border-border hover:bg-muted disabled:opacity-40 disabled:pointer-events-none transition-colors"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
