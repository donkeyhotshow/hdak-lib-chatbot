import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { Loader2, Plus, Edit2, Trash2, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

type ResourceType = "electronic_library" | "repository" | "catalog" | "database" | "other";
type ContactType = "email" | "phone" | "address" | "telegram" | "viber" | "facebook" | "instagram" | "other";

export default function Admin() {
  const { user, isAuthenticated } = useAuth();
  const [location, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<"resources" | "contacts">("resources");
  const [editingId, setEditingId] = useState<number | null>(null);

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

  // Fetch resources
  const { data: resources = [], isLoading: resourcesLoading } = trpc.resources.getAll.useQuery();

  // Fetch contacts
  const { data: contacts = [], isLoading: contactsLoading } = trpc.contacts.getAll.useQuery();

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
        <div className="flex gap-4 mb-6">
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
      </div>
    </div>
  );
}
