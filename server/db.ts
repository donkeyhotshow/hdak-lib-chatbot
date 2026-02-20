import { eq, like, or, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, users, 
  conversations, Conversation, InsertConversation,
  messages, Message, InsertMessage,
  libraryResources, LibraryResource, InsertLibraryResource,
  libraryContacts, LibraryContact, InsertLibraryContact,
  libraryInfo, LibraryInfo, InsertLibraryInfo,
  userQueries, UserQuery, InsertUserQuery,
  documentChunks, DocumentChunk, InsertDocumentChunk,
  documentMetadata, DocumentMetadata, InsertDocumentMetadata
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

type MockState = {
  initialized: boolean;
  resources: LibraryResource[];
  contacts: LibraryContact[];
  info: LibraryInfo[];
  resourceId: number;
  contactId: number;
  infoId: number;
};

const mockState: MockState = {
  initialized: false,
  resources: [],
  contacts: [],
  info: [],
  resourceId: 0,
  contactId: 0,
  infoId: 0,
};

function ensureMockState() {
  if (mockState.initialized) return;
  const now = new Date();

  const seedResources: LibraryResource[] = [
    {
      id: ++mockState.resourceId,
      nameEn: "Electronic Library",
      nameUk: "Електронна бібліотека",
      nameRu: "Электронная библиотека",
      descriptionEn: "Access to digital textbooks, monographs, and educational materials (approximately 1400 documents) stored on Google Drive",
      descriptionUk: "Доступ до цифрових підручників, монографій та навчальних матеріалів (близько 1400 документів) на Google Drive",
      descriptionRu: "Доступ к цифровым учебникам, монографиям и учебным материалам (примерно 1400 документов) на Google Drive",
      type: "electronic_library",
      url: "https://drive.google.com/",
      keywords: ["textbooks", "monographs", "educational materials", "documents"],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: ++mockState.resourceId,
      nameEn: "KSAC Repository",
      nameUk: "Репозитарій KSAC",
      nameRu: "Репозиторий KSAC",
      descriptionEn: "Full-text publications by faculty members and qualification works of KSAC students",
      descriptionUk: "Повнотекстові видання викладачів та кваліфікаційні роботи здобувачів KSAC",
      descriptionRu: "Полнотекстовые издания преподавателей и квалификационные работы студентов KSAC",
      type: "repository",
      url: "https://repo.ksac.edu.sa/",
      keywords: ["research", "publications", "theses", "dissertations"],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: ++mockState.resourceId,
      nameEn: "Online Catalog",
      nameUk: "Електронний каталог",
      nameRu: "Электронный каталог",
      descriptionEn: "Search the traditional library collection including books, journals, and other printed materials",
      descriptionUk: "Пошук по традиційному фонду бібліотеки включаючи книги, журнали та інші друковані матеріали",
      descriptionRu: "Поиск по традиционному фонду библиотеки включая книги, журналы и другие печатные материалы",
      type: "catalog",
      url: "https://lib.ksac.edu.sa/catalog",
      keywords: ["catalog", "books", "journals", "search"],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: ++mockState.resourceId,
      nameEn: "Scopus Database",
      nameUk: "База даних Scopus",
      nameRu: "База данных Scopus",
      descriptionEn: "International abstract and citation database of peer-reviewed literature covering science, technology, medicine, and social sciences",
      descriptionUk: "Міжнародна база даних рефератів та цитувань рецензованої літератури з науки, технологій, медицини та соціальних наук",
      descriptionRu: "Международная база данных рефератов и цитирований рецензируемой литературы по науке, технологиям, медицине и социальным наукам",
      type: "database",
      url: "https://www.scopus.com/",
      keywords: ["international", "peer-reviewed", "science", "research"],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: ++mockState.resourceId,
      nameEn: "Web of Science",
      nameUk: "Web of Science",
      nameRu: "Web of Science",
      descriptionEn: "Multidisciplinary research platform providing access to peer-reviewed journals, conference proceedings, and other scholarly content",
      descriptionUk: "Мультидисциплінарна дослідницька платформа з доступом до рецензованих журналів, матеріалів конференцій та іншого наукового контенту",
      descriptionRu: "Мультидисциплинарная исследовательская платформа с доступом к рецензируемым журналам, материалам конференций и другому научному контенту",
      type: "database",
      url: "https://www.webofscience.com/",
      keywords: ["international", "multidisciplinary", "journals", "research"],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: ++mockState.resourceId,
      nameEn: "PubMed Central",
      nameUk: "PubMed Central",
      nameRu: "PubMed Central",
      descriptionEn: "Free full-text archive of biomedical and life sciences journal literature at the U.S. National Institutes of Health",
      descriptionUk: "Безкоштовний архів повнотекстових статей з біомедицини та наук про життя у Національних інститутах здоров'я США",
      descriptionRu: "Бесплатный архив полнотекстовых статей по биомедицине и наукам о жизни в Национальных институтах здоровья США",
      type: "database",
      url: "https://www.ncbi.nlm.nih.gov/pmc/",
      keywords: ["biomedical", "health sciences", "free", "full-text"],
      createdAt: now,
      updatedAt: now,
    },
  ];

  const seedContacts: LibraryContact[] = [
    {
      id: ++mockState.contactId,
      type: "email",
      value: "library@ksac.edu.sa",
      labelEn: "Library Email",
      labelUk: "Електронна пошта бібліотеки",
      labelRu: "Электронная почта библиотеки",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: ++mockState.contactId,
      type: "phone",
      value: "+966-11-XXXX-XXXX",
      labelEn: "Library Phone",
      labelUk: "Телефон бібліотеки",
      labelRu: "Телефон библиотеки",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: ++mockState.contactId,
      type: "address",
      value: "King Saud bin Abdulaziz University for Health Sciences, Riyadh, Saudi Arabia",
      labelEn: "Library Address",
      labelUk: "Адреса бібліотеки",
      labelRu: "Адрес библиотеки",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: ++mockState.contactId,
      type: "telegram",
      value: "https://t.me/ksac_library",
      labelEn: "Telegram Channel",
      labelUk: "Канал Telegram",
      labelRu: "Канал Telegram",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: ++mockState.contactId,
      type: "facebook",
      value: "https://www.facebook.com/ksac.library",
      labelEn: "Facebook Page",
      labelUk: "Сторінка Facebook",
      labelRu: "Страница Facebook",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: ++mockState.contactId,
      type: "instagram",
      value: "https://www.instagram.com/ksac_library",
      labelEn: "Instagram Account",
      labelUk: "Акаунт Instagram",
      labelRu: "Аккаунт Instagram",
      createdAt: now,
      updatedAt: now,
    },
  ];

  const seedInfo: LibraryInfo[] = [
    {
      id: ++mockState.infoId,
      key: "about",
      valueEn: "KSAC Library is a modern academic library serving the King Saud bin Abdulaziz University for Health Sciences community with comprehensive collections and services.",
      valueUk: "Бібліотека KSAC - це сучасна академічна бібліотека, яка обслуговує спільноту Університету медичних наук імені короля Сауда бін Абдулазіза з комплексними колекціями та послугами.",
      valueRu: "Библиотека KSAC - это современная академическая библиотека, обслуживающая сообщество Университета медицинских наук имени короля Сауда бин Абдулазиза с комплексными коллекциями и услугами.",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: ++mockState.infoId,
      key: "hours",
      valueEn: "Monday to Friday: 8:00 AM - 8:00 PM, Saturday: 10:00 AM - 6:00 PM, Sunday: Closed",
      valueUk: "Понеділок-п'ятниця: 8:00-20:00, Субота: 10:00-18:00, Неділя: Закрито",
      valueRu: "Понедельник-пятница: 8:00-20:00, Суббота: 10:00-18:00, Воскресенье: Закрыто",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: ++mockState.infoId,
      key: "thematic_search_form",
      valueEn: "https://forms.gle/example",
      valueUk: "https://forms.gle/example",
      valueRu: "https://forms.gle/example",
      createdAt: now,
      updatedAt: now,
    },
  ];

  mockState.resources = seedResources;
  mockState.contacts = seedContacts;
  mockState.info = seedInfo;
  mockState.initialized = true;
}

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Conversation helpers
export async function createConversation(userId: number, title: string, language: string): Promise<Conversation | null> {
  const db = await getDb();
  if (!db) return null;
  
  try {
    const result = await db.insert(conversations).values({
      userId,
      title,
      language: language as any,
    });
    
    // Get the last inserted ID
    const lastId = (result as any).insertId;
    if (lastId) {
      const created = await db.select().from(conversations).where(eq(conversations.id, lastId)).limit(1);
      return created[0] || null;
    }
    
    return null;
  } catch (error) {
    console.error("Error creating conversation:", error);
    return null;
  }
}

export async function getConversations(userId: number): Promise<Conversation[]> {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(conversations).where(eq(conversations.userId, userId));
}

export async function getConversation(conversationId: number): Promise<Conversation | null> {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(conversations).where(eq(conversations.id, conversationId)).limit(1);
  return result[0] || null;
}

// Message helpers
export async function createMessage(conversationId: number, role: 'user' | 'assistant', content: string): Promise<Message | null> {
  const db = await getDb();
  if (!db) return null;
  
  try {
    const result = await db.insert(messages).values({
      conversationId,
      role,
      content,
    });
    
    // Get the last inserted ID
    const lastId = (result as any).insertId;
    if (lastId) {
      const created = await db.select().from(messages).where(eq(messages.id, lastId)).limit(1);
      return created[0] || null;
    }
    
    return null;
  } catch (error) {
    console.error("Error creating message:", error);
    return null;
  }
}

export async function getMessages(conversationId: number): Promise<Message[]> {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(messages).where(eq(messages.conversationId, conversationId));
}

// Library Resource helpers
export async function getAllResources(): Promise<LibraryResource[]> {
  const db = await getDb();
  if (!db) {
    ensureMockState();
    return mockState.resources;
  }
  
  return db.select().from(libraryResources);
}

export async function searchResources(query: string): Promise<LibraryResource[]> {
  const db = await getDb();
  if (!db) {
    ensureMockState();
    const q = query.toLowerCase();
    return mockState.resources.filter(resource => {
      const fields = [
        resource.nameEn,
        resource.nameUk,
        resource.nameRu,
        resource.descriptionEn,
        resource.descriptionUk,
        resource.descriptionRu,
      ].filter(Boolean) as string[];
      return fields.some(field => field.toLowerCase().includes(q));
    });
  }
  
  return db.select().from(libraryResources).where(
    or(
      like(libraryResources.nameEn, `%${query}%`),
      like(libraryResources.nameUk, `%${query}%`),
      like(libraryResources.nameRu, `%${query}%`),
      like(libraryResources.descriptionEn, `%${query}%`),
      like(libraryResources.descriptionUk, `%${query}%`),
      like(libraryResources.descriptionRu, `%${query}%`)
    )
  );
}

export async function getResourcesByType(type: string): Promise<LibraryResource[]> {
  const db = await getDb();
  if (!db) {
    ensureMockState();
    return mockState.resources.filter(resource => resource.type === type);
  }
  
  return db.select().from(libraryResources).where(eq(libraryResources.type, type as any));
}

export async function createResource(resource: InsertLibraryResource): Promise<LibraryResource | null> {
  const db = await getDb();
  if (!db) {
    ensureMockState();
    const now = new Date();
    const created: LibraryResource = {
      id: ++mockState.resourceId,
      nameEn: resource.nameEn ?? "",
      nameUk: resource.nameUk ?? resource.nameEn ?? "",
      nameRu: resource.nameRu ?? resource.nameEn ?? "",
      descriptionEn: resource.descriptionEn ?? null,
      descriptionUk: resource.descriptionUk ?? null,
      descriptionRu: resource.descriptionRu ?? null,
      type: resource.type as LibraryResource["type"],
      url: resource.url ?? null,
      keywords: resource.keywords ?? null,
      createdAt: now,
      updatedAt: now,
    };
    mockState.resources.push(created);
    return created;
  }
  
  try {
    const result = await db.insert(libraryResources).values(resource);
    
    // Get the last inserted ID
    const lastId = (result as any).insertId;
    if (lastId) {
      const created = await db.select().from(libraryResources).where(eq(libraryResources.id, lastId)).limit(1);
      return created[0] || null;
    }
    
    return null;
  } catch (error) {
    console.error("Error creating resource:", error);
    return null;
  }
}

export async function updateResource(id: number, resource: Partial<InsertLibraryResource>): Promise<LibraryResource | null> {
  const db = await getDb();
  if (!db) {
    ensureMockState();
    const existing = mockState.resources.find(r => r.id === id);
    if (!existing) return null;
    const updated: LibraryResource = {
      ...existing,
      ...resource,
      id: existing.id,
      updatedAt: new Date(),
    };
    mockState.resources = mockState.resources.map(r => r.id === id ? updated : r);
    return updated;
  }
  
  try {
    await db.update(libraryResources).set(resource).where(eq(libraryResources.id, id));
    return db.select().from(libraryResources).where(eq(libraryResources.id, id)).limit(1).then(r => r[0] || null);
  } catch (error) {
    console.error("Error updating resource:", error);
    return null;
  }
}

export async function deleteResource(id: number): Promise<boolean> {
  const db = await getDb();
  if (!db) {
    ensureMockState();
    const before = mockState.resources.length;
    mockState.resources = mockState.resources.filter(r => r.id !== id);
    return mockState.resources.length < before;
  }
  
  try {
    await db.delete(libraryResources).where(eq(libraryResources.id, id));
    return true;
  } catch (error) {
    console.error("Error deleting resource:", error);
    return false;
  }
}

// Library Contact helpers
export async function getAllContacts(): Promise<LibraryContact[]> {
  const db = await getDb();
  if (!db) {
    ensureMockState();
    return mockState.contacts;
  }
  
  return db.select().from(libraryContacts);
}

export async function createContact(contact: InsertLibraryContact): Promise<LibraryContact | null> {
  const db = await getDb();
  if (!db) {
    ensureMockState();
    const now = new Date();
    const created: LibraryContact = {
      id: ++mockState.contactId,
      type: contact.type as LibraryContact["type"],
      value: contact.value ?? "",
      labelEn: contact.labelEn ?? null,
      labelUk: contact.labelUk ?? null,
      labelRu: contact.labelRu ?? null,
      createdAt: now,
      updatedAt: now,
    };
    mockState.contacts.push(created);
    return created;
  }
  
  try {
    const result = await db.insert(libraryContacts).values(contact);
    
    // Get the last inserted ID
    const lastId = (result as any).insertId;
    if (lastId) {
      const created = await db.select().from(libraryContacts).where(eq(libraryContacts.id, lastId)).limit(1);
      return created[0] || null;
    }
    
    return null;
  } catch (error) {
    console.error("Error creating contact:", error);
    return null;
  }
}

export async function updateContact(id: number, contact: Partial<InsertLibraryContact>): Promise<LibraryContact | null> {
  const db = await getDb();
  if (!db) {
    ensureMockState();
    const existing = mockState.contacts.find(c => c.id === id);
    if (!existing) return null;
    const updated: LibraryContact = {
      ...existing,
      ...contact,
      id: existing.id,
      updatedAt: new Date(),
    };
    mockState.contacts = mockState.contacts.map(c => c.id === id ? updated : c);
    return updated;
  }
  
  try {
    await db.update(libraryContacts).set(contact).where(eq(libraryContacts.id, id));
    return db.select().from(libraryContacts).where(eq(libraryContacts.id, id)).limit(1).then(r => r[0] || null);
  } catch (error) {
    console.error("Error updating contact:", error);
    return null;
  }
}

export async function deleteContact(id: number): Promise<boolean> {
  const db = await getDb();
  if (!db) {
    ensureMockState();
    const before = mockState.contacts.length;
    mockState.contacts = mockState.contacts.filter(c => c.id !== id);
    return mockState.contacts.length < before;
  }
  
  try {
    await db.delete(libraryContacts).where(eq(libraryContacts.id, id));
    return true;
  } catch (error) {
    console.error("Error deleting contact:", error);
    return false;
  }
}

// Library Info helpers
export async function getLibraryInfo(key: string): Promise<LibraryInfo | null> {
  const db = await getDb();
  if (!db) {
    ensureMockState();
    return mockState.info.find(item => item.key === key) ?? null;
  }
  
  const result = await db.select().from(libraryInfo).where(eq(libraryInfo.key, key)).limit(1);
  return result[0] || null;
}

export async function setLibraryInfo(key: string, valueEn: string, valueUk: string, valueRu: string): Promise<LibraryInfo | null> {
  const db = await getDb();
  if (!db) {
    ensureMockState();
    const existing = mockState.info.find(item => item.key === key);
    const now = new Date();
    if (existing) {
      const updated: LibraryInfo = {
        ...existing,
        valueEn,
        valueUk,
        valueRu,
        updatedAt: now,
      };
      mockState.info = mockState.info.map(item => item.key === key ? updated : item);
      return updated;
    }
    const created: LibraryInfo = {
      id: ++mockState.infoId,
      key,
      valueEn,
      valueUk,
      valueRu,
      createdAt: now,
      updatedAt: now,
    };
    mockState.info.push(created);
    return created;
  }
  
  try {
    const existing = await getLibraryInfo(key);
    
    if (existing) {
      await db.update(libraryInfo).set({ valueEn, valueUk, valueRu }).where(eq(libraryInfo.key, key));
      return db.select().from(libraryInfo).where(eq(libraryInfo.key, key)).limit(1).then(r => r[0] || null);
    } else {
      const result = await db.insert(libraryInfo).values({ key, valueEn, valueUk, valueRu });
      const lastId = (result as any).insertId;
      if (lastId) {
        const created = await db.select().from(libraryInfo).where(eq(libraryInfo.id, lastId)).limit(1);
        return created[0] || null;
      }
      return null;
    }
  } catch (error) {
    console.error("Error setting library info:", error);
    return null;
  }
}

// User Query logging
export async function logUserQuery(userId: number | null, conversationId: number | null, query: string, language: string, resourcesReturned: any = null): Promise<UserQuery | null> {
  const db = await getDb();
  if (!db) return null;
  
  try {
    const result = await db.insert(userQueries).values({
      userId,
      conversationId,
      query,
      language: language as any,
      resourcesReturned: resourcesReturned ? JSON.stringify(resourcesReturned) : null,
    });
    
    // Get the last inserted ID
    const lastId = (result as any).insertId;
    if (lastId) {
      const created = await db.select().from(userQueries).where(eq(userQueries.id, lastId)).limit(1);
      return created[0] || null;
    }
    
    return null;
  } catch (error) {
    console.error("Error logging user query:", error);
    return null;
  }
}


// Document Chunks functions
export async function createDocumentChunk(chunk: InsertDocumentChunk): Promise<DocumentChunk | null> {
  const db = await getDb();
  if (!db) return null;
  
  try {
    const result = await db.insert(documentChunks).values(chunk);
    const lastId = (result as any).insertId;
    if (lastId) {
      const created = await db.select().from(documentChunks).where(eq(documentChunks.id, lastId)).limit(1);
      return created[0] || null;
    }
    return null;
  } catch (error) {
    console.error("Error creating document chunk:", error);
    return null;
  }
}

export async function getDocumentChunks(language?: string): Promise<DocumentChunk[]> {
  const db = await getDb();
  if (!db) return [];
  
  try {
    if (language) {
      return await db.select().from(documentChunks).where(eq(documentChunks.language, language as any));
    }
    return await db.select().from(documentChunks);
  } catch (error) {
    console.error("Error getting document chunks:", error);
    return [];
  }
}

export async function getDocumentChunksByDocument(documentId: string): Promise<DocumentChunk[]> {
  const db = await getDb();
  if (!db) return [];
  
  try {
    return await db.select().from(documentChunks).where(eq(documentChunks.documentId, documentId));
  } catch (error) {
    console.error("Error getting document chunks by document:", error);
    return [];
  }
}

// Document Metadata functions
export async function createDocumentMetadata(metadata: InsertDocumentMetadata): Promise<DocumentMetadata | null> {
  const db = await getDb();
  if (!db) return null;
  
  try {
    const result = await db.insert(documentMetadata).values(metadata);
    const lastId = (result as any).insertId;
    if (lastId) {
      const created = await db.select().from(documentMetadata).where(eq(documentMetadata.id, lastId)).limit(1);
      return created[0] || null;
    }
    return null;
  } catch (error) {
    console.error("Error creating document metadata:", error);
    return null;
  }
}

export async function getDocumentMetadata(documentId: string): Promise<DocumentMetadata | null> {
  const db = await getDb();
  if (!db) return null;
  
  try {
    const result = await db.select().from(documentMetadata).where(eq(documentMetadata.documentId, documentId)).limit(1);
    return result[0] || null;
  } catch (error) {
    console.error("Error getting document metadata:", error);
    return null;
  }
}

export async function updateDocumentMetadata(documentId: string, updates: Partial<InsertDocumentMetadata>): Promise<DocumentMetadata | null> {
  const db = await getDb();
  if (!db) return null;
  
  try {
    await db.update(documentMetadata).set(updates).where(eq(documentMetadata.documentId, documentId));
    return getDocumentMetadata(documentId);
  } catch (error) {
    console.error("Error updating document metadata:", error);
    return null;
  }
}

export async function getAllDocumentMetadata(): Promise<DocumentMetadata[]> {
  const db = await getDb();
  if (!db) return [];
  
  try {
    return await db.select().from(documentMetadata);
  } catch (error) {
    console.error("Error getting all document metadata:", error);
    return [];
  }
}

export async function deleteDocumentChunks(documentId: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  try {
    await db.delete(documentChunks).where(eq(documentChunks.documentId, documentId));
    return true;
  } catch (error) {
    console.error("Error deleting document chunks:", error);
    return false;
  }
}
