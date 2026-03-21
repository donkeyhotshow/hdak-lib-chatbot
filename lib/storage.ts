import { db, conversations, messages, libraryInfo, libraryResources } from "./db";
import { eq, desc } from "drizzle-orm";

export const chatStorage = {
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
    const info = await db.select().from(libraryInfo);
    if (info.length === 0) {
      await db.insert(libraryInfo).values([
        {
          key: "address",
          value_uk: "вул. Бурсацький узвіз, 4, Харків, 61057, Україна",
          value_en: "4 Bursatsky Descent, Kharkiv, 61057, Ukraine",
          category: "contacts",
          source: "library",
        },
        {
          key: "phone",
          value_uk: "+38 (057) 707-53-35",
          value_en: "+38 (057) 707-53-35",
          category: "contacts",
          source: "library",
        },
        {
          key: "email",
          value_uk: "library@hdak.edu.ua",
          value_en: "library@hdak.edu.ua",
          category: "contacts",
          source: "library",
        },
        {
          key: "hours",
          value_uk: "Понеділок – П'ятниця: 9:00–17:00. Субота та неділя — вихідні.",
          value_en: "Monday – Friday: 9:00–17:00. Saturday and Sunday are days off.",
          category: "hours",
          source: "library",
        },
        {
          key: "rules",
          value_uk: "Користування бібліотекою безкоштовне для студентів, аспірантів та викладачів ХДАК. Для запису потрібен студентський квиток або посвідчення співробітника. Книги видаються на термін, встановлений бібліотекарем.",
          value_en: "Library services are free for HDAK students, postgraduates, and staff. A student ID or staff card is required for registration.",
          category: "rules",
          source: "library",
        },
        {
          key: "services",
          value_uk: "Послуги: видача книг додому, читальний зал, доступ до електронного каталогу, інституційного репозитарію, консультації бібліотекаря. Міжбібліотечний абонемент — лише за попередньою домовленістю.",
          value_en: "Services: home lending, reading room, access to electronic catalog, institutional repository, librarian consultations. Interlibrary loan by prior arrangement only.",
          category: "services",
          source: "library",
        },
        {
          key: "about",
          value_uk: "Наукова бібліотека Харківської державної академії культури (ХДАК) — структурний підрозділ академії. Забезпечує доступ до наукової, навчальної та методичної літератури для студентів і викладачів.",
          value_en: "The Scientific Library of Kharkiv State Academy of Culture (HDAK) is a structural unit of the academy providing access to academic, educational and methodological literature.",
          category: "general",
          source: "library",
        },
      ]);
    }

    const resources = await db.select().from(libraryResources);
    if (resources.length === 0) {
      await db.insert(libraryResources).values([
        {
          name: "Офіційний сайт бібліотеки",
          type: "site",
          url: "https://lib-hdak.in.ua/",
          description_uk: "Головна сторінка бібліотеки ХДАК. Новини, анонси заходів, загальна інформація.",
          description_en: "HDAK Library main website. News, events, general information.",
          is_official: true,
          requires_auth: false,
        },
        {
          name: "Електронний каталог",
          type: "catalog",
          url: "https://library-service.com.ua:8443/khkhdak/DocumentSearchForm",
          description_uk: "Пошук книг, журналів та інших документів у фонді бібліотеки ХДАК. Для пошуку введіть автора, назву або ключові слова.",
          description_en: "Search books, journals and other documents in the HDAK library collection.",
          is_official: true,
          requires_auth: false,
        },
        {
          name: "Інституційний репозитарій",
          type: "repository",
          url: "http://repo.hdak.edu.ua/",
          description_uk: "Відкритий архів наукових праць, дисертацій, монографій та статей викладачів і студентів ХДАК. Доступний без реєстрації.",
          description_en: "Open archive of scientific papers, dissertations, monographs by HDAK faculty and students. No registration required.",
          is_official: true,
          requires_auth: false,
        },
      ]);
    }
  },
};
