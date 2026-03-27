import { db, conversations, messages, libraryInfo, libraryResources } from "./db";
import { eq, desc } from "drizzle-orm";
import { LIBRARY } from "./constants";

export const chatStorage = {
  async getConversation(id: number) {
    const [conversation] = await db.select().from(conversations).where(eq(conversations.id, id));
    return conversation;
  },

  async getAllConversations() {
    return db.select().from(conversations).orderBy(desc(conversations.createdAt)).limit(50);
  },

  async createConversation(title: string) {
    const [conversation] = await db.insert(conversations).values({ title }).returning();
    return conversation;
  },

  async updateConversationTitle(id: number, title: string) {
    await db.update(conversations).set({ title }).where(eq(conversations.id, id));
  },

  async deleteConversation(id: number) {
    await db.transaction(async (tx) => {
      await tx.delete(messages).where(eq(messages.conversationId, id));
      await tx.delete(conversations).where(eq(conversations.id, id));
    });
  },

  async getMessagesByConversation(conversationId: number) {
    return db.select().from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt);
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
    const infoCount = await db.select().from(libraryInfo);
    if (infoCount.length === 0) {
      await db.insert(libraryInfo).values([
        {
          key: "address",
          value_uk: "61057, м. Харків, Бурсацький узвіз, 4 (біля ст. метро «Історичний музей»)",
          value_en: "4 Bursatsky Descent, Kharkiv, 61057, Ukraine",
          category: "contacts",
          source: "library",
        },
        {
          key: "phone",
          value_uk: "(057) 731-27-83",
          value_en: "+38 (057) 731-27-83",
          category: "contacts",
          source: "library",
        },
        {
          key: "email",
          value_uk: LIBRARY.email,
          value_en: LIBRARY.email,
          category: "contacts",
          source: "library",
        },
        {
          key: "hours",
          value_uk: "Пн-Пт: 9:00–16:45 (перерва 13:00–13:45), Сб: 9:00–13:30. Нд — вихідний. Останній четвер місяця — санітарний день.",
          value_en: "Mon-Fri: 9:00–16:45 (break 13:00–13:45), Sat: 9:00–13:30. Sun — closed. Last Thursday of the month — cleaning day.",
          category: "hours",
          source: "library",
        },
        {
          key: "messenger",
          value_uk: "Viber/Telegram: +380661458484, Instagram: @hdak_lib",
          value_en: "Viber/Telegram: +380661458484, Instagram: @hdak_lib",
          category: "contacts",
          source: "library",
        },
        {
          key: "rules",
          value_uk: "Для запису потрібен паспорт та студентський квиток (для студентів ХДАК). Обслуговування проводиться у відділах абонемента та читальних залах.",
          value_en: "Passport and student ID required for registration. Services provided in circulation and reading rooms.",
          category: "rules",
          source: "library",
        }
      ]);
    }

    const resourcesList = await db.select().from(libraryResources);
    if (resourcesList.length === 0) {
      await db.insert(libraryResources).values([
        {
          name: "Офіційний сайт бібліотеки",
          type: "site",
          url: "https://lib-hdak.in.ua/",
          description_uk: "Актуальні новини, заходи та доступ до е-ресурсів бібліотеки ХДАК.",
          description_en: "HDAK Library main website.",
          is_official: true,
          requires_auth: false,
        },
        {
          name: "Електронний каталог",
          type: "catalog",
          url: "https://library-service.com.ua:8443/khkhdak/DocumentSearchForm",
          description_uk: "Пошук книг у фондах бібліотеки через веб-інтерфейс.",
          description_en: "Search books in library collections.",
          is_official: true,
          requires_auth: false,
        },
        {
          name: "Інституційний репозитарій (eKhSACIR)",
          type: "repository",
          url: "https://repository.ac.kharkov.ua/",
          description_uk: "Відкритий цифровий архів наукових та творчих праць академічної спільноти ХДАК.",
          description_en: "Institutional repository of HDAK.",
          is_official: true,
          requires_auth: false,
        },
      ]);
    }
  },
};
