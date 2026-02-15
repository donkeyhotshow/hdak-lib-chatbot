import { db } from "../../db";
import { conversations, messages, libraryInfo, libraryResources } from "@shared/schema";
import { eq, desc } from "drizzle-orm";

export interface IChatStorage {
  getConversation(id: number): Promise<typeof conversations.$inferSelect | undefined>;
  getAllConversations(): Promise<(typeof conversations.$inferSelect)[]>;
  createConversation(title: string): Promise<typeof conversations.$inferSelect>;
  deleteConversation(id: number): Promise<void>;
  getMessagesByConversation(conversationId: number): Promise<(typeof messages.$inferSelect)[]>;
  createMessage(conversationId: number, role: string, content: string): Promise<typeof messages.$inferSelect>;
  getLibraryInfo(): Promise<(typeof libraryInfo.$inferSelect)[]>;
  getLibraryResources(): Promise<(typeof libraryResources.$inferSelect)[]>;
  seedLibraryData(): Promise<void>;
}

export const chatStorage: IChatStorage = {
  async getConversation(id: number) {
    const [conversation] = await db.select().from(conversations).where(eq(conversations.id, id));
    return conversation;
  },

  async getAllConversations() {
    return db.select().from(conversations).orderBy(desc(conversations.createdAt));
  },

  async createConversation(title: string) {
    const [conversation] = await db.insert(conversations).values({ title }).returning();
    return conversation;
  },

  async deleteConversation(id: number) {
    await db.delete(messages).where(eq(messages.conversationId, id));
    await db.delete(conversations).where(eq(conversations.id, id));
  },

  async getMessagesByConversation(conversationId: number) {
    return db.select().from(messages).where(eq(messages.conversationId, conversationId)).orderBy(messages.createdAt);
  },

  async createMessage(conversationId: number, role: string, content: string) {
    const [message] = await db.insert(messages).values({ conversationId, role, content }).returning();
    return message;
  },

  async getLibraryInfo() {
    return db.select().from(libraryInfo);
  },

  async getLibraryResources() {
    return db.select().from(libraryResources);
  },

  async seedLibraryData() {
    const info = await db.select().from(libraryInfo);
    if (info.length === 0) {
      await db.insert(libraryInfo).values([
        { key: "address", value: "вул. Бурсацький узвіз, 4, Харків, Україна", category: "contacts" },
        { key: "email", value: "library@hdak.edu.ua", category: "contacts" },
        { key: "working_hours", value: "Пн-Пт: 9:00 - 17:00, Сб-Нд: Вихідний", category: "hours" },
        { key: "rules", value: "Користування бібліотекою безкоштовне для студентів та викладачів ХДАК.", category: "rules" }
      ]);
    }

    const resources = await db.select().from(libraryResources);
    if (resources.length === 0) {
      await db.insert(libraryResources).values([
        { name: "Офіційний сайт", url: "https://lib-hdak.in.ua/", description: "Головна сторінка бібліотеки" },
        { name: "Електронний каталог", url: "https://library-service.com.ua:8443/khkhdak/DocumentSearchForm", description: "Пошук книг та документів" },
        { name: "Інституційний репозитарій", url: "http://repo.hdak.edu.ua/", description: "Наукові праці викладачів та студентів" }
      ]);
    }
  }
};

