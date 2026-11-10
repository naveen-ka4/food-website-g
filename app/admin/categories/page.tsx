"use client";

import React, { useEffect, useState, useTransition } from "react";
import {
  Tags,
  FolderPlus,
  Search,
  Star,
  Trash2,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  Folder,
} from "lucide-react";
import { toast } from "sonner";
import {
  getAdminCategoriesAction,
  createCategoryAction,
  deleteCategoryAction,
  getAdminTagsAction,
  toggleTagPromotedAction,
} from "@/app/actions/admin";

export default function AdminCategoriesPage() {
  const [activeTab, setActiveTab] = useState<"categories" | "tags">("categories");
  const [categories, setCategories] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New Category Form State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newIcon, setNewIcon] = useState("");

  // Tags filter
  const [tagSearch, setTagSearch] = useState("");
  const [promotedOnly, setPromotedOnly] = useState(false);

  const [isPending, startTransition] = useTransition();

  const loadCategories = async () => {
    setLoading(true);
    const res = await getAdminCategoriesAction();
    if (res.success && res.categories) {
      setCategories(res.categories);
    }
    setLoading(false);
  };

  const loadTags = async () => {
    setLoading(true);
    const res = await getAdminTagsAction({
      search: tagSearch,
      promotedOnly,
    });
    if (res.success && res.tags) {
      setTags(res.tags);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (activeTab === "categories") {
      loadCategories();
    } else {
      loadTags();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === "tags") {
      const timer = setTimeout(() => {
        loadTags();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [tagSearch, promotedOnly]);

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newSlug.trim()) {
      toast.error("Category name and slug are required.");
      return;
    }

    startTransition(async () => {
      const res = await createCategoryAction({
        name: newName,
        slug: newSlug,
        description: newDesc,
        icon: newIcon,
      });

      if (res.success) {
        toast.success(`Category "${newName}" created!`);
        setShowAddModal(false);
        setNewName("");
        setNewSlug("");
        setNewDesc("");
        setNewIcon("");
        loadCategories();
      } else {
        toast.error(res.error || "Failed to create category.");
      }
    });
  };

  const handleDeleteCategory = (categoryId: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete category "${name}"?`)) return;

    startTransition(async () => {
      const res = await deleteCategoryAction(categoryId);
      if (res.success) {
        toast.success(`Category "${name}" removed.`);
        loadCategories();
      } else {
        toast.error(res.error || "Failed to delete category.");
      }
    });
  };

  const handleTogglePromoted = (tagId: string, currentStatus: boolean) => {
    startTransition(async () => {
      const nextStatus = !currentStatus;
      setTags((prev) =>
        prev.map((t) => (t.id === tagId ? { ...t, is_promoted: nextStatus } : t))
      );

      const res = await toggleTagPromotedAction(tagId, nextStatus);
      if (res.success) {
        toast.success(nextStatus ? "Tag promoted to official!" : "Tag demoted.");
      } else {
        toast.error(res.error || "Failed to update tag status.");
        loadTags();
      }
    });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold font-heading text-foreground">
            Categories & Tags
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Organize culinary taxonomies and promote trending user-generated hashtags into official categories.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === "categories" && (
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 shadow-2xs transition-all"
            >
              <FolderPlus className="size-4" />
              Add Category
            </button>
          )}
          <button
            type="button"
            onClick={activeTab === "categories" ? loadCategories : loadTags}
            disabled={loading}
            className="p-2.5 rounded-xl border border-border hover:bg-muted/70 transition-all text-foreground"
            title="Refresh"
          >
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border">
        <button
          type="button"
          onClick={() => setActiveTab("categories")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === "categories"
              ? "border-primary text-primary font-bold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Folder className="size-4" />
          Official Categories ({categories.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("tags")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === "tags"
              ? "border-primary text-primary font-bold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Tags className="size-4" />
          Trending Tags & Promotion
        </button>
      </div>

      {/* Categories View */}
      {activeTab === "categories" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-full py-12 text-center text-sm text-muted-foreground">
              Loading categories...
            </div>
          ) : categories.length === 0 ? (
            <div className="col-span-full py-12 text-center text-sm text-muted-foreground">
              No categories created yet. Click "Add Category" to get started!
            </div>
          ) : (
            categories.map((cat) => (
              <div
                key={cat.id}
                className="bg-card p-5 rounded-2xl border border-border flex items-start justify-between gap-3 hover:border-foreground/20 transition-all group"
              >
                <div className="flex items-start gap-3.5">
                  <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-lg shrink-0">
                    {cat.icon ? <span>{cat.icon}</span> : <Folder className="size-5" />}
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-foreground leading-tight">
                      {cat.name}
                    </h4>
                    <span className="text-xs text-muted-foreground font-mono block">
                      /{cat.slug}
                    </span>
                    {cat.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {cat.description}
                      </p>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleDeleteCategory(cat.id, cat.name)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-red-500 hover:bg-red-500/10 transition-all"
                  title="Delete category"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tags Promotion View */}
      {activeTab === "tags" && (
        <div className="space-y-4">
          {/* Tags Filters */}
          <div className="bg-card p-4 rounded-2xl border border-border flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-80">
              <Search className="size-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search user tags..."
                value={tagSearch}
                onChange={(e) => setTagSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl text-sm bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground cursor-pointer select-none">
              <input
                type="checkbox"
                checked={promotedOnly}
                onChange={(e) => setPromotedOnly(e.target.checked)}
                className="rounded border-border text-primary focus:ring-primary size-4"
              />
              Show Promoted Only
            </label>
          </div>

          {/* Tags Table */}
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
                  <th className="py-3.5 px-4">Tag Name</th>
                  <th className="py-3.5 px-4">Slug</th>
                  <th className="py-3.5 px-4">Usage Count</th>
                  <th className="py-3.5 px-4">Official Status</th>
                  <th className="py-3.5 px-4 text-right">Promote</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 text-sm">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-muted-foreground">
                      Loading tags...
                    </td>
                  </tr>
                ) : tags.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-muted-foreground">
                      No tags found.
                    </td>
                  </tr>
                ) : (
                  tags.map((tag) => (
                    <tr key={tag.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4 font-semibold text-foreground">
                        #{tag.name}
                      </td>
                      <td className="py-3 px-4 text-xs font-mono text-muted-foreground">
                        {tag.slug}
                      </td>
                      <td className="py-3 px-4 text-xs font-semibold text-muted-foreground">
                        {tag.usage_count} recipes
                      </td>
                      <td className="py-3 px-4">
                        {tag.is_promoted ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                            <Sparkles className="size-3" />
                            Official / Promoted
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium text-muted-foreground bg-muted">
                            Community Tag
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleTogglePromoted(tag.id, tag.is_promoted)}
                          disabled={isPending}
                          className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                            tag.is_promoted
                              ? "bg-muted hover:bg-red-500/10 hover:text-red-500 text-muted-foreground"
                              : "bg-primary text-primary-foreground hover:opacity-90 shadow-2xs"
                          }`}
                        >
                          {tag.is_promoted ? "Demote" : "Promote"}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Category Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-card w-full max-w-md rounded-2xl border border-border p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-lg font-bold font-heading text-foreground">
              Add New Category
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Create an official category for recipes and search faceted navigation.
            </p>

            <form onSubmit={handleCreateCategory} className="mt-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Italian & Pasta"
                  value={newName}
                  onChange={(e) => {
                    setNewName(e.target.value);
                    if (!newSlug) {
                      setNewSlug(
                        e.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9]+/g, "-")
                          .replace(/^-|-$/g, "")
                      );
                    }
                  }}
                  required
                  className="w-full px-3.5 py-2 rounded-xl text-sm bg-muted/50 border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  URL Slug *
                </label>
                <input
                  type="text"
                  placeholder="e.g. italian-pasta"
                  value={newSlug}
                  onChange={(e) => setNewSlug(e.target.value)}
                  required
                  className="w-full px-3.5 py-2 rounded-xl text-sm bg-muted/50 border border-border text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Icon (Emoji or single character)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 🍝"
                  value={newIcon}
                  onChange={(e) => setNewIcon(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl text-sm bg-muted/50 border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Description
                </label>
                <textarea
                  placeholder="Short description of this culinary group..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  rows={2}
                  className="w-full px-3.5 py-2 rounded-xl text-sm bg-muted/50 border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 shadow-2xs transition-all"
                >
                  {isPending ? "Creating..." : "Save Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

