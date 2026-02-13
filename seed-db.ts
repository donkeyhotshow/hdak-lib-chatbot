import { drizzle } from "drizzle-orm/mysql2";
import {
  libraryResources,
  libraryContacts,
  libraryInfo,
} from "./drizzle/schema";

const db = drizzle(process.env.DATABASE_URL!);

async function seed() {
  console.log("Starting database seed...");

  try {
    // Seed library resources
    console.log("Seeding library resources...");
    
    const resources = [
      {
        nameEn: "Electronic Library",
        nameUk: "Електронна бібліотека",
        nameRu: "Электронная библиотека",
        descriptionEn: "Access to digital textbooks, monographs, and educational materials (approximately 1400 documents) stored on Google Drive",
        descriptionUk: "Доступ до цифрових підручників, монографій та навчальних матеріалів (близько 1400 документів) на Google Drive",
        descriptionRu: "Доступ к цифровым учебникам, монографиям и учебным материалам (примерно 1400 документов) на Google Drive",
        type: "electronic_library" as const,
        url: "https://drive.google.com/",
        keywords: JSON.stringify(["textbooks", "monographs", "educational materials", "documents"]),
      },
      {
        nameEn: "KSAC Repository",
        nameUk: "Репозитарій KSAC",
        nameRu: "Репозиторий KSAC",
        descriptionEn: "Full-text publications by faculty members and qualification works of KSAC students",
        descriptionUk: "Повнотекстові видання викладачів та кваліфікаційні роботи здобувачів KSAC",
        descriptionRu: "Полнотекстовые издания преподавателей и квалификационные работы студентов KSAC",
        type: "repository" as const,
        url: "https://repo.ksac.edu.sa/",
        keywords: JSON.stringify(["research", "publications", "theses", "dissertations"]),
      },
      {
        nameEn: "Online Catalog",
        nameUk: "Електронний каталог",
        nameRu: "Электронный каталог",
        descriptionEn: "Search the traditional library collection including books, journals, and other printed materials",
        descriptionUk: "Пошук по традиційному фонду бібліотеки включаючи книги, журнали та інші друковані матеріали",
        descriptionRu: "Поиск по традиционному фонду библиотеки включая книги, журналы и другие печатные материалы",
        type: "catalog" as const,
        url: "https://lib.ksac.edu.sa/catalog",
        keywords: JSON.stringify(["catalog", "books", "journals", "search"]),
      },
      {
        nameEn: "Scopus Database",
        nameUk: "База даних Scopus",
        nameRu: "База данных Scopus",
        descriptionEn: "International abstract and citation database of peer-reviewed literature covering science, technology, medicine, and social sciences",
        descriptionUk: "Міжнародна база даних рефератів та цитувань рецензованої літератури з науки, технологій, медицини та соціальних наук",
        descriptionRu: "Международная база данных рефератов и цитирований рецензируемой литературы по науке, технологиям, медицине и социальным наукам",
        type: "database" as const,
        url: "https://www.scopus.com/",
        keywords: JSON.stringify(["international", "peer-reviewed", "science", "research"]),
      },
      {
        nameEn: "Web of Science",
        nameUk: "Web of Science",
        nameRu: "Web of Science",
        descriptionEn: "Multidisciplinary research platform providing access to peer-reviewed journals, conference proceedings, and other scholarly content",
        descriptionUk: "Мультидисциплінарна дослідницька платформа з доступом до рецензованих журналів, матеріалів конференцій та іншого наукового контенту",
        descriptionRu: "Мультидисциплинарная исследовательская платформа с доступом к рецензируемым журналам, материалам конференций и другому научному контенту",
        type: "database" as const,
        url: "https://www.webofscience.com/",
        keywords: JSON.stringify(["international", "multidisciplinary", "journals", "research"]),
      },
      {
        nameEn: "PubMed Central",
        nameUk: "PubMed Central",
        nameRu: "PubMed Central",
        descriptionEn: "Free full-text archive of biomedical and life sciences journal literature at the U.S. National Institutes of Health",
        descriptionUk: "Безкоштовний архів повнотекстових статей з біомедицини та наук про життя у Національних інститутах здоров'я США",
        descriptionRu: "Бесплатный архив полнотекстовых статей по биомедицине и наукам о жизни в Национальных институтах здоровья США",
        type: "database" as const,
        url: "https://www.ncbi.nlm.nih.gov/pmc/",
        keywords: JSON.stringify(["biomedical", "health sciences", "free", "full-text"]),
      },
    ];

    for (const resource of resources) {
      await db.insert(libraryResources).values(resource);
    }
    console.log(`✓ Seeded ${resources.length} library resources`);

    // Seed library contacts
    console.log("Seeding library contacts...");
    
    const contacts = [
      {
        type: "email" as const,
        value: "library@ksac.edu.sa",
        labelEn: "Library Email",
        labelUk: "Електронна пошта бібліотеки",
        labelRu: "Электронная почта библиотеки",
      },
      {
        type: "phone" as const,
        value: "+966-11-XXXX-XXXX",
        labelEn: "Library Phone",
        labelUk: "Телефон бібліотеки",
        labelRu: "Телефон библиотеки",
      },
      {
        type: "address" as const,
        value: "King Saud bin Abdulaziz University for Health Sciences, Riyadh, Saudi Arabia",
        labelEn: "Library Address",
        labelUk: "Адреса бібліотеки",
        labelRu: "Адрес библиотеки",
      },
      {
        type: "telegram" as const,
        value: "https://t.me/ksac_library",
        labelEn: "Telegram Channel",
        labelUk: "Канал Telegram",
        labelRu: "Канал Telegram",
      },
      {
        type: "facebook" as const,
        value: "https://www.facebook.com/ksac.library",
        labelEn: "Facebook Page",
        labelUk: "Сторінка Facebook",
        labelRu: "Страница Facebook",
      },
      {
        type: "instagram" as const,
        value: "https://www.instagram.com/ksac_library",
        labelEn: "Instagram Account",
        labelUk: "Акаунт Instagram",
        labelRu: "Аккаунт Instagram",
      },
    ];

    for (const contact of contacts) {
      await db.insert(libraryContacts).values(contact);
    }
    console.log(`✓ Seeded ${contacts.length} library contacts`);

    // Seed library info
    console.log("Seeding library information...");
    
    const libraryInfoData = [
      {
        key: "about",
        valueEn: "KSAC Library is a modern academic library serving the King Saud bin Abdulaziz University for Health Sciences community with comprehensive collections and services.",
        valueUk: "Бібліотека KSAC - це сучасна академічна бібліотека, яка обслуговує спільноту Університету медичних наук імені короля Сауда бін Абдулазіза з комплексними колекціями та послугами.",
        valueRu: "Библиотека KSAC - это современная академическая библиотека, обслуживающая сообщество Университета медицинских наук имени короля Сауда бин Абдулазиза с комплексными коллекциями и услугами.",
      },
      {
        key: "hours",
        valueEn: "Monday to Friday: 8:00 AM - 8:00 PM, Saturday: 10:00 AM - 6:00 PM, Sunday: Closed",
        valueUk: "Понеділок-п'ятниця: 8:00-20:00, Субота: 10:00-18:00, Неділя: Закрито",
        valueRu: "Понедельник-пятница: 8:00-20:00, Суббота: 10:00-18:00, Воскресенье: Закрыто",
      },
      {
        key: "thematic_search_form",
        valueEn: "https://forms.gle/example",
        valueUk: "https://forms.gle/example",
        valueRu: "https://forms.gle/example",
      },
    ];

    for (const info of libraryInfoData) {
      await db.insert(libraryInfo).values(info);
    }
    console.log(`✓ Seeded ${libraryInfoData.length} library info entries`);

    console.log("\n✅ Database seed completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    process.exit(1);
  }
}

seed();
