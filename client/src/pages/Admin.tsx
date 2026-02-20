import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { Loader2, Plus, Edit2, Trash2, ArrowLeft, RefreshCw, BarChart2, Info } from "lucide-react";
import { useLocation } from "wouter";

type ResourceType = "electronic_library" | "repository" | "catalog" | "database" | "other";
type ContactType = "email" | "phone" | "address" | "telegram" | "viber" | "facebook" | "instagram" | "other";
type ActiveTab = "resources" | "contacts" | "info" | "analytics";

export default function Admin() {
  const { user, isAuthenticated } = useAuth();
  const [location, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<ActiveTab>("resources");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [syncResult, setSyncResult] = useState<{ synced: number; errors: string[] } | null>(null);

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

  // Fetch resources
  const { data: resources = [], isLoading: resourcesLoading } = trpc.resources.getAll.useQuery();

  // Fetch contacts
  const { data: contacts = [], isLoading: contactsLoading } = trpc.contacts.getAll.useQuery();

  // Fetch library info entries
  const { data: infoEntries = [], isLoading: infoLoading, refetch: refetchInfo } = trpc.libraryInfo.getAll.useQuery();

  // Fetch analytics
  const { data: analytics, isLoading: analyticsLoading } = trpc.analytics.getQueryStats.useQuery(undefined, {
    enabled: activeTab === "analytics",
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
    onSuccess: (result) => {
      setSyncResult(result);
      trpc.useUtils().resources.getAll.invalidate();
    },
  });

  // Check admin access
  if (!isAuthenticated || user?.role !== "admin") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 text-center">
          <h1 className="text-2xl font-bold mb-4 text-gray-900">Access Denied</h1>
          <p className="text-gray-600 mb-6">You do not have permission to access the admin panel.</p>
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
            <p className="text-sm text-gray-600">Manage library resources and contacts</p>
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
            className={activeTab === "resources" ? "bg-indigo-600 hover:bg-indigo-700" : ""}
          >
            Resources
          </Button>
          <Button
            variant={activeTab === "contacts" ? "default" : "outline"}
            onClick={() => setActiveTab("contacts")}
            className={activeTab === "contacts" ? "bg-indigo-600 hover:bg-indigo-700" : ""}
          >
            Contacts
          </Button>
          <Button
            variant={activeTab === "info" ? "default" : "outline"}
            onClick={() => setActiveTab("info")}
            className={activeTab === "info" ? "bg-indigo-600 hover:bg-indigo-700" : ""}
          >
            <Info className="w-4 h-4 mr-2" />
            Library Info
          </Button>
          <Button
            variant={activeTab === "analytics" ? "default" : "outline"}
            onClick={() => setActiveTab("analytics")}
            className={activeTab === "analytics" ? "bg-indigo-600 hover:bg-indigo-700" : ""}
          >
            <BarChart2 className="w-4 h-4 mr-2" />
            Analytics
          </Button>
          {/* Manual catalog sync button */}
          <div className="ml-auto flex items-center gap-2">
            {syncResult && (
              <span className="text-xs text-gray-500">
                Synced: {syncResult.synced}{syncResult.errors.length > 0 ? ` | Errors: ${syncResult.errors.length}` : ""}
              </span>
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
              <h2 className="text-lg font-bold mb-4">{editingId ? "Edit Resource" : "Add New Resource"}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name (English)</label>
                  <Input
                    value={resourceForm.nameEn}
                    onChange={(e) => setResourceForm({ ...resourceForm, nameEn: e.target.value })}
                    placeholder="Resource name in English"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name (Ukrainian)</label>
                  <Input
                    value={resourceForm.nameUk}
                    onChange={(e) => setResourceForm({ ...resourceForm, nameUk: e.target.value })}
                    placeholder="Resource name in Ukrainian"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name (Russian)</label>
                  <Input
                    value={resourceForm.nameRu}
                    onChange={(e) => setResourceForm({ ...resourceForm, nameRu: e.target.value })}
                    placeholder="Resource name in Russian"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <Select value={resourceForm.type} onValueChange={(val) => setResourceForm({ ...resourceForm, type: val as ResourceType })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="electronic_library">Electronic Library</SelectItem>
                      <SelectItem value="repository">Repository</SelectItem>
                      <SelectItem value="catalog">Catalog</SelectItem>
                      <SelectItem value="database">Database</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
                  <Input
                    value={resourceForm.url}
                    onChange={(e) => setResourceForm({ ...resourceForm, url: e.target.value })}
                    placeholder="https://example.com"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description (English)</label>
                  <Input
                    value={resourceForm.descriptionEn}
                    onChange={(e) => setResourceForm({ ...resourceForm, descriptionEn: e.target.value })}
                    placeholder="Description in English"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description (Ukrainian)</label>
                  <Input
                    value={resourceForm.descriptionUk}
                    onChange={(e) => setResourceForm({ ...resourceForm, descriptionUk: e.target.value })}
                    placeholder="Description in Ukrainian"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description (Russian)</label>
                  <Input
                    value={resourceForm.descriptionRu}
                    onChange={(e) => setResourceForm({ ...resourceForm, descriptionRu: e.target.value })}
                    placeholder="Description in Russian"
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button onClick={handleSaveResource} disabled={createResourceMutation.isPending || updateResourceMutation.isPending} className="bg-indigo-600 hover:bg-indigo-700">
                  {createResourceMutation.isPending || updateResourceMutation.isPending ? (
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
                <p className="text-gray-500 text-center py-8">No resources yet</p>
              ) : (
                <ScrollArea className="h-96">
                  <div className="space-y-2">
                    {resources.map((resource: any) => (
                      <div key={resource.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{resource.nameEn}</div>
                          <div className="text-sm text-gray-600">{resource.type}</div>
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
                            onClick={() => deleteResourceMutation.mutate({ id: resource.id })}
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
              <h2 className="text-lg font-bold mb-4">{editingId ? "Edit Contact" : "Add New Contact"}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <Select value={contactForm.type} onValueChange={(val) => setContactForm({ ...contactForm, type: val as ContactType })}>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Value</label>
                  <Input
                    value={contactForm.value}
                    onChange={(e) => setContactForm({ ...contactForm, value: e.target.value })}
                    placeholder="Contact value"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Label (English)</label>
                  <Input
                    value={contactForm.labelEn}
                    onChange={(e) => setContactForm({ ...contactForm, labelEn: e.target.value })}
                    placeholder="Label in English"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Label (Ukrainian)</label>
                  <Input
                    value={contactForm.labelUk}
                    onChange={(e) => setContactForm({ ...contactForm, labelUk: e.target.value })}
                    placeholder="Label in Ukrainian"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Label (Russian)</label>
                  <Input
                    value={contactForm.labelRu}
                    onChange={(e) => setContactForm({ ...contactForm, labelRu: e.target.value })}
                    placeholder="Label in Russian"
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button onClick={handleSaveContact} disabled={createContactMutation.isPending || updateContactMutation.isPending} className="bg-indigo-600 hover:bg-indigo-700">
                  {createContactMutation.isPending || updateContactMutation.isPending ? (
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
                <p className="text-gray-500 text-center py-8">No contacts yet</p>
              ) : (
                <ScrollArea className="h-96">
                  <div className="space-y-2">
                    {contacts.map((contact: any) => (
                      <div key={contact.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{contact.labelEn || contact.value}</div>
                          <div className="text-sm text-gray-600">{contact.type}: {contact.value}</div>
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
                            onClick={() => deleteContactMutation.mutate({ id: contact.id })}
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Key</label>
                  <Select value={infoForm.key} onValueChange={(val) => setInfoForm({ ...infoForm, key: val })}>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Value (Ukrainian)</label>
                  <Input
                    value={infoForm.valueUk}
                    onChange={(e) => setInfoForm({ ...infoForm, valueUk: e.target.value })}
                    placeholder="Значення українською"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Value (English)</label>
                  <Input
                    value={infoForm.valueEn}
                    onChange={(e) => setInfoForm({ ...infoForm, valueEn: e.target.value })}
                    placeholder="Value in English"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Value (Russian)</label>
                  <Input
                    value={infoForm.valueRu}
                    onChange={(e) => setInfoForm({ ...infoForm, valueRu: e.target.value })}
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
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>
                ) : (
                  <><Plus className="w-4 h-4 mr-2" />Save Info</>
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
                    <div key={entry.key} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 text-sm">[{entry.key}]</div>
                        <div className="text-sm text-gray-600 mt-1 line-clamp-2">{entry.valueUk}</div>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => handleEditInfo(entry)}>
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
                    <p className="text-3xl font-bold text-indigo-600">{analytics.totalQueries}</p>
                    <p className="text-sm text-gray-600 mt-1">Total Queries</p>
                  </Card>
                  {analytics.languageBreakdown.map((lb: any) => (
                    <Card key={lb.language} className="p-4 text-center">
                      <p className="text-3xl font-bold text-indigo-600">{lb.count}</p>
                      <p className="text-sm text-gray-600 mt-1 uppercase">{lb.language}</p>
                    </Card>
                  ))}
                </div>

                <Card className="p-6">
                  <h2 className="text-lg font-bold mb-4">Top Queries</h2>
                  {analytics.topQueries.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No queries logged yet</p>
                  ) : (
                    <ScrollArea className="h-72">
                      <div className="space-y-2">
                        {analytics.topQueries.map((item: any, i: number) => (
                          <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <span className="text-sm text-gray-800 flex-1 truncate">{item.query}</span>
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
              <p className="text-gray-500 text-center py-12">Failed to load analytics</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
