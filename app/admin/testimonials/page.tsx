"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Star,
  ArrowUpDown,
  ArrowDownWideNarrow,
  Loader2,
  Image as ImageIcon,
} from "lucide-react";
import { useToast } from "@/components/ui/toast-provider";
import { testimonialsService } from "@/services/firestore";
import { getDisplayError, logError, ERROR_CODES } from "@/lib/errors";
import { PremiumButton, PremiumTable, PremiumModal, PremiumInput } from "@/components/premium";
import { StatusBadge } from "@/components/premium";
import { Switch } from "@/components/ui/switch";
import { TYPOGRAPHY } from "@/lib/design-tokens";
import type { TestimonialDocument } from "@/types/firestore";

interface TestimonialFormState {
  name: string;
  designation: string;
  testimonial: string;
  rating: string;
  displayOrder: string;
  imageUrl: string;
  tag: string;
  isActive: boolean;
}

const EMPTY_FORM: TestimonialFormState = {
  name: "",
  designation: "",
  testimonial: "",
  rating: "5",
  displayOrder: "",
  imageUrl: "",
  tag: "",
  isActive: true,
};

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function validateForm(form: TestimonialFormState): string {
  if (!form.name.trim()) return "Name is required";
  if (!form.testimonial.trim()) return "Testimonial is required";

  const rating = Number(form.rating);
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    return "Rating must be between 1 and 5";
  }

  if (form.displayOrder.trim() !== "") {
    const order = Number(form.displayOrder);
    if (!Number.isInteger(order) || order < 1) {
      return "Display Order must be a positive whole number";
    }
  }

  return "";
}

function sortTestimonials(items: TestimonialDocument[], asc: boolean): TestimonialDocument[] {
  return [...items].sort((a, b) => {
    const aHas = typeof a.displayOrder === "number";
    const bHas = typeof b.displayOrder === "number";
    if (!aHas && !bHas) return b.updatedAt.getTime() - a.updatedAt.getTime();
    if (aHas && !bHas) return -1;
    if (!aHas && bHas) return 1;
    const diff = (a.displayOrder as number) - (b.displayOrder as number);
    return asc ? diff : -diff;
  });
}

export default function AdminTestimonialsPage() {
  const { success, errorFromAppError } = useToast();
  const [loading, setLoading] = useState(true);
  const [testimonials, setTestimonials] = useState<TestimonialDocument[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortAsc, setSortAsc] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<TestimonialDocument | null>(null);
  const [form, setForm] = useState<TestimonialFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  function updateField(patch: Partial<TestimonialFormState>) {
    setForm((prev) => ({ ...prev, ...patch }));
    if (formError) setFormError("");
  }

  const [deleteTarget, setDeleteTarget] = useState<TestimonialDocument | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadTestimonials();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadTestimonials() {
    try {
      setLoading(true);
      const all = await testimonialsService.getAll();
      setTestimonials(all);
    } catch (err) {
      console.error("Error loading testimonials:", err);
      const appError = getDisplayError(err, ERROR_CODES.ADMIN.OPERATION_FAILED);
      logError(appError.code, err, "AdminTestimonialsPage.loadTestimonials");
      errorFromAppError(appError);
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const base = q
      ? testimonials.filter(
          (t) =>
            t.name.toLowerCase().includes(q) ||
            t.designation.toLowerCase().includes(q)
        )
      : testimonials;
    return sortTestimonials(base, sortAsc);
  }, [testimonials, searchQuery, sortAsc]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setModalOpen(true);
  }

  function openEdit(testimonial: TestimonialDocument) {
    setEditing(testimonial);
    setForm({
      name: testimonial.name,
      designation: testimonial.designation,
      testimonial: testimonial.testimonial,
      rating: String(testimonial.rating),
      displayOrder: testimonial.displayOrder != null ? String(testimonial.displayOrder) : "",
      imageUrl: testimonial.imageUrl ?? "",
      tag: testimonial.tag ?? "",
      isActive: testimonial.isActive,
    });
    setFormError("");
    setModalOpen(true);
  }

  async function handleSubmit() {
    const validationError = validateForm(form);
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setSaving(true);
    try {
      const rating = Number(form.rating);
      const displayOrder =
        form.displayOrder.trim() !== "" ? Number(form.displayOrder) : undefined;
      const imageUrl = form.imageUrl.trim() || undefined;
      const tag = form.tag.trim() || undefined;

      if (editing) {
        await testimonialsService.update(editing.id, {
          name: form.name.trim(),
          designation: form.designation.trim(),
          testimonial: form.testimonial.trim(),
          rating,
          isActive: form.isActive,
          displayOrder,
          imageUrl,
          tag,
        });
        success("Testimonial updated successfully");
      } else {
        await testimonialsService.create({
          id: crypto.randomUUID(),
          name: form.name.trim(),
          designation: form.designation.trim(),
          testimonial: form.testimonial.trim(),
          rating,
          isActive: form.isActive,
          displayOrder,
          imageUrl,
          tag,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        success("Testimonial created successfully");
      }
      setModalOpen(false);
      await loadTestimonials();
    } catch (err) {
      const appError = getDisplayError(err, ERROR_CODES.ADMIN.OPERATION_FAILED);
      logError(appError.code, err, "AdminTestimonialsPage");
      errorFromAppError(appError);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await testimonialsService.delete(deleteTarget.id);
      success("Testimonial deleted successfully");
      setDeleteTarget(null);
      await loadTestimonials();
    } catch (err) {
      const appError = getDisplayError(err, ERROR_CODES.ADMIN.OPERATION_FAILED);
      logError(appError.code, err, "AdminTestimonialsPage");
      errorFromAppError(appError);
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading testimonials...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className={TYPOGRAPHY.heading}>Testimonials</h1>
          <p className="text-sm text-muted-foreground">
            Manage patient stories shown on the homepage
          </p>
        </div>
        <PremiumButton onClick={openCreate} className="self-start sm:self-auto">
          <Plus className="h-4 w-4 mr-2" />
          Add Testimonial
        </PremiumButton>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            placeholder="Search name or designation..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-2xl border border-border bg-transparent text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-[3px] focus:ring-ring/20 transition-all"
          />
        </div>
        <PremiumButton
          variant="outline"
          onClick={() => setSortAsc((prev) => !prev)}
          className="self-start sm:self-auto"
        >
          {sortAsc ? (
            <ArrowUpDown className="h-4 w-4 mr-2" />
          ) : (
            <ArrowDownWideNarrow className="h-4 w-4 mr-2" />
          )}
          Order {sortAsc ? "↑" : "↓"}
        </PremiumButton>
      </div>

      <PremiumTable<TestimonialDocument>
        data={filtered}
        emptyMessage={
          searchQuery
            ? "No testimonials match your search"
            : "No testimonials yet. Add your first patient story."
        }
        columns={[
          {
            key: "photo",
            header: "Photo",
            width: "72px",
            render: (t) =>
              t.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={t.imageUrl}
                  alt={t.name}
                  className="h-10 w-10 rounded-full object-cover"
                />
              ) : (
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                  {getInitials(t.name)}
                </div>
              ),
          },
          {
            key: "name",
            header: "Name",
            render: (t) => (
              <div className="min-w-0">
                <p className="font-medium text-primary truncate">{t.name}</p>
                <p className="text-xs text-muted-foreground truncate">{t.designation}</p>
              </div>
            ),
          },
          {
            key: "designation",
            header: "Designation",
            render: (t) => <span className="text-sm text-foreground">{t.designation || "—"}</span>,
          },
          {
            key: "rating",
            header: "Rating",
            width: "120px",
            render: (t) => (
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={
                      i < t.rating
                        ? "h-3.5 w-3.5 fill-primary text-primary"
                        : "h-3.5 w-3.5 text-muted-foreground/40"
                    }
                  />
                ))}
              </div>
            ),
          },
          {
            key: "isActive",
            header: "Status",
            width: "110px",
            render: (t) =>
              t.isActive ? (
                <StatusBadge variant="active">Active</StatusBadge>
              ) : (
                <StatusBadge variant="inactive">Inactive</StatusBadge>
              ),
          },
          {
            key: "displayOrder",
            header: "Order",
            width: "80px",
            render: (t) => (
              <span className="text-sm text-foreground">
                {typeof t.displayOrder === "number" ? t.displayOrder : "—"}
              </span>
            ),
          },
          {
            key: "updatedAt",
            header: "Updated",
            width: "140px",
            render: (t) => (
              <span className="text-sm text-muted-foreground">
                {t.updatedAt.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            ),
          },
          {
            key: "actions",
            header: "Actions",
            width: "100px",
            render: (t) => (
              <div className="flex items-center gap-0.5">
                <PremiumButton
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => openEdit(t)}
                  aria-label={`Edit ${t.name}`}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </PremiumButton>
                <PremiumButton
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => setDeleteTarget(t)}
                  aria-label={`Delete ${t.name}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </PremiumButton>
              </div>
            ),
          },
        ]}
      />

      {/* Add / Edit Modal */}
      <PremiumModal
        open={modalOpen}
        onClose={() => !saving && setModalOpen(false)}
        title={editing ? "Edit Testimonial" : "Add Testimonial"}
        subtitle={
          editing
            ? "Update this patient story"
            : "Create a new patient story for the homepage"
        }
        actions={
          <>
            <PremiumButton
              variant="outline"
              onClick={() => setModalOpen(false)}
              disabled={saving}
            >
              Cancel
            </PremiumButton>
            <PremiumButton onClick={handleSubmit} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              {saving ? "Saving..." : editing ? "Save Changes" : "Create Testimonial"}
            </PremiumButton>
          </>
        }
      >
        <div className="space-y-5">
          <PremiumInput
            label="Name *"
            value={form.name}
            onChange={(e) => updateField({ name: e.target.value })}
            placeholder="e.g. Priya Sharma"
            error={formError && !form.name.trim() ? formError : undefined}
          />

          <PremiumInput
            label="Designation"
            value={form.designation}
            onChange={(e) => updateField({ designation: e.target.value })}
            placeholder="e.g. Product designer"
          />

          <div className="w-full">
            <label className={TYPOGRAPHY.label + " mb-1.5 block"}>
              Testimonial *
            </label>
            <textarea
              placeholder="What did this patient say about their experience?"
              value={form.testimonial}
              onChange={(e) => updateField({ testimonial: e.target.value })}
              className="w-full px-4 py-3 border border-border rounded-xl bg-transparent focus:border-ring focus:outline-none focus:ring-[3px] focus:ring-ring/20 text-foreground placeholder:text-muted-foreground transition-all duration-200 min-h-[110px]"
            />
            {formError && !form.testimonial.trim() && (
              <p className="mt-1 text-destructive normal-case tracking-normal text-xs">
                {formError}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <PremiumInput
              label="Rating (1–5) *"
              type="number"
              min={1}
              max={5}
              value={form.rating}
              onChange={(e) => updateField({ rating: e.target.value })}
              error={
                formError && formError.includes("Rating") ? formError : undefined
              }
            />
            <PremiumInput
              label="Display Order"
              type="number"
              min={1}
              value={form.displayOrder}
              onChange={(e) => updateField({ displayOrder: e.target.value })}
              placeholder="e.g. 1 = shown first"
              helperText="Lower number = higher priority. Leave empty to sort last."
              error={
                formError && formError.includes("Display Order") ? formError : undefined
              }
            />
          </div>

          <PremiumInput
            label="Profile Image URL"
            value={form.imageUrl}
            onChange={(e) => updateField({ imageUrl: e.target.value })}
            placeholder="https://… (optional)"
            helperText="Paste an image URL. If left empty, initials are shown."
          />

          <PremiumInput
            label="Tag"
            value={form.tag}
            onChange={(e) => updateField({ tag: e.target.value })}
            placeholder="e.g. Prescription Renewal (optional)"
            helperText="Short label shown as a pill on the homepage card."
          />

          <div className="flex items-center justify-between rounded-2xl border border-border px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <ImageIcon className="h-3.5 w-3.5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-primary">Active</p>
                <p className="text-xs text-muted-foreground">
                  Show this testimonial on the homepage
                </p>
              </div>
            </div>
            <Switch
              checked={form.isActive}
              onCheckedChange={(checked) => updateField({ isActive: checked })}
              aria-label="Active"
            />
          </div>
        </div>
      </PremiumModal>

      {/* Delete Confirmation Modal */}
      <PremiumModal
        open={deleteTarget !== null}
        onClose={() => !deleting && setDeleteTarget(null)}
        title="Delete Testimonial"
        subtitle="This action cannot be undone."
        actions={
          <>
            <PremiumButton
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
            >
              Cancel
            </PremiumButton>
            <PremiumButton
              variant="outline"
              onClick={handleDelete}
              disabled={deleting}
              className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              {deleting ? "Deleting..." : "Delete"}
            </PremiumButton>
          </>
        }
      >
        <p className="text-sm text-foreground">
          Are you sure you want to delete the testimonial from{" "}
          <span className="font-semibold">{deleteTarget?.name}</span>? It will be
          permanently removed from the homepage.
        </p>
      </PremiumModal>
    </div>
  );
}
