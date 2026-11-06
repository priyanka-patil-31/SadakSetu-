import { useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Filter,
  MapPin,
  MessageSquare,
  Search,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/hooks/use-auth";
import {
  complaintService,
  type ComplaintEvidence,
} from "@/services/complaints-service";
import {
  complaintStatusLabels,
  validComplaintTransitions,
} from "@/lib/complaints-data";
import type {
  BackendComplaintStatus,
  Complaint,
  ComplaintPriority,
} from "@/lib/complaints-data";
import { formatDate } from "@/lib/utils";

const PAGE_SIZE = 10;
const summaryStatuses = ["Submitted", "In progress", "Resolved", "Rejected"] as const;
const priorityClasses: Record<ComplaintPriority, string> = {
  Critical: "border-red-200 bg-red-50 text-red-700",
  High: "border-orange-200 bg-orange-50 text-orange-700",
  Medium: "border-sky-200 bg-sky-50 text-sky-700",
  Low: "border-slate-200 bg-slate-50 text-slate-600",
};

function PriorityBadge({ priority }: { priority: ComplaintPriority }) {
  return (
    <Badge
      variant="outline"
      className={`font-medium ${priorityClasses[priority]}`}
    >
      {priority}
    </Badge>
  );
}

export function ComplaintsPage() {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All statuses");
  const [priorityFilter, setPriorityFilter] = useState("All priorities");
  const [sortBy, setSortBy] = useState("Newest first");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Complaint | null>(null);
  const [pendingStatus, setPendingStatus] = useState<BackendComplaintStatus | null>(
    null,
  );
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [evidence, setEvidence] = useState<ComplaintEvidence[]>([]);
  const [evidenceLoading, setEvidenceLoading] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let active = true;
    complaintService
      .list({ page: 1, pageSize: 100 })
      .then((response) => {
        if (active) setComplaints(response.items);
      })
      .catch((reason: unknown) => {
        if (active)
          setError(
            reason instanceof Error
              ? reason.message
              : "Unable to load complaints.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const filteredComplaints = useMemo(() => {
    const query = search.trim().toLowerCase();
    return [
      ...complaints.filter((complaint) => {
        const haystack =
          `${complaint.id} ${complaint.title} ${complaint.location} ${complaint.category} ${complaint.reporter}`.toLowerCase();
        return (
          haystack.includes(query) &&
          (statusFilter === "All statuses" ||
            complaint.status === statusFilter) &&
          (priorityFilter === "All priorities" ||
            complaint.priority === priorityFilter)
        );
      }),
    ].sort((left, right) =>
      sortBy === "Oldest first"
        ? left.reportedAt.localeCompare(right.reportedAt)
        : right.reportedAt.localeCompare(left.reportedAt),
    );
  }, [complaints, priorityFilter, search, sortBy, statusFilter]);

  const pageCount = Math.max(
    1,
    Math.ceil(filteredComplaints.length / PAGE_SIZE),
  );
  const safePage = Math.min(page, pageCount);
  const visibleComplaints = filteredComplaints.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  const openDetails = (complaint: Complaint) => {
    setSelected(complaint);
    setPendingStatus(complaint.backendStatus);
    setNote("");
    setEvidence([]);
    setDeleteConfirmOpen(false);
    setEvidenceLoading(true);
    complaintService
      .getEvidence(complaint.backendId)
      .then(setEvidence)
      .catch(() => setEvidence([]))
      .finally(() => setEvidenceLoading(false));
  };

  const closeDetails = () => {
    setSelected(null);
    setPendingStatus(null);
    setNote("");
    setDeleteConfirmOpen(false);
  };

  const canDeleteSelected = selected
    ? selected.backendStatus === "SUBMITTED" || selected.backendStatus === "REJECTED"
    : false;

  const deleteSelected = async () => {
    if (!selected || !canDeleteSelected) return;
    setDeleting(true);
    try {
      await complaintService.remove(selected.backendId, "Removed by administrator");
      setComplaints((current) => current.filter((item) => item.backendId !== selected.backendId));
      closeDetails();
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Unable to delete complaint.");
    } finally {
      setDeleting(false);
    }
  };

  const saveStatus = async () => {
    if (!selected || !pendingStatus || pendingStatus === selected.backendStatus)
      return;
    try {
      const updated = await complaintService.update(selected.backendId, {
        status: pendingStatus,
      });
      setComplaints((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      setSelected(updated);
    } catch (reason: unknown) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Unable to update complaint status.",
      );
    }
  };

  const addNote = async () => {
    if (!selected || !note.trim()) return;
    try {
      const updated = await complaintService.update(selected.backendId, {
        note: note.trim(),
      });
      setComplaints((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      setSelected(updated);
      setNote("");
    } catch (reason: unknown) {
      setError(
        reason instanceof Error ? reason.message : "Unable to save the note.",
      );
    }
  };

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("All statuses");
    setPriorityFilter("All priorities");
    setPage(1);
  };

  return (
    <div>
      <PageHeader
        eyebrow="Operations"
        title="Complaint management"
        description="Review, triage, and resolve road issues reported through the backend."
        action={
          <p className="text-xs font-medium text-muted-foreground">
            Showing {visibleComplaints.length} of {filteredComplaints.length}
          </p>
        }
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryStatuses.map((status) => (
          <Card key={status}>
            <CardContent className="p-4">
              <p className="text-xs font-medium text-muted-foreground">
                {status}
              </p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {
                  complaints.filter((complaint) => complaint.status === status)
                    .length
                }
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardContent className="p-0">
          <div className="flex flex-col gap-3 border-b p-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="relative w-full xl:max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="Search complaints"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Search ID, title, location..."
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <select
                aria-label="Status filter"
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value);
                  setPage(1);
                }}
                className="h-10 rounded-lg border border-input bg-background px-3 text-sm outline-none"
              >
                <option>All statuses</option>
                <option>Submitted</option>
                <option>Under review</option>
                <option>AI processing</option>
                <option>Assigned</option>
                <option>In progress</option>
                <option>Resolved</option>
                <option>Rejected</option>
              </select>
              <select
                aria-label="Priority filter"
                value={priorityFilter}
                onChange={(event) => {
                  setPriorityFilter(event.target.value);
                  setPage(1);
                }}
                className="h-10 rounded-lg border border-input bg-background px-3 text-sm outline-none"
              >
                <option>All priorities</option>
                <option>Critical</option>
                <option>High</option>
                <option>Medium</option>
                <option>Low</option>
              </select>
              <select
                aria-label="Sort complaints"
                value={sortBy}
                onChange={(event) => {
                  setSortBy(event.target.value);
                  setPage(1);
                }}
                className="h-10 rounded-lg border border-input bg-background px-3 text-sm outline-none"
              >
                <option>Newest first</option>
                <option>Oldest first</option>
              </select>
              <Button variant="outline" size="icon" aria-label="Filter summary">
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {error && (
            <p
              role="alert"
              className="border-b bg-red-50 px-5 py-3 text-sm font-medium text-red-700"
            >
              {error}
            </p>
          )}
          {loading ? (
            <div className="p-12 text-center text-sm text-muted-foreground">
              Loading complaints...
            </div>
          ) : visibleComplaints.length === 0 ? (
            <div className="p-12 text-center">
              <Search className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-3 text-sm font-semibold text-slate-700">
                No complaints found
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                No backend records are currently available.
              </p>
              <Button
                variant="ghost"
                className="mt-3 text-orange-600"
                onClick={clearFilters}
              >
                Clear filters
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Complaint</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reported</TableHead>
                  <TableHead className="w-24 text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleComplaints.map((complaint) => (
                  <TableRow key={complaint.id}>
                    <TableCell>
                      <button
                        type="button"
                        className="text-left"
                        onClick={() => openDetails(complaint)}
                        aria-label={`Open complaint ${complaint.id}`}
                      >
                        <p className="font-semibold text-slate-800 hover:text-orange-600">
                          {complaint.title}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {complaint.id} · {complaint.category}
                        </p>
                      </button>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-sm text-slate-600">
                        <MapPin className="h-3.5 w-3.5 text-slate-400" />
                        {complaint.location}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {complaint.zone}
                      </p>
                    </TableCell>
                    <TableCell>
                      <PriorityBadge priority={complaint.priority} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={complaint.status} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-slate-600">
                      {formatDate(complaint.reportedAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openDetails(complaint)}
                      >
                        View details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <div className="flex flex-col gap-3 border-t px-5 py-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <span>
              Page {safePage} of {pageCount}
            </span>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={safePage === 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                <ChevronLeft className="mr-1 h-3.5 w-3.5" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={safePage === pageCount}
                onClick={() =>
                  setPage((current) => Math.min(pageCount, current + 1))
                }
              >
                Next
                <ChevronRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      {selected && (
        <div
          className="fixed inset-0 z-40 flex justify-end bg-slate-950/40"
          onClick={closeDetails}
        >
          <aside
            role="dialog"
            aria-modal="true"
            aria-label={`Complaint details ${selected.id}`}
            className="flex h-full w-full max-w-xl flex-col overflow-y-auto bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b px-6 py-5">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-orange-500">
                    {selected.id}
                  </p>
                  <StatusBadge status={selected.status} />
                </div>
                <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-900">
                  {selected.title}
                </h2>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={closeDetails}
                aria-label="Close complaint details"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="space-y-6 p-6">
              <div className="grid grid-cols-2 gap-4 rounded-xl border bg-slate-50 p-4">
                <div>
                  <p className="text-xs text-muted-foreground">Reported by</p>
                  <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                    <UserRound className="h-3.5 w-3.5 text-slate-400" />
                    {selected.reporter}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Reported on</p>
                  <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                    <Clock3 className="h-3.5 w-3.5 text-slate-400" />
                    {formatDate(selected.reportedAt)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Location</p>
                  <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                    <MapPin className="h-3.5 w-3.5 text-slate-400" />
                    {selected.location}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {selected.zone}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Priority</p>
                  <div className="mt-1">
                    <PriorityBadge priority={selected.priority} />
                  </div>
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  Complaint description
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {selected.description}
                </p>
              </div>
              <div className="border-t pt-5">
                <p className="text-sm font-semibold text-slate-800">Mobile evidence</p>
                {evidenceLoading ? <p className="mt-3 text-sm text-muted-foreground">Loading uploaded photo and running AI detection…</p> : evidence.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">No photo was uploaded with this complaint.</p> : <div className="mt-3 space-y-4">{evidence.map((item) => <div className="rounded-xl border bg-slate-50 p-3" key={item.id}><img src={item.imageUrl} alt="Uploaded road condition" className="max-h-64 w-full rounded-lg object-cover" /><div className="mt-3 grid grid-cols-2 gap-3 text-xs"><div><p className="text-muted-foreground">Latitude</p><p className="font-semibold text-slate-800">{item.latitude ?? 'Not captured'}</p></div><div><p className="text-muted-foreground">Longitude</p><p className="font-semibold text-slate-800">{item.longitude ?? 'Not captured'}</p></div><div><p className="text-muted-foreground">Potholes/patches detected</p><p className="font-semibold text-slate-800">{item.detectionCount}</p></div><div><p className="text-muted-foreground">Detection status</p><p className={`font-semibold ${item.status === 'FAILED' ? 'text-red-600' : item.status === 'COMPLETED' ? 'text-emerald-700' : 'text-slate-800'}`}>{item.status}</p></div></div></div>)}</div>}
              </div>
              <div className="border-t pt-5">
                <p className="text-sm font-semibold text-slate-800">
                  Status update
                </p>
                <div className="mt-3 flex gap-2">
                  <select
                    aria-label="Complaint status"
                    value={pendingStatus ?? selected.backendStatus}
                    onChange={(event) =>
                      setPendingStatus(event.target.value as BackendComplaintStatus)
                    }
                    className="h-10 flex-1 rounded-lg border border-input bg-background px-3 text-sm outline-none"
                  >
                    <option value={selected.backendStatus}>
                      {complaintStatusLabels[selected.backendStatus]}
                    </option>
                    {validComplaintTransitions[selected.backendStatus].map(
                      (status) => (
                        <option value={status} key={status}>
                          {complaintStatusLabels[status]}
                        </option>
                      ),
                    )}
                  </select>
                  <Button
                    onClick={saveStatus}
                    disabled={
                      pendingStatus === selected.backendStatus ||
                      validComplaintTransitions[selected.backendStatus].length === 0
                    }
                    className="gap-2 bg-orange-500 hover:bg-orange-600"
                  >
                    <Check className="h-4 w-4" />
                    Update
                  </Button>
                </div>
                {validComplaintTransitions[selected.backendStatus].length === 0 && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    No further status transitions are available.
                  </p>
                )}
              </div>
              <div className="border-t pt-5">
                <p className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <MessageSquare className="h-4 w-4 text-slate-400" />
                  Administrative notes
                </p>
                <div className="mt-3 flex gap-2">
                  <textarea
                    aria-label="Administrative note"
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="Write an administrative note..."
                    className="min-h-20 flex-1 resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  <Button
                    onClick={addNote}
                    disabled={!note.trim()}
                    className="self-end bg-slate-900 hover:bg-slate-800"
                  >
                    Add note
                  </Button>
                </div>
                {selected.notes.length > 0 && (
                  <div className="mt-4 space-y-3">
                    {selected.notes.map((item) => (
                      <div className="rounded-lg bg-slate-50 p-3" key={item.id}>
                        <p className="text-sm leading-5 text-slate-700">
                          {item.text}
                        </p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {item.author} · {item.createdAt}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {canDeleteSelected && (
                <div className="border-t pt-5">
                  {deleteConfirmOpen ? (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                      <p className="text-sm font-semibold text-red-800">Delete this complaint?</p>
                      <p className="mt-1 text-xs leading-5 text-red-700">This removes the report and its uploaded evidence permanently.</p>
                      <div className="mt-3 flex gap-2">
                        <Button variant="destructive" size="sm" onClick={deleteSelected} disabled={deleting}>{deleting ? "Deleting…" : "Confirm delete"}</Button>
                        <Button variant="ghost" size="sm" onClick={() => setDeleteConfirmOpen(false)} disabled={deleting}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <Button variant="ghost" className="gap-2 px-0 text-red-600 hover:bg-transparent hover:text-red-700" onClick={() => setDeleteConfirmOpen(true)}>
                      <Trash2 className="h-4 w-4" />Delete complaint
                    </Button>
                  )}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Signed in as {user?.name ?? "Administrator"}.
              </p>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
