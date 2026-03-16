import { eq, like, or, and, lt, asc, desc, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  conversations,
  Conversation,
  InsertConversation,
  messages,
  Message,
  InsertMessage,
  libraryResources,
  LibraryResource,
  InsertLibraryResource,
  libraryContacts,
  LibraryContact,
  InsertLibraryContact,
  libraryInfo,
  LibraryInfo,
  InsertLibraryInfo,
  userQueries,
  UserQuery,
  InsertUserQuery,
  documentChunks,
  DocumentChunk,
  InsertDocumentChunk,
  documentMetadata,
  DocumentMetadata,
  InsertDocumentMetadata,
} from "../../drizzle/schema";
import { ENV } from "./_core/env";
import { logger } from "./_core/logger";

let _db: ReturnType<typeof drizzle> | null = null;

type MockState = {
  initialized: boolean;
  resources: LibraryResource[];
  contacts: LibraryContact[];
  info: LibraryInfo[];
  conversations: Conversation[];
  messages: Message[];
  resourceId: number;
  contactId: number;
  infoId: number;
  conversationId: number;
  messageId: number;
};

const mockState: MockState = {
  initialized: false,
  resources: [],
  contacts: [],
  info: [],
  conversations: [],
  messages: [],
  resourceId: 1,
  contactId: 1,
  infoId: 1,
  conversationId: 1,
  messageId: 1,
};

// Mock state is only used in single-process test runs, so simple counters are sufficient.
const nextResourceId = () => mockState.resourceId++;
const nextContactId = () => mockState.contactId++;
const nextInfoId = () => mockState.infoId++;
const nextConversationId = () => mockState.conversationId++;
const nextMessageId = () => mockState.messageId++;
// Extract only mutable fields to avoid overwriting immutable identifiers or timestamps during mock updates.
const getMutableFields = <
  T extends { id?: unknown; createdAt?: unknown; type?: unknown },
>(
  value: T
) => {
  const {
    id: _id,
    createdAt: _createdAt,
    type: _type,
    ...mutableFields
  } = value;
  return mutableFields;
};
const applyResourceNameDefaults = (resource: InsertLibraryResource) => ({
  nameEn: resource.nameEn ?? "",
  nameUk: resource.nameUk ?? resource.nameEn ?? "",
  nameRu: resource.nameRu ?? resource.nameEn ?? "",
});

function ensureMockState() {
  if (mockState.initialized) return;
  const now = new Date();

  const seedResources: LibraryResource[] = [
    {
      id: nextResourceId(),
      nameEn: "Electronic Catalog",
      nameUk: "Електронний каталог",
      nameRu: "Электронный каталог",
      descriptionEn:
        "Search HDAK library holdings by author, title, or subject. Started in 1997 on CDS/ISIS, migrated to AIBIS UFD/Library in 2008. The first Ukrainian e-catalog of music editions was created here.",
      descriptionUk:
        "Пошук документів бібліотечного фонду ХДАК за автором, назвою, тематикою. Розпочато у 1997 р. на базі CDS/ISIS, з 2008 р. — АІБС «УФД/Бібліотека».",
      descriptionRu:
        "Поиск документов библиотечного фонда ХГАК по автору, названию, тематике. Начат в 1997 г. на базе CDS/ISIS, с 2008 г. — АИБС «УФД/Библиотека».",
      type: "catalog",
      url: "https://lib-hdak.in.ua/e-catalog.html",
      keywords: ["catalog", "books", "journals", "search", "каталог", "книги"],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: nextResourceId(),
      nameEn: "HDAK Institutional Repository",
      nameUk: "Інституційний репозитарій ХДАК",
      nameRu: "Институциональный репозиторий ХГАК",
      descriptionEn:
        "Full-text publications by HDAK scholars: textbooks, monographs, articles, qualification works, educational materials. Launched on 29 March 2019. Open access.",
      descriptionUk:
        "Повнотекстові публікації учених академії: підручники, монографії, статті, кваліфікаційні роботи, навчально-методичні матеріали. Введено в дію 29 березня 2019 р.",
      descriptionRu:
        "Полнотекстовые публикации учёных академии: учебники, монографии, статьи, квалификационные работы. Запущен 29 марта 2019 г.",
      type: "repository",
      url: "https://lib-hdak.in.ua/scientists-publications.html",
      keywords: [
        "repository",
        "publications",
        "theses",
        "репозитарій",
        "публікації",
      ],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: nextResourceId(),
      nameEn: "Electronic Library 'Culture of Ukraine'",
      nameUk: "Електронна бібліотека «Культура України»",
      nameRu: "Электронная библиотека «Культура Украины»",
      descriptionEn:
        "Resource of the National Parliamentary Library of Ukraine with full-text publications. Open access.",
      descriptionUk:
        "Ресурс Національної парламентської бібліотеки України з повнотекстовими виданнями. Відкритий доступ.",
      descriptionRu:
        "Ресурс Национальной парламентской библиотеки Украины с полнотекстовыми изданиями. Открытый доступ.",
      type: "electronic_library",
      url: "https://lib-hdak.in.ua/helpful-links.html",
      keywords: [
        "culture",
        "Ukraine",
        "digital library",
        "культура",
        "бібліотека",
      ],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: nextResourceId(),
      nameEn: "Scopus",
      nameUk: "Scopus",
      nameRu: "Scopus",
      descriptionEn:
        "International abstract and citation database. HDAK scholars have 13 articles in Scopus. Corporate access (academy network or VPN only).",
      descriptionUk:
        "Міжнародна наукометрична база даних анотацій та цитувань. Публікації вчених ХДАК у Scopus: 13 статей. Корпоративний доступ (лише з мережі академії або через VPN).",
      descriptionRu:
        "Международная наукометрическая база данных. Публикации учёных ХГАК в Scopus: 13 статей. Корпоративный доступ (только из сети академии или через VPN).",
      type: "database",
      url: "https://lib-hdak.in.ua/search-scientific-info.html",
      keywords: [
        "Scopus",
        "citations",
        "international",
        "VPN",
        "corporate access",
      ],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: nextResourceId(),
      nameEn: "Web of Science",
      nameUk: "Web of Science",
      nameRu: "Web of Science",
      descriptionEn:
        "International citation index. HDAK scholars have 10 articles in Web of Science. Corporate access (academy network or VPN only).",
      descriptionUk:
        "Міжнародна наукометрична база даних. Публікації вчених ХДАК у Web of Science: 10 статей. Корпоративний доступ (лише з мережі академії або через VPN).",
      descriptionRu:
        "Международная наукометрическая база данных. Публикации учёных ХГАК в Web of Science: 10 статей. Корпоративный доступ.",
      type: "database",
      url: "https://lib-hdak.in.ua/search-scientific-info.html",
      keywords: ["Web of Science", "citations", "international", "VPN"],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: nextResourceId(),
      nameEn: "ScienceDirect (Elsevier)",
      nameUk: "ScienceDirect (Elsevier)",
      nameRu: "ScienceDirect (Elsevier)",
      descriptionEn:
        "Full-text articles from Elsevier scientific journals. Corporate access (academy network or VPN only).",
      descriptionUk:
        "Повнотекстові статті наукових журналів видавництва Elsevier. Корпоративний доступ (лише з мережі академії або через VPN).",
      descriptionRu:
        "Полнотекстовые статьи журналов Elsevier. Корпоративный доступ (только из сети академии или через VPN).",
      type: "database",
      url: "https://lib-hdak.in.ua/search-scientific-info.html",
      keywords: ["Elsevier", "ScienceDirect", "journals", "VPN"],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: nextResourceId(),
      nameEn: "Springer Link",
      nameUk: "Springer Link",
      nameRu: "Springer Link",
      descriptionEn:
        "Full-text resources from Springer portal: journals, books, conference proceedings. Corporate access (academy network or VPN only).",
      descriptionUk:
        "Повнотекстові ресурси порталу Springer: журнали, книги, протоколи конференцій. Корпоративний доступ (лише з мережі академії або через VPN).",
      descriptionRu:
        "Полнотекстовые ресурсы портала Springer. Корпоративный доступ.",
      type: "database",
      url: "https://lib-hdak.in.ua/search-scientific-info.html",
      keywords: ["Springer", "journals", "books", "VPN"],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: nextResourceId(),
      nameEn: "Research 4 Life",
      nameUk: "Research 4 Life",
      nameRu: "Research 4 Life",
      descriptionEn:
        "International programme providing access to scientific and medical literature for educational institutions. Corporate access.",
      descriptionUk:
        "Міжнародна програма доступу до наукової та медичної літератури для закладів освіти. Корпоративний доступ.",
      descriptionRu:
        "Международная программа доступа к научной и медицинской литературе. Корпоративный доступ.",
      type: "database",
      url: "https://lib-hdak.in.ua/search-scientific-info.html",
      keywords: ["Research 4 Life", "medical", "scientific literature"],
      createdAt: now,
      updatedAt: now,
    },
  ];

  const seedContacts: LibraryContact[] = [
    {
      id: nextContactId(),
      type: "email",
      value: "library@hdak.edu.ua",
      labelEn: "Library Email",
      labelUk: "Електронна пошта бібліотеки",
      labelRu: "Электронная почта библиотеки",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: nextContactId(),
      type: "address",
      value: "вул. Бурсацький узвіз, 4, Харків, Україна",
      labelEn: "Library Address",
      labelUk: "Адреса бібліотеки",
      labelRu: "Адрес библиотеки",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: nextContactId(),
      type: "other",
      value: "https://lib-hdak.in.ua/",
      labelEn: "Official Website",
      labelUk: "Офіційний сайт",
      labelRu: "Официальный сайт",
      createdAt: now,
      updatedAt: now,
    },
  ];

  const seedInfo: LibraryInfo[] = [
    {
      id: nextInfoId(),
      key: "about",
      valueEn:
        "HDAK Library (Kharkiv State Academy of Culture) is one of the oldest and largest libraries in Kharkiv with a rich collection of documents. It provides access to an electronic catalog, institutional repository, and international scientific databases.",
      valueUk:
        "Бібліотека ХДАК (Харківська державна академія культури) — одна з найстаріших та найбільших бібліотек Харкова з багатим фондом документів. Надає доступ до електронного каталогу, інституційного репозитарію та міжнародних наукових баз даних.",
      valueRu:
        "Библиотека ХДАК (Харьковская государственная академия культуры) — одна из старейших и крупнейших библиотек Харькова с богатым фондом документов. Предоставляет доступ к электронному каталогу, институциональному репозиторию и международным научным базам данных.",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: nextInfoId(),
      key: "hours",
      valueEn: "Monday to Friday: 9:00 AM - 5:00 PM, Saturday–Sunday: Closed",
      valueUk: "Понеділок–п'ятниця: 9:00–17:00, Субота–неділя: Вихідний",
      valueRu: "Понедельник–пятница: 9:00–17:00, Суббота–воскресенье: Выходной",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: nextInfoId(),
      key: "address",
      valueEn: "Bursatskyi Uzviz St., 4, Kharkiv, Ukraine",
      valueUk: "вул. Бурсацький узвіз, 4, Харків, Україна",
      valueRu: "ул. Бурсацкий узвоз, 4, Харьков, Украина",
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
  const databaseUrl = ENV.databaseUrl || process.env.DATABASE_URL || "";
  if (!_db && databaseUrl) {
    const url = databaseUrl;
    if (!url.startsWith("mysql://") && !url.startsWith("mysql2://")) {
      logger.warn(
        "[Database] DATABASE_URL is not a MySQL URL — running without database",
        { url: url.replace(/:\/\/[^@]+@/, "://<credentials>@") }
      );
      return null;
    }
    try {
      _db = drizzle(url);
    } catch (error) {
      logger.warn("[Database] Failed to connect", {
        error: error instanceof Error ? error.message : String(error),
      });
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
    logger.warn("[Database] Cannot upsert user: database not available");
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
      values.role = "admin";
      updateSet.role = "admin";
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
    logger.error("[Database] Failed to upsert user", {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    logger.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Conversation helpers
export async function createConversation(
  userId: number,
  title: string,
  language: string
): Promise<Conversation | null> {
  const db = await getDb();
  if (!db) {
    const now = new Date();
    const conv: Conversation = {
      id: nextConversationId(),
      userId,
      title,
      language: language as Conversation["language"],
      createdAt: now,
      updatedAt: now,
    };
    mockState.conversations.push(conv);
    return conv;
  }

  try {
    const result = await db.insert(conversations).values({
      userId,
      title,
      language: language as any,
    });

    // Get the last inserted ID
    const lastId = (result as any).insertId;
    if (lastId) {
      const created = await db
        .select()
        .from(conversations)
        .where(eq(conversations.id, lastId))
        .limit(1);
      return created[0] || null;
    }

    return null;
  } catch (error) {
    logger.error("[Database] Error creating conversation:", {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export async function getConversations(
  userId: number
): Promise<Conversation[]> {
  const db = await getDb();
  if (!db) {
    return mockState.conversations
      .filter(c => c.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  return db
    .select()
    .from(conversations)
    .where(eq(conversations.userId, userId))
    .orderBy(desc(conversations.createdAt));
}

export async function getConversation(
  conversationId: number
): Promise<Conversation | null> {
  const db = await getDb();
  if (!db) {
    return mockState.conversations.find(c => c.id === conversationId) ?? null;
  }

  const result = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, conversationId))
    .limit(1);
  return result[0] || null;
}

export async function deleteConversation(
  conversationId: number
): Promise<boolean> {
  const db = await getDb();
  if (!db) {
    const idx = mockState.conversations.findIndex(c => c.id === conversationId);
    if (idx === -1) return false;
    mockState.conversations.splice(idx, 1);
    mockState.messages = mockState.messages.filter(
      m => m.conversationId !== conversationId
    );
    return true;
  }

  try {
    // Wrap in a transaction to ensure both deletes succeed or both fail,
    // preventing orphaned messages if the conversation delete were to fail
    // after messages were already removed.
    const result = await db.transaction(async tx => {
      await tx
        .delete(messages)
        .where(eq(messages.conversationId, conversationId));
      return tx
        .delete(conversations)
        .where(eq(conversations.id, conversationId));
    });
    return (result as any).affectedRows > 0;
  } catch (error) {
    logger.error("[Database] Error deleting conversation:", {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

/**
 * Delete conversations (and their messages) that are older than `days` days.
 * Intended for scheduled garbage-collection in autonomous / "deploy-and-forget" mode.
 * Returns the number of conversations removed.
 */
export async function clearOldConversations(
  days: number = 30
): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  try {
    // Find IDs of conversations older than the cutoff date
    const old = await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(lt(conversations.createdAt, cutoff));

    if (old.length === 0) return 0;

    const ids = old.map(r => r.id);

    // Batch-delete messages and conversations atomically inside a transaction.
    const result = await db.transaction(async tx => {
      await tx.delete(messages).where(inArray(messages.conversationId, ids));
      return tx.delete(conversations).where(inArray(conversations.id, ids));
    });
    const deleted = (result as any).affectedRows ?? ids.length;

    logger.info("[Database] clearOldConversations: removed old conversations", {
      days,
      removed: deleted,
    });
    return deleted;
  } catch (error) {
    logger.error("[Database] Error in clearOldConversations:", {
      error: error instanceof Error ? error.message : String(error),
    });
    return 0;
  }
}

// Message helpers
export async function createMessage(
  conversationId: number,
  role: "user" | "assistant",
  content: string
): Promise<Message | null> {
  const db = await getDb();
  if (!db) {
    const msg: Message = {
      id: nextMessageId(),
      conversationId,
      role,
      content,
      createdAt: new Date(),
    };
    mockState.messages.push(msg);
    return msg;
  }

  try {
    const result = await db.insert(messages).values({
      conversationId,
      role,
      content,
    });

    // Get the last inserted ID
    const lastId = (result as any).insertId;
    if (lastId) {
      const created = await db
        .select()
        .from(messages)
        .where(eq(messages.id, lastId))
        .limit(1);
      return created[0] || null;
    }

    return null;
  } catch (error) {
    logger.error("[Database] Error creating message:", {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export async function getMessages(conversationId: number): Promise<Message[]> {
  const db = await getDb();
  if (!db) {
    return mockState.messages
      .filter(m => m.conversationId === conversationId)
      .sort((a, b) => a.id - b.id);
  }

  return db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(asc(messages.id));
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

export async function getResourceByUrl(
  url: string
): Promise<LibraryResource | null> {
  const db = await getDb();
  if (!db) {
    ensureMockState();
    return mockState.resources.find(r => r.url === url) ?? null;
  }

  try {
    const result = await db
      .select()
      .from(libraryResources)
      .where(eq(libraryResources.url, url))
      .limit(1);
    return result[0] ?? null;
  } catch (error) {
    logger.error("[Database] Error getting resource by URL", {
      error: String(error),
      url,
    });
    return null;
  }
}

export async function searchResources(
  query: string
): Promise<LibraryResource[]> {
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
      ].filter((value): value is string => value != null);
      // Mock data set is small; normalize strings per search for clarity.
      const normalizedFields = fields.map(field => field.toLowerCase());
      return normalizedFields.some(field => field.includes(q));
    });
  }

  // Escape LIKE wildcard characters so that user input like "%" or "_" is
  // matched literally rather than acting as a SQL wildcard pattern.
  const escapedQuery = query
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_");

  return db
    .select()
    .from(libraryResources)
    .where(
      or(
        like(libraryResources.nameEn, `%${escapedQuery}%`),
        like(libraryResources.nameUk, `%${escapedQuery}%`),
        like(libraryResources.nameRu, `%${escapedQuery}%`),
        like(libraryResources.descriptionEn, `%${escapedQuery}%`),
        like(libraryResources.descriptionUk, `%${escapedQuery}%`),
        like(libraryResources.descriptionRu, `%${escapedQuery}%`)
      )
    );
}

export async function getResourcesByType(
  type: string
): Promise<LibraryResource[]> {
  const db = await getDb();
  if (!db) {
    ensureMockState();
    return mockState.resources.filter(resource => resource.type === type);
  }

  return db
    .select()
    .from(libraryResources)
    .where(eq(libraryResources.type, type as any));
}

export async function createResource(
  resource: InsertLibraryResource
): Promise<LibraryResource | null> {
  const db = await getDb();
  if (!db) {
    ensureMockState();
    const now = new Date();
    const names = applyResourceNameDefaults(resource);
    const created: LibraryResource = {
      id: nextResourceId(),
      ...names,
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
      const created = await db
        .select()
        .from(libraryResources)
        .where(eq(libraryResources.id, lastId))
        .limit(1);
      return created[0] || null;
    }

    return null;
  } catch (error) {
    logger.error("[Database] Error creating resource:", {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export async function updateResource(
  id: number,
  resource: Partial<InsertLibraryResource>
): Promise<LibraryResource | null> {
  const db = await getDb();
  if (!db) {
    ensureMockState();
    const existing = mockState.resources.find(r => r.id === id);
    if (!existing) return null;
    const mutableFields = getMutableFields(resource);
    const updated: LibraryResource = {
      ...existing,
      ...mutableFields,
      updatedAt: new Date(),
    };
    mockState.resources = mockState.resources.map(r =>
      r.id === id ? updated : r
    );
    return updated;
  }

  try {
    await db
      .update(libraryResources)
      .set(resource)
      .where(eq(libraryResources.id, id));
    return db
      .select()
      .from(libraryResources)
      .where(eq(libraryResources.id, id))
      .limit(1)
      .then(r => r[0] || null);
  } catch (error) {
    logger.error("[Database] Error updating resource:", {
      error: error instanceof Error ? error.message : String(error),
    });
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
    const result = await db
      .delete(libraryResources)
      .where(eq(libraryResources.id, id));
    return (result as any).affectedRows > 0;
  } catch (error) {
    logger.error("[Database] Error deleting resource:", {
      error: error instanceof Error ? error.message : String(error),
    });
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

export async function createContact(
  contact: InsertLibraryContact
): Promise<LibraryContact | null> {
  const db = await getDb();
  if (!db) {
    ensureMockState();
    const now = new Date();
    const created: LibraryContact = {
      id: nextContactId(),
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
      const created = await db
        .select()
        .from(libraryContacts)
        .where(eq(libraryContacts.id, lastId))
        .limit(1);
      return created[0] || null;
    }

    return null;
  } catch (error) {
    logger.error("[Database] Error creating contact:", {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export async function updateContact(
  id: number,
  contact: Partial<InsertLibraryContact>
): Promise<LibraryContact | null> {
  const db = await getDb();
  if (!db) {
    ensureMockState();
    const existing = mockState.contacts.find(c => c.id === id);
    if (!existing) return null;
    const mutableFields = getMutableFields(contact);
    const updated: LibraryContact = {
      ...existing,
      ...mutableFields,
      updatedAt: new Date(),
    };
    mockState.contacts = mockState.contacts.map(c =>
      c.id === id ? updated : c
    );
    return updated;
  }

  try {
    await db
      .update(libraryContacts)
      .set(contact)
      .where(eq(libraryContacts.id, id));
    return db
      .select()
      .from(libraryContacts)
      .where(eq(libraryContacts.id, id))
      .limit(1)
      .then(r => r[0] || null);
  } catch (error) {
    logger.error("[Database] Error updating contact:", {
      error: error instanceof Error ? error.message : String(error),
    });
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
    const result = await db
      .delete(libraryContacts)
      .where(eq(libraryContacts.id, id));
    return (result as any).affectedRows > 0;
  } catch (error) {
    logger.error("[Database] Error deleting contact:", {
      error: error instanceof Error ? error.message : String(error),
    });
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

  const result = await db
    .select()
    .from(libraryInfo)
    .where(eq(libraryInfo.key, key))
    .limit(1);
  return result[0] || null;
}

export async function setLibraryInfo(
  key: string,
  valueEn: string,
  valueUk: string,
  valueRu: string
): Promise<LibraryInfo | null> {
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
      mockState.info = mockState.info.map(item =>
        item.key === key ? updated : item
      );
      return updated;
    }
    const created: LibraryInfo = {
      id: nextInfoId(),
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
      await db
        .update(libraryInfo)
        .set({ valueEn, valueUk, valueRu })
        .where(eq(libraryInfo.key, key));
      return db
        .select()
        .from(libraryInfo)
        .where(eq(libraryInfo.key, key))
        .limit(1)
        .then(r => r[0] || null);
    } else {
      const result = await db
        .insert(libraryInfo)
        .values({ key, valueEn, valueUk, valueRu });
      const lastId = (result as any).insertId;
      if (lastId) {
        const created = await db
          .select()
          .from(libraryInfo)
          .where(eq(libraryInfo.id, lastId))
          .limit(1);
        return created[0] || null;
      }
      return null;
    }
  } catch (error) {
    logger.error("[Database] Error setting library info:", {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export async function getAllLibraryInfo(): Promise<LibraryInfo[]> {
  const db = await getDb();
  if (!db) {
    ensureMockState();
    return [...mockState.info];
  }
  return await db.select().from(libraryInfo);
}

// User Query logging
export async function logUserQuery(
  userId: number | null,
  conversationId: number | null,
  query: string,
  language: string,
  resourcesReturned: any = null
): Promise<UserQuery | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db.insert(userQueries).values({
      userId,
      conversationId,
      query,
      language: language as any,
      resourcesReturned: resourcesReturned
        ? JSON.stringify(resourcesReturned)
        : null,
    });

    // Get the last inserted ID
    const lastId = (result as any).insertId;
    if (lastId) {
      const created = await db
        .select()
        .from(userQueries)
        .where(eq(userQueries.id, lastId))
        .limit(1);
      return created[0] || null;
    }

    return null;
  } catch (error) {
    logger.error("[Database] Error logging user query:", {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

// Document Chunks functions
export async function createDocumentChunk(
  chunk: InsertDocumentChunk
): Promise<DocumentChunk | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db.insert(documentChunks).values(chunk);
    const lastId = (result as any).insertId;
    if (lastId) {
      const created = await db
        .select()
        .from(documentChunks)
        .where(eq(documentChunks.id, lastId))
        .limit(1);
      return created[0] || null;
    }
    return null;
  } catch (error) {
    logger.error("[Database] Error creating document chunk:", {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export async function getDocumentChunks(
  language?: string
): Promise<DocumentChunk[]> {
  const db = await getDb();
  if (!db) return [];

  /** Cap in-memory vector search at 600 most-recent chunks per language.
   * When language is provided the query filters first, then limits; when omitted the
   * limit is applied across all languages. */
  const CHUNK_LIMIT = 600;

  try {
    if (language) {
      return await db
        .select()
        .from(documentChunks)
        .where(eq(documentChunks.language, language as any))
        .orderBy(desc(documentChunks.createdAt))
        .limit(CHUNK_LIMIT);
    }
    return await db
      .select()
      .from(documentChunks)
      .orderBy(desc(documentChunks.createdAt))
      .limit(CHUNK_LIMIT);
  } catch (error) {
    logger.error("[Database] Error getting document chunks:", {
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

export async function getDocumentChunksByDocument(
  documentId: string
): Promise<DocumentChunk[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    return await db
      .select()
      .from(documentChunks)
      .where(eq(documentChunks.documentId, documentId));
  } catch (error) {
    logger.error("[Database] Error getting document chunks by document:", {
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

// Document Metadata functions
export async function createDocumentMetadata(
  metadata: InsertDocumentMetadata
): Promise<DocumentMetadata | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db.insert(documentMetadata).values(metadata);
    const lastId = (result as any).insertId;
    if (lastId) {
      const created = await db
        .select()
        .from(documentMetadata)
        .where(eq(documentMetadata.id, lastId))
        .limit(1);
      return created[0] || null;
    }
    return null;
  } catch (error) {
    logger.error("[Database] Error creating document metadata:", {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export async function getDocumentMetadata(
  documentId: string
): Promise<DocumentMetadata | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db
      .select()
      .from(documentMetadata)
      .where(eq(documentMetadata.documentId, documentId))
      .limit(1);
    return result[0] || null;
  } catch (error) {
    logger.error("[Database] Error getting document metadata:", {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export async function updateDocumentMetadata(
  documentId: string,
  updates: Partial<InsertDocumentMetadata>
): Promise<DocumentMetadata | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    await db
      .update(documentMetadata)
      .set(updates)
      .where(eq(documentMetadata.documentId, documentId));
    return getDocumentMetadata(documentId);
  } catch (error) {
    logger.error("[Database] Error updating document metadata:", {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export async function getAllDocumentMetadata(): Promise<DocumentMetadata[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    return await db.select().from(documentMetadata);
  } catch (error) {
    logger.error("[Database] Error getting all document metadata:", {
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

export async function deleteDocumentChunks(
  documentId: string
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    await db
      .delete(documentChunks)
      .where(eq(documentChunks.documentId, documentId));
    return true;
  } catch (error) {
    logger.error("[Database] Error deleting document chunks:", {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

// Analytics helpers
export async function getQueryAnalytics(limit = 20): Promise<{
  topQueries: { query: string; count: number }[];
  languageBreakdown: { language: string; count: number }[];
  totalQueries: number;
}> {
  const db = await getDb();
  if (!db) {
    return { topQueries: [], languageBreakdown: [], totalQueries: 0 };
  }

  /** Cap the rows pulled into memory to prevent OOM on large deployments. */
  const ANALYTICS_ROW_LIMIT = 10_000;

  try {
    const rows = await db
      .select()
      .from(userQueries)
      .orderBy(desc(userQueries.createdAt))
      .limit(ANALYTICS_ROW_LIMIT);
    const totalQueries = rows.length;

    // Compute top queries by frequency
    const queryCounts: Record<string, number> = {};
    const langCounts: Record<string, number> = {};
    for (const row of rows) {
      const q = row.query.trim().toLowerCase();
      queryCounts[q] = (queryCounts[q] ?? 0) + 1;
      langCounts[row.language] = (langCounts[row.language] ?? 0) + 1;
    }

    const topQueries = Object.entries(queryCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([query, count]) => ({ query, count }));

    const languageBreakdown = Object.entries(langCounts).map(
      ([language, count]) => ({
        language,
        count,
      })
    );

    return { topQueries, languageBreakdown, totalQueries };
  } catch (error) {
    logger.error("[Database] Error getting query analytics", {
      error: String(error),
    });
    return { topQueries: [], languageBreakdown: [], totalQueries: 0 };
  }
}
