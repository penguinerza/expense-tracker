import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { toast } from "sonner";
import { cn } from "../lib/utils";
import { api, Category, Snapshot } from "../api/client";
import { useAuth } from "../hooks/useAuth";

function fmtBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

function SectionHeader({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <div className="px-5 pt-8 pb-3">
      <h2 className="font-sans text-2xs text-ink-muted uppercase tracking-widest">{children}</h2>
      {sub && <p className="font-sans text-xs text-ink-faint mt-1">{sub}</p>}
    </div>
  );
}

export default function Settings() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [newCatName, setNewCatName] = useState("");
  const [newSubName, setNewSubName] = useState<Record<number, string>>({});
  const [expandedCat, setExpandedCat] = useState<number | null>(null);
  const [restoreKey, setRestoreKey] = useState<string | null>(null);
  const [restoreResult, setRestoreResult] = useState<string | null>(null);

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: () => api.get("/categories"),
  });

  const { data: backupStatus } = useQuery<{ enabled: boolean }>({
    queryKey: ["snapshots", "status"],
    queryFn: () => api.get("/snapshots/status"),
  });
  const backupEnabled = backupStatus?.enabled ?? true;

  const { data: snapshots = [], isLoading: snapshotsLoading } = useQuery<Snapshot[]>({
    queryKey: ["snapshots"],
    queryFn: () => api.get("/snapshots"),
    enabled: backupEnabled,
  });

  const addCategory = useMutation({
    mutationFn: (name: string) => api.post("/categories", { name }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      setNewCatName("");
    },
    onError: (err: Error) => toast.error(`Failed to add category: ${err.message}`),
  });

  const addSubcategory = useMutation({
    mutationFn: ({ categoryId, name }: { categoryId: number; name: string }) =>
      api.post(`/categories/${categoryId}/subcategories`, { name }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      setNewSubName({});
    },
    onError: (err: Error) => toast.error(`Failed to add subcategory: ${err.message}`),
  });

  const deleteCategory = useMutation({
    mutationFn: (id: number) => api.delete(`/categories/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
    onError: (err: Error) => toast.error(`Failed to delete category: ${err.message}`),
  });

  const deleteSubcategory = useMutation({
    mutationFn: (id: number) => api.delete(`/subcategories/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
    onError: (err: Error) => toast.error(`Failed to delete subcategory: ${err.message}`),
  });

  const restoreMutation = useMutation<
    { restored: { expenses: number; snapshotDate: string } },
    Error,
    string
  >({
    mutationFn: (key: string) =>
      api.post<{ restored: { expenses: number; snapshotDate: string } }>("/snapshots/restore", { key }),
    onSuccess: (data) => {
      qc.invalidateQueries();
      setRestoreKey(null);
      setRestoreResult(
        `Restored ${data.restored.expenses} expenses from ${new Date(data.restored.snapshotDate).toLocaleDateString()}`
      );
    },
    onError: (err: Error) => toast.error(`Restore failed: ${err.message}`),
  });

  const logout = async () => {
    await api.post("/auth/logout", {});
    window.location.href = "/login";
  };

  return (
    <div className="min-h-dvh bg-surface-0 safe-top pb-12">
      <div className="max-w-lg mx-auto">
        <div className="px-5 pt-6 pb-4">
          <h1 className="font-display text-2xl text-ink text-balance">Settings</h1>
        </div>

        {/* Account */}
        <SectionHeader>Account</SectionHeader>
        {user && (
          <div className="mx-5 border border-surface-3 rounded-xl bg-surface-1 p-4 flex items-center gap-4">
            {user.picture ? (
              <img src={user.picture} alt="" className="size-10 rounded-full" aria-hidden="true" />
            ) : (
              <div className="size-10 rounded-full bg-surface-2 border border-surface-3 flex items-center justify-center font-sans font-medium text-ink-muted" aria-hidden="true">
                {user.name[0]}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-sans text-sm font-medium text-ink truncate">{user.name}</p>
              <p className="font-sans text-xs text-ink-muted truncate">{user.email}</p>
            </div>
            <button
              onClick={logout}
              className="font-sans text-xs text-red-400 hover:text-red-300 transition-colors font-medium"
            >
              Sign out
            </button>
          </div>
        )}

        {/* Categories */}
        <SectionHeader>Categories</SectionHeader>
        <div className="mx-5 border border-surface-3 rounded-xl bg-surface-1 overflow-hidden">
          {categories.map((cat) => (
            <div key={cat.id} className="border-b border-surface-3 last:border-0">
              <div
                className="flex items-center px-4 py-4 cursor-pointer hover:bg-surface-2/50 transition-colors"
                onClick={() => setExpandedCat(expandedCat === cat.id ? null : cat.id)}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  className={cn("size-3.5 text-ink-muted mr-3 shrink-0 transition-transform", expandedCat === cat.id && "rotate-90")}
                  aria-hidden="true"
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
                <span className="flex-1 font-sans text-sm text-ink">{cat.name}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteCategory.mutate(cat.id); }}
                  aria-label={`Delete category ${cat.name}`}
                  className="text-red-500/60 hover:text-red-400 transition-colors p-1 -mr-1"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="size-4" aria-hidden="true">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                  </svg>
                </button>
              </div>

              {expandedCat === cat.id && (
                <div className="bg-surface-0/50 px-4 pb-4 pt-1 border-t border-surface-3/50">
                  {cat.subcategories.map((sub) => (
                    <div key={sub.id} className="flex items-center py-2.5 border-b border-surface-3/50 last:border-0">
                      <span className="flex-1 font-sans text-sm text-ink-muted pl-5">{sub.name}</span>
                      <button
                        onClick={() => deleteSubcategory.mutate(sub.id)}
                        aria-label={`Remove ${sub.name}`}
                        className="text-red-500/60 hover:text-red-400 transition-colors p-1 -mr-1"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="size-3.5" aria-hidden="true">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </div>
                  ))}
                  <form
                    className="flex gap-2 mt-3 pl-5"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const name = newSubName[cat.id]?.trim();
                      if (name) addSubcategory.mutate({ categoryId: cat.id, name });
                    }}
                  >
                    <input
                      type="text"
                      placeholder="Add subcategory"
                      value={newSubName[cat.id] ?? ""}
                      onChange={(e) => setNewSubName((s) => ({ ...s, [cat.id]: e.target.value }))}
                      className="flex-1 bg-transparent border-b border-surface-3 focus:border-accent outline-none font-sans text-sm text-ink placeholder:text-ink-faint py-1 transition-colors"
                    />
                    <button
                      type="submit"
                      disabled={!newSubName[cat.id]?.trim()}
                      className="font-sans text-xs text-accent disabled:opacity-30 font-medium"
                    >
                      Add
                    </button>
                  </form>
                </div>
              )}
            </div>
          ))}

          {/* Add category */}
          <form
            className="flex gap-3 px-4 py-4 border-t border-surface-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (newCatName.trim()) addCategory.mutate(newCatName.trim());
            }}
          >
            <input
              type="text"
              placeholder="New category"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              className="flex-1 bg-transparent border-b border-surface-3 focus:border-accent outline-none font-sans text-sm text-ink placeholder:text-ink-faint py-1.5 transition-colors"
            />
            <button
              type="submit"
              disabled={!newCatName.trim() || addCategory.isPending}
              className="font-sans text-sm text-accent disabled:opacity-30 font-medium"
            >
              Add
            </button>
          </form>
        </div>

        {/* Snapshots */}
        {backupEnabled && (
        <>
        <SectionHeader sub="Daily backups · 7-day retention">Snapshots</SectionHeader>

        {restoreResult && (
          <div className="mx-5 mb-4 px-4 py-3 border border-success/20 rounded-xl font-sans text-sm text-success/80 text-pretty" role="status"
            style={{ background: "rgba(34,197,94,0.05)" }}>
            {restoreResult}
            <button onClick={() => setRestoreResult(null)} aria-label="Dismiss" className="ml-2 text-success/50 hover:text-success/80">×</button>
          </div>
        )}

        {restoreMutation.error && (
          <div className="mx-5 mb-4 px-4 py-3 border border-red-800/40 rounded-xl font-sans text-sm text-red-400 text-pretty" role="alert"
            style={{ background: "rgba(127,29,29,0.1)" }}>
            {String(restoreMutation.error)}
          </div>
        )}

        <div className="mx-5 border border-surface-3 rounded-xl bg-surface-1 overflow-hidden">
          {snapshotsLoading && (
            <div className="flex justify-center py-10">
              <div className="size-4 border border-ink-muted border-t-transparent rounded-full animate-spin" aria-label="Loading snapshots" />
            </div>
          )}

          {snapshots.length === 0 && !snapshotsLoading && (
            <div className="px-4 py-8">
              <p className="font-sans text-sm text-ink-muted">No snapshots yet.</p>
              <p className="font-sans text-xs text-ink-faint mt-1">First snapshot runs tonight at 02:00.</p>
            </div>
          )}

          {snapshots.map((snap, i) => (
            <div key={snap.key} className={cn("flex items-center px-4 py-4", i > 0 && "border-t border-surface-3")}>
              <div className="flex-1">
                <p className="font-mono text-sm text-ink tabular-nums">{snap.date}</p>
                <p className="font-mono text-xs text-ink-muted tabular-nums mt-0.5">{fmtBytes(snap.size)}</p>
              </div>
              <button
                onClick={() => setRestoreKey(snap.key)}
                className="font-sans text-xs text-amber hover:text-amber/80 font-medium transition-colors"
              >
                Restore
              </button>
            </div>
          ))}
        </div>
        </>
        )}
      </div>

      {/* Restore confirmation */}
      <AlertDialog.Root open={!!restoreKey} onOpenChange={(open) => !open && setRestoreKey(null)}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 bg-black/70 z-40" />
          <AlertDialog.Content className="fixed bottom-0 left-0 right-0 z-50 bg-surface-1 border-t border-surface-3 rounded-t-2xl px-6 pt-6 pb-10 safe-bottom focus:outline-none">
            <AlertDialog.Title className="font-display text-xl text-ink text-balance mb-2">
              Restore snapshot?
            </AlertDialog.Title>
            <AlertDialog.Description className="font-sans text-sm text-ink-muted text-pretty mb-8">
              All current data will be overwritten with{" "}
              <span className="font-mono text-amber tabular-nums">
                {restoreKey?.replace("snapshot-", "").replace(".json", "")}
              </span>
              . This cannot be undone.
            </AlertDialog.Description>
            <div className="flex gap-3">
              <AlertDialog.Cancel asChild>
                <button className="flex-1 py-3.5 border border-surface-3 hover:bg-surface-2 rounded-xl font-sans text-sm font-medium text-ink transition-colors">
                  Cancel
                </button>
              </AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <button
                  onClick={() => restoreKey && restoreMutation.mutate(restoreKey)}
                  disabled={restoreMutation.isPending}
                  className="flex-1 py-3.5 bg-amber/90 hover:bg-amber disabled:opacity-50 rounded-xl font-sans text-sm font-medium text-surface-0 transition-colors"
                >
                  {restoreMutation.isPending ? "Restoring…" : "Restore"}
                </button>
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </div>
  );
}
