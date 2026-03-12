import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import {
  Loader2,
  Plus,
  Edit2,
  Trash2,
  ArrowLeft,
  RefreshCw,
  BarChart2,
  Info,
  FileText,
  AlertCircle,
  CheckCircle2,
  Activity,
} from "lucide-react";
import { useLocation } from "wouter";

type ResourceType =
  | "electronic_library"
  | "repository"
  | "catalog"
  | "database"
  | "other";
type ContactType =
  | "email"
  | "phone"
  | "address"
  | "telegram"
  | "viber"
  | "facebook"
  | "instagram"
  | "other";
type ActiveTab =
  | "resources"
  | "contacts"
  | "info"
  | "analytics"
  | "documents"
  | "metrics";

/** Auto-refresh interval (ms) for the Performance metrics tab. */
const METRICS_REFRESH_INTERVAL_MS = 5_000;

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

function SyncStatusBadge({
  success,
  timestamp,
  errors,
}: {
  success: boolean;
  timestamp: string;
  errors?: string[];
}) {
  const badgeClass = success
    ? "bg-green-100 text-green-800"
    : "bg-red-100 text-red-800";
  const dotClass = success ? "bg-green-500" : "bg-red-500";
  const label = success ? "Sync OK" : "Sync Failed";

  const tooltipText =
    errors && errors.length > 0
      ? `Last error:\n${errors[errors.length - 1]}`
      : success
        ? "All resources synced successfully"
        : "Sync failed with no error details";

  return (
    <div
      className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium cursor-default ${badgeClass}`}
      title={tooltipText}
    >
      <span className={`inline-block w-2 h-2 rounded-full ${dotClass}`} />
      {label}
      <span className="ml-1 font-normal opacity-75">
        {new Date(timestamp).toLocaleTimeString()}
      </span>
    </div>
  );
}

export default function Admin() {
  const { user, isAuthenticated } = useAuth();
  const [location, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<ActiveTab>("resources");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [syncResult, setSyncResult] = useState<{
    synced: number;
    errors: string[];
  } | null>(null);

  // Resource form state
  const [resourceForm, setResourceForm] = useState({
    nameEn: "",
    nameUk: "",
    nameRu: "",
    descriptionEn: "",
    descriptionUk: "",
    descriptionRu: "",
    type: "electronic_library" as ResourceType,
    url: "",
  });

  // Contact form state
  const [contactForm, setContactForm] = useState({
    type: "email" as ContactType,
    value: "",
    labelEn: "",
    labelUk: "",
    labelRu: "",
  });

  // Library info form state
  const [infoForm, setInfoForm] = useState({
    key: "about",
    valueEn: "",
    valueUk: "",
    valueRu: "",
  });

  // PDF document upload state
  const [pdfForm, setPdfForm] = useState({
    title: "",
    content: "",
    language: "uk" as "en" | "uk" | "ru",
    sourceType: "other" as "catalog" | "repository" | "database" | "other",
    url: "",
    author: "",
  });
  const [pdfStatus, setPdfStatus] = useState<
    | { type: "idle" }
    | { type: "loading" }
    | { type: "success"; chunksCreated: number; documentId: string }
    | { type: "error"; message: string }
  >({ type: "idle" });

  // Fetch resources
  const { data: resources = [], isLoading: resourcesLoading } =
    trpc.resources.getAll.useQuery();

  // Fetch contacts
  const { data: contacts = [], isLoading: contactsLoading } =
    trpc.contacts.getAll.useQuery();

  // Fetch library info entries (cached 5 min; mutations invalidate it)
  const {
    data: infoEntries = [],
    isLoading: infoLoading,
    refetch: refetchInfo,
  } = trpc.libraryInfo.getAll.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
  });

  // Fetch analytics
  const { data: analytics, isLoading: analyticsLoading } =
    trpc.analytics.getQueryStats.useQuery(undefined, {
      enabled: activeTab === "analytics",
    });

  // Fetch performance metrics from /api/metrics (REST endpoint, cookie auth)
  const {
    data: perfMetrics,
    isLoading: metricsLoading,
    refetch: refetchMetrics,
    error: metricsError,
  } = useQuery({
    queryKey: ["perfMetrics"],
    queryFn: async () => {
      const res = await fetch("/api/metrics", { credentials: "include" });
      if (!res.ok) {
        if (res.status === 401) throw new Error("Authentication required");
        if (res.status === 403) throw new Error("Admin access required");
        const body = await res.json().catch(() => ({}));
        throw new Error(
          (body as { error?: string }).error ?? `Request failed (${res.status})`
        );
      }
      return res.json();
    },
    enabled: activeTab === "metrics",
    refetchInterval:
      activeTab === "metrics" ? METRICS_REFRESH_INTERVAL_MS : false,
  });

  // Mutations
  const createResourceMutation = trpc.resources.create.useMutation({
    onSuccess: () => {
      resetResourceForm();
      trpc.useUtils().resources.getAll.invalidate();
    },
  });

  const updateResourceMutation = trpc.resources.update.useMutation({
    onSuccess: () => {
      resetResourceForm();
      trpc.useUtils().resources.getAll.invalidate();
    },
  });

  const deleteResourceMutation = trpc.resources.delete.useMutation({
    onSuccess: () => {
      trpc.useUtils().resources.getAll.invalidate();
    },
  });

  const createContactMutation = trpc.contacts.create.useMutation({
    onSuccess: () => {
      resetContactForm();
      trpc.useUtils().contacts.getAll.invalidate();
    },
  });

  const updateContactMutation = trpc.contacts.update.useMutation({
    onSuccess: () => {
      resetContactForm();
      trpc.useUtils().contacts.getAll.invalidate();
    },
  });

  const deleteContactMutation = trpc.contacts.delete.useMutation({
    onSuccess: () => {
      trpc.useUtils().contacts.getAll.invalidate();
    },
  });

  const setInfoMutation = trpc.libraryInfo.set.useMutation({
    onSuccess: () => {
      refetchInfo();
    },
  });

  const syncMutation = trpc.sync.runNow.useMutation({
    onSuccess: result => {
      setSyncResult(result);
      trpc.useUtils().resources.getAll.invalidate();
      trpc.useUtils().sync.lastStatus.invalidate();
    },
  });

  const { data: lastSyncStatus } = trpc.sync.lastStatus.useQuery(undefined, {
    refetchInterval: 30_000,
  });

  // Check admin access
  if (!isAuthenticated || user?.role !== "admin") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 text-center">
          <h1 className="text-2xl font-bold mb-4 text-gray-900">
            Access Denied
          </h1>
          <p className="text-gray-600 mb-6">
            You do not have permission to access the admin panel.
          </p>
          <Button onClick={() => setLocation("/")} className="w-full">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Chat
          </Button>
        </Card>
      </div>
    );
  }

  const resetResourceForm = () => {
    setResourceForm({
      nameEn: "",
      nameUk: "",
      nameRu: "",
      descriptionEn: "",
      descriptionUk: "",
      descriptionRu: "",
      type: "electronic_library",
      url: "",
    });
    setEditingId(null);
  };

  const resetContactForm = () => {
    setContactForm({
      type: "email",
      value: "",
      labelEn: "",
      labelUk: "",
      labelRu: "",
    });
    setEditingId(null);
  };

  const handleSaveResource = async () => {
    if (editingId) {
      updateResourceMutation.mutate({
        id: editingId,
        ...resourceForm,
      });
    } else {
      createResourceMutation.mutate(resourceForm);
    }
  };

  const handleSaveContact = async () => {
    if (editingId) {
      updateContactMutation.mutate({
        id: editingId,
        ...contactForm,
      });
    } else {
      createContactMutation.mutate(contactForm);
    }
  };

  const handleSaveInfo = () => {
    setInfoMutation.mutate(infoForm);
  };

  const handleEditInfo = (entry: any) => {
    setInfoForm({
      key: entry.key,
      valueEn: entry.valueEn ?? "",
      valueUk: entry.valueUk ?? "",
      valueRu: entry.valueRu ?? "",
    });
  };

  const handleEditResource = (resource: any) => {
    setResourceForm({
      nameEn: resource.nameEn,
      nameUk: resource.nameUk,
      nameRu: resource.nameRu,
      descriptionEn: resource.descriptionEn || "",
      descriptionUk: resource.descriptionUk || "",
      descriptionRu: resource.descriptionRu || "",
      type: resource.type,
      url: resource.url || "",
    });
    setEditingId(resource.id);
  };

  const handleEditContact = (contact: any) => {
    setContactForm({
      type: contact.type,
      value: contact.value,
      labelEn: contact.labelEn || "",
      labelUk: contact.labelUk || "",
      labelRu: contact.labelRu || "",
    });
    setEditingId(contact.id);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
            <p className="text-sm text-gray-600">
              Manage library resources and contacts
            </p>
          </div>
          <Button variant="outline" onClick={() => setLocation("/")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Chat
          </Button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6">
        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          <Button
            variant={activeTab === "resources" ? "default" : "outline"}
            onClick={() => setActiveTab("resources")}
            className={
              activeTab === "resources"
                ? "bg-indigo-600 hover:bg-indigo-700"
                : ""
            }
          >
            Resources
          </Button>
          <Button
            variant={activeTab === "contacts" ? "default" : "outline"}
            onClick={() => setActiveTab("contacts")}
            className={
              activeTab === "contacts"
                ? "bg-indigo-600 hover:bg-indigo-700"
                : ""
            }
          >
            Contacts
          </Button>
          <Button
            variant={activeTab === "info" ? "default" : "outline"}
            onClick={() => setActiveTab("info")}
            className={
              activeTab === "info" ? "bg-indigo-600 hover:bg-indigo-700" : ""
            }
          >
            <Info className="w-4 h-4 mr-2" />
            Library Info
          </Button>
          <Button
            variant={activeTab === "analytics" ? "default" : "outline"}
            onClick={() => setActiveTab("analytics")}
            className={
              activeTab === "analytics"
                ? "bg-indigo-600 hover:bg-indigo-700"
                : ""
            }
          >
            <BarChart2 className="w-4 h-4 mr-2" />
            Analytics
          </Button>
          <Button
            variant={activeTab === "documents" ? "default" : "outline"}
            onClick={() => setActiveTab("documents")}
            className={
              activeTab === "documents"
                ? "bg-indigo-600 hover:bg-indigo-700"
                : ""
            }
          >
            <FileText className="w-4 h-4 mr-2" />
            Documents
          </Button>
          <Button
            variant={activeTab === "metrics" ? "default" : "outline"}
            onClick={() => setActiveTab("metrics")}
            className={
              activeTab === "metrics" ? "bg-indigo-600 hover:bg-indigo-700" : ""
            }
          >
            <Activity className="w-4 h-4 mr-2" />
            Performance
          </Button>
          {/* Manual catalog sync button */}
          <div className="ml-auto flex items-center gap-3">
            {/* Last sync status badge with error tooltip */}
            {lastSyncStatus ? (
              <SyncStatusBadge
                success={lastSyncStatus.success}
                timestamp={lastSyncStatus.timestamp}
                errors={lastSyncStatus.errors}
              />
            ) : syncResult ? (
              <span className="text-xs text-gray-500">
                Synced: {syncResult.synced}
                {syncResult.errors.length > 0
                  ? ` | Errors: ${syncResult.errors.length}`
                  : ""}
              </span>
            ) : null}
            {/* Download sync error log */}
            {lastSyncStatus && lastSyncStatus.errors.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                title="Download sync error log as TXT"
                onClick={() => {
                  const lines = [
                    `Sync log — ${new Date(lastSyncStatus.timestamp).toISOString()}`,
                    `Status: ${lastSyncStatus.success ? "OK" : "Failed"}`,
                    `Synced: ${lastSyncStatus.synced}`,
                    "",
                    "Errors:",
                    ...lastSyncStatus.errors.map((e, i) => `${i + 1}. ${e}`),
                  ];
                  const blob = new Blob([lines.join("\n")], {
                    type: "text/plain",
                  });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `sync-log-${Date.now()}.txt`;
                  a.click();
                  // Delay revocation to ensure the download starts in all browsers
                  setTimeout(() => URL.revokeObjectURL(url), 100);
                }}
              >
                ↓ Download Logs
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending}
              title="Run catalog sync now"
            >
              {syncMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Sync Catalog
            </Button>
          </div>
        </div>

        {/* Resources Tab */}
        {activeTab === "resources" && (
          <div className="space-y-6">
            {/* Add/Edit Resource Form */}
            <Card className="p-6">
              <h2 className="text-lg font-bold mb-4">
                {editingId ? "Edit Resource" : "Add New Resource"}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name (English)
                  </label>
                  <Input
                    value={resourceForm.nameEn}
                    onChange={e =>
                      setResourceForm({
                        ...resourceForm,
                        nameEn: e.target.value,
                      })
                    }
                    placeholder="Resource name in English"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name (Ukrainian)
                  </label>
                  <Input
                    value={resourceForm.nameUk}
                    onChange={e =>
                      setResourceForm({
                        ...resourceForm,
                        nameUk: e.target.value,
                      })
                    }
                    placeholder="Resource name in Ukrainian"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name (Russian)
                  </label>
                  <Input
                    value={resourceForm.nameRu}
                    onChange={e =>
                      setResourceForm({
                        ...resourceForm,
                        nameRu: e.target.value,
                      })
                    }
                    placeholder="Resource name in Russian"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type
                  </label>
                  <Select
                    value={resourceForm.type}
                    onValueChange={val =>
                      setResourceForm({
                        ...resourceForm,
                        type: val as ResourceType,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="electronic_library">
                        Electronic Library
                      </SelectItem>
                      <SelectItem value="repository">Repository</SelectItem>
                      <SelectItem value="catalog">Catalog</SelectItem>
                      <SelectItem value="database">Database</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    URL
                  </label>
                  <Input
                    value={resourceForm.url}
                    onChange={e =>
                      setResourceForm({ ...resourceForm, url: e.target.value })
                    }
                    placeholder="https://example.com"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description (English)
                  </label>
                  <Input
                    value={resourceForm.descriptionEn}
                    onChange={e =>
                      setResourceForm({
                        ...resourceForm,
                        descriptionEn: e.target.value,
                      })
                    }
                    placeholder="Description in English"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description (Ukrainian)
                  </label>
                  <Input
                    value={resourceForm.descriptionUk}
                    onChange={e =>
                      setResourceForm({
                        ...resourceForm,
                        descriptionUk: e.target.value,
                      })
                    }
                    placeholder="Description in Ukrainian"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description (Russian)
                  </label>
                  <Input
                    value={resourceForm.descriptionRu}
                    onChange={e =>
                      setResourceForm({
                        ...resourceForm,
                        descriptionRu: e.target.value,
                      })
                    }
                    placeholder="Description in Russian"
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button
                  onClick={handleSaveResource}
                  disabled={
                    createResourceMutation.isPending ||
                    updateResourceMutation.isPending
                  }
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  {createResourceMutation.isPending ||
                  updateResourceMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      {editingId ? "Update" : "Add"} Resource
                    </>
                  )}
                </Button>
                {editingId && (
                  <Button variant="outline" onClick={resetResourceForm}>
                    Cancel
                  </Button>
                )}
              </div>
            </Card>

            {/* Resources List */}
            <Card className="p-6">
              <h2 className="text-lg font-bold mb-4">Library Resources</h2>
              {resourcesLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                </div>
              ) : resources.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No resources yet
                </p>
              ) : (
                <ScrollArea className="h-96">
                  <div className="space-y-2">
                    {resources.map((resource: any) => (
                      <div
                        key={resource.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">
                            {resource.nameEn}
                          </div>
                          <div className="text-sm text-gray-600">
                            {resource.type}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditResource(resource)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() =>
                              deleteResourceMutation.mutate({ id: resource.id })
                            }
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </Card>
          </div>
        )}

        {/* Contacts Tab */}
        {activeTab === "contacts" && (
          <div className="space-y-6">
            {/* Add/Edit Contact Form */}
            <Card className="p-6">
              <h2 className="text-lg font-bold mb-4">
                {editingId ? "Edit Contact" : "Add New Contact"}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type
                  </label>
                  <Select
                    value={contactForm.type}
                    onValueChange={val =>
                      setContactForm({
                        ...contactForm,
                        type: val as ContactType,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="phone">Phone</SelectItem>
                      <SelectItem value="address">Address</SelectItem>
                      <SelectItem value="telegram">Telegram</SelectItem>
                      <SelectItem value="viber">Viber</SelectItem>
                      <SelectItem value="facebook">Facebook</SelectItem>
                      <SelectItem value="instagram">Instagram</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Value
                  </label>
                  <Input
                    value={contactForm.value}
                    onChange={e =>
                      setContactForm({ ...contactForm, value: e.target.value })
                    }
                    placeholder="Contact value"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Label (English)
                  </label>
                  <Input
                    value={contactForm.labelEn}
                    onChange={e =>
                      setContactForm({
                        ...contactForm,
                        labelEn: e.target.value,
                      })
                    }
                    placeholder="Label in English"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Label (Ukrainian)
                  </label>
                  <Input
                    value={contactForm.labelUk}
                    onChange={e =>
                      setContactForm({
                        ...contactForm,
                        labelUk: e.target.value,
                      })
                    }
                    placeholder="Label in Ukrainian"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Label (Russian)
                  </label>
                  <Input
                    value={contactForm.labelRu}
                    onChange={e =>
                      setContactForm({
                        ...contactForm,
                        labelRu: e.target.value,
                      })
                    }
                    placeholder="Label in Russian"
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button
                  onClick={handleSaveContact}
                  disabled={
                    createContactMutation.isPending ||
                    updateContactMutation.isPending
                  }
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  {createContactMutation.isPending ||
                  updateContactMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      {editingId ? "Update" : "Add"} Contact
                    </>
                  )}
                </Button>
                {editingId && (
                  <Button variant="outline" onClick={resetContactForm}>
                    Cancel
                  </Button>
                )}
              </div>
            </Card>

            {/* Contacts List */}
            <Card className="p-6">
              <h2 className="text-lg font-bold mb-4">Library Contacts</h2>
              {contactsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                </div>
              ) : contacts.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No contacts yet
                </p>
              ) : (
                <ScrollArea className="h-96">
                  <div className="space-y-2">
                    {contacts.map((contact: any) => (
                      <div
                        key={contact.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">
                            {contact.labelEn || contact.value}
                          </div>
                          <div className="text-sm text-gray-600">
                            {contact.type}: {contact.value}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditContact(contact)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() =>
                              deleteContactMutation.mutate({ id: contact.id })
                            }
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </Card>
          </div>
        )}

        {/* Library Info Tab */}
        {activeTab === "info" && (
          <div className="space-y-6">
            <Card className="p-6">
              <h2 className="text-lg font-bold mb-4">Edit Library Info</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Key
                  </label>
                  <Select
                    value={infoForm.key}
                    onValueChange={val =>
                      setInfoForm({ ...infoForm, key: val })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="about">about</SelectItem>
                      <SelectItem value="hours">hours</SelectItem>
                      <SelectItem value="address">address</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Value (Ukrainian)
                  </label>
                  <Input
                    value={infoForm.valueUk}
                    onChange={e =>
                      setInfoForm({ ...infoForm, valueUk: e.target.value })
                    }
                    placeholder="Значення українською"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Value (English)
                  </label>
                  <Input
                    value={infoForm.valueEn}
                    onChange={e =>
                      setInfoForm({ ...infoForm, valueEn: e.target.value })
                    }
                    placeholder="Value in English"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Value (Russian)
                  </label>
                  <Input
                    value={infoForm.valueRu}
                    onChange={e =>
                      setInfoForm({ ...infoForm, valueRu: e.target.value })
                    }
                    placeholder="Значение на русском"
                  />
                </div>
              </div>
              <Button
                onClick={handleSaveInfo}
                disabled={setInfoMutation.isPending}
                className="mt-4 bg-indigo-600 hover:bg-indigo-700"
              >
                {setInfoMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Save Info
                  </>
                )}
              </Button>
            </Card>

            <Card className="p-6">
              <h2 className="text-lg font-bold mb-4">Current Library Info</h2>
              {infoLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                </div>
              ) : (
                <div className="space-y-3">
                  {(infoEntries as any[]).map((entry: any) => (
                    <div
                      key={entry.key}
                      className="flex items-start justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 text-sm">
                          [{entry.key}]
                        </div>
                        <div className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {entry.valueUk}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditInfo(entry)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === "analytics" && (
          <div className="space-y-6">
            {analyticsLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
              </div>
            ) : analytics ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Card className="p-4 text-center">
                    <p className="text-3xl font-bold text-indigo-600">
                      {analytics.totalQueries}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">Total Queries</p>
                  </Card>
                  {analytics.languageBreakdown.map((lb: any) => (
                    <Card key={lb.language} className="p-4 text-center">
                      <p className="text-3xl font-bold text-indigo-600">
                        {lb.count}
                      </p>
                      <p className="text-sm text-gray-600 mt-1 uppercase">
                        {lb.language}
                      </p>
                    </Card>
                  ))}
                </div>

                <Card className="p-6">
                  <h2 className="text-lg font-bold mb-4">Top Queries</h2>
                  {analytics.topQueries.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">
                      No queries logged yet
                    </p>
                  ) : (
                    <ScrollArea className="h-72">
                      <div className="space-y-2">
                        {analytics.topQueries.map((item: any, i: number) => (
                          <div
                            key={i}
                            className="flex items-center justify-between p-2 bg-gray-50 rounded"
                          >
                            <span className="text-sm text-gray-800 flex-1 truncate">
                              {item.query}
                            </span>
                            <span className="ml-3 text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                              {item.count}
                            </span>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </Card>
              </>
            ) : (
              <p className="text-gray-500 text-center py-12">
                Failed to load analytics
              </p>
            )}
          </div>
        )}

        {/* Documents Tab — upload text/PDF content to the RAG vector store */}
        {activeTab === "documents" && (
          <div className="max-w-2xl space-y-6">
            <Card className="p-6">
              <h2 className="text-lg font-bold mb-1">Upload Document to RAG</h2>
              <p className="text-sm text-gray-500 mb-5">
                Paste the text content of a PDF or other document. The system
                will chunk it, generate embeddings, and add it to the knowledge
                base for AI search.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={pdfForm.title}
                    onChange={e =>
                      setPdfForm({ ...pdfForm, title: e.target.value })
                    }
                    placeholder="Document title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Content <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={pdfForm.content}
                    onChange={e =>
                      setPdfForm({ ...pdfForm, content: e.target.value })
                    }
                    placeholder="Paste document text here…"
                    rows={10}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Language
                    </label>
                    <Select
                      value={pdfForm.language}
                      onValueChange={v =>
                        setPdfForm({
                          ...pdfForm,
                          language: v as "en" | "uk" | "ru",
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="uk">Ukrainian</SelectItem>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="ru">Russian</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Source type
                    </label>
                    <Select
                      value={pdfForm.sourceType}
                      onValueChange={v =>
                        setPdfForm({
                          ...pdfForm,
                          sourceType: v as
                            | "catalog"
                            | "repository"
                            | "database"
                            | "other",
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="catalog">Catalog</SelectItem>
                        <SelectItem value="repository">Repository</SelectItem>
                        <SelectItem value="database">Database</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    URL (optional)
                  </label>
                  <Input
                    value={pdfForm.url}
                    onChange={e =>
                      setPdfForm({ ...pdfForm, url: e.target.value })
                    }
                    placeholder="https://…"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Author (optional)
                  </label>
                  <Input
                    value={pdfForm.author}
                    onChange={e =>
                      setPdfForm({ ...pdfForm, author: e.target.value })
                    }
                    placeholder="Author name"
                  />
                </div>

                {/* Status feedback */}
                {pdfStatus.type === "success" && (
                  <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    <span>
                      Processed successfully —{" "}
                      <strong>{pdfStatus.chunksCreated}</strong> chunks added
                      (document ID:{" "}
                      <code className="text-xs">{pdfStatus.documentId}</code>)
                    </span>
                  </div>
                )}
                {pdfStatus.type === "error" && (
                  <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{pdfStatus.message}</span>
                  </div>
                )}

                <Button
                  onClick={async () => {
                    if (!pdfForm.title.trim() || !pdfForm.content.trim())
                      return;
                    setPdfStatus({ type: "loading" });
                    try {
                      const res = await fetch("/api/admin/process-pdf", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        credentials: "include",
                        body: JSON.stringify({
                          title: pdfForm.title,
                          content: pdfForm.content,
                          language: pdfForm.language,
                          sourceType: pdfForm.sourceType,
                          url: pdfForm.url || undefined,
                          author: pdfForm.author || undefined,
                        }),
                      });
                      const data: unknown = await res.json();
                      if (
                        res.ok &&
                        data !== null &&
                        typeof data === "object" &&
                        "success" in data &&
                        (data as { success: boolean }).success
                      ) {
                        const d = data as {
                          success: boolean;
                          chunksCreated: number;
                          documentId: string;
                        };
                        setPdfStatus({
                          type: "success",
                          chunksCreated: d.chunksCreated,
                          documentId: d.documentId,
                        });
                        setPdfForm({
                          title: "",
                          content: "",
                          language: "uk",
                          sourceType: "other",
                          url: "",
                          author: "",
                        });
                      } else {
                        const msg =
                          data !== null &&
                          typeof data === "object" &&
                          "error" in data &&
                          typeof (data as { error: unknown }).error === "string"
                            ? (data as { error: string }).error
                            : "Upload failed";
                        setPdfStatus({ type: "error", message: msg });
                      }
                    } catch (err) {
                      setPdfStatus({
                        type: "error",
                        message:
                          err instanceof Error ? err.message : "Network error",
                      });
                    }
                  }}
                  disabled={
                    pdfStatus.type === "loading" ||
                    !pdfForm.title.trim() ||
                    !pdfForm.content.trim()
                  }
                  className="w-full bg-indigo-600 hover:bg-indigo-700"
                >
                  {pdfStatus.type === "loading" ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing…
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4 mr-2" />
                      Process &amp; Add to Knowledge Base
                    </>
                  )}
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Performance Metrics Tab — fetches GET /api/metrics (admin-only) */}
        {activeTab === "metrics" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">Performance Metrics</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchMetrics()}
                disabled={metricsLoading}
              >
                <RefreshCw
                  className={`w-4 h-4 mr-2 ${metricsLoading ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
            </div>

            {metricsLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
              </div>
            ) : metricsError ? (
              <Card className="p-6 border-red-200 bg-red-50">
                <div className="flex items-center gap-2 text-red-700">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <p className="text-sm font-medium">
                    {(metricsError as Error).message ||
                      "Failed to load metrics"}
                  </p>
                </div>
              </Card>
            ) : perfMetrics ? (
              <>
                {/* Uptime */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Card className="p-4 text-center">
                    <p className="text-3xl font-bold text-indigo-600">
                      {formatUptime(perfMetrics.uptime.uptimeSeconds)}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">Uptime</p>
                  </Card>
                  <Card className="p-4 text-center">
                    <p className="text-3xl font-bold text-indigo-600">
                      {perfMetrics.streaming.total}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">Total Streams</p>
                  </Card>
                  <Card className="p-4 text-center">
                    <p
                      className={`text-3xl font-bold ${
                        perfMetrics.streaming.errorRate > 0.1
                          ? "text-red-600"
                          : "text-green-600"
                      }`}
                    >
                      {(perfMetrics.streaming.errorRate * 100).toFixed(1)}%
                    </p>
                    <p className="text-sm text-gray-600 mt-1">Error Rate</p>
                  </Card>
                </div>

                {/* Latency */}
                <Card className="p-6">
                  <h3 className="text-base font-semibold mb-4">
                    Chat Latency ({perfMetrics.latency.samples} samples)
                  </h3>
                  {perfMetrics.latency.samples === 0 ? (
                    <p className="text-sm text-gray-500">
                      No requests recorded yet
                    </p>
                  ) : (
                    <div className="grid grid-cols-3 gap-4">
                      {[
                        { label: "p50", value: perfMetrics.latency.p50Ms },
                        { label: "p95", value: perfMetrics.latency.p95Ms },
                        { label: "p99", value: perfMetrics.latency.p99Ms },
                      ].map(({ label, value }) => (
                        <div
                          key={label}
                          className="text-center bg-gray-50 rounded-lg p-4"
                        >
                          <p className="text-2xl font-bold text-indigo-600">
                            {value != null ? `${Math.round(value)} ms` : "—"}
                          </p>
                          <p className="text-sm text-gray-500 mt-1">{label}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>

                {/* Streaming counters */}
                <Card className="p-6">
                  <h3 className="text-base font-semibold mb-4">
                    Streaming Outcomes
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      {
                        label: "Success",
                        value: perfMetrics.streaming.success,
                        color: "text-green-600",
                      },
                      {
                        label: "Error",
                        value: perfMetrics.streaming.error,
                        color: "text-red-600",
                      },
                      {
                        label: "Timeout",
                        value: perfMetrics.streaming.timeout,
                        color: "text-yellow-600",
                      },
                    ].map(({ label, value, color }) => (
                      <div
                        key={label}
                        className="text-center bg-gray-50 rounded-lg p-4"
                      >
                        <p className={`text-2xl font-bold ${color}`}>{value}</p>
                        <p className="text-sm text-gray-500 mt-1">{label}</p>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Memory */}
                {perfMetrics.memory.current && (
                  <Card className="p-6">
                    <h3 className="text-base font-semibold mb-4">
                      Memory (current)
                    </h3>
                    <div className="grid grid-cols-3 gap-4">
                      {[
                        {
                          label: "Heap Used",
                          value: perfMetrics.memory.current.heapUsedMb,
                        },
                        {
                          label: "Heap Total",
                          value: perfMetrics.memory.current.heapTotalMb,
                        },
                        {
                          label: "RSS",
                          value: perfMetrics.memory.current.rssMb,
                        },
                      ].map(({ label, value }) => (
                        <div
                          key={label}
                          className="text-center bg-gray-50 rounded-lg p-4"
                        >
                          <p className="text-2xl font-bold text-indigo-600">
                            {value != null ? `${value.toFixed(1)} MB` : "—"}
                          </p>
                          <p className="text-sm text-gray-500 mt-1">{label}</p>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                <p className="text-xs text-gray-400 text-right">
                  Collected at{" "}
                  {new Date(perfMetrics.collectedAt).toLocaleTimeString()} ·
                  auto-refreshes every 5 s
                </p>
              </>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
