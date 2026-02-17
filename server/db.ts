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
  if (!db) return [];
  
  return db.select().from(libraryResources);
}

export async function searchResources(query: string): Promise<LibraryResource[]> {
  const db = await getDb();
  if (!db) return [];
  
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
  if (!db) return [];
  
  return db.select().from(libraryResources).where(eq(libraryResources.type, type as any));
}

export async function createResource(resource: InsertLibraryResource): Promise<LibraryResource | null> {
  const db = await getDb();
  if (!db) return null;
  
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
  if (!db) return null;
  
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
  if (!db) return false;
  
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
  if (!db) return [];
  
  return db.select().from(libraryContacts);
}

export async function createContact(contact: InsertLibraryContact): Promise<LibraryContact | null> {
  const db = await getDb();
  if (!db) return null;
  
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
  if (!db) return null;
  
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
  if (!db) return false;
  
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
  if (!db) return null;
  
  const result = await db.select().from(libraryInfo).where(eq(libraryInfo.key, key)).limit(1);
  return result[0] || null;
}

export async function setLibraryInfo(key: string, valueEn: string, valueUk: string, valueRu: string): Promise<LibraryInfo | null> {
  const db = await getDb();
  if (!db) return null;
  
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
