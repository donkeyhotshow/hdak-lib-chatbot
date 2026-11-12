import {
  BookOpen,
  Clock,
  ClipboardList,
  Globe,
  MapPin,
  Search,
} from "lucide-react";

export type ChatLocale = "uk" | "en";

export const QUICK_MENU = {
  uk: [
    { id: "schedule", title: "Графік роботи", icon: Clock, kw: "Який графік роботи бібліотеки?" },
    { id: "register", title: "Як записатися", icon: ClipboardList, kw: "Як записатися до бібліотеки?" },
    { id: "catalog", title: "Каталог", icon: Search, kw: "Як знайти книгу в каталозі?" },
    { id: "contacts", title: "Контакти", icon: MapPin, kw: "Які контакти бібліотеки?" },
    { id: "rules", title: "Правила", icon: BookOpen, kw: "Які правила користування бібліотекою?" },
    { id: "resources", title: "Ресурси", icon: Globe, kw: "Які електронні ресурси доступні?" },
  ],
  en: [
    { id: "schedule", title: "Library hours", icon: Clock, kw: "What are the library hours?" },
    { id: "register", title: "How to register", icon: ClipboardList, kw: "How to register at the library?" },
    { id: "catalog", title: "Catalog", icon: Search, kw: "How to find a book in the catalog?" },
    { id: "contacts", title: "Contacts", icon: MapPin, kw: "What are the library contacts?" },
    { id: "rules", title: "Rules", icon: BookOpen, kw: "What are the library rules?" },
    { id: "resources", title: "Resources", icon: Globe, kw: "What electronic resources are available?" },
  ],
} as const;

export function getSuggestions(content: string, locale: ChatLocale): string[] {
  const normalized = content.toLowerCase();

  if (locale === "en") {
    if (/schedule|hours|working|open/i.test(normalized)) {
      return ["How to register at the library?", "What are the library contacts?"];
    }
    if (/book|author|catalog|title|find/i.test(normalized)) {
      return ["How to find a book in the catalog?", "What electronic resources are available?"];
    }
    if (/research|thesis|scopus|repository|science/i.test(normalized)) {
      return ["What electronic resources are available?", "How to find a book in the catalog?"];
    }
    if (/register|membership|card/i.test(normalized)) {
      return ["What are the library hours?", "What are the library contacts?"];
    }
    return ["How to find a book in the catalog?", "What are the library hours?", "What are the library contacts?"];
  }

  if (/графік|розклад|години|відкри|зачин/i.test(normalized)) {
    return ["Як записатися до бібліотеки?", "Які контакти бібліотеки?"];
  }
  if (/книг|автор|каталог|видання|збірник|підручник|поезі|знайд/i.test(normalized)) {
    return ["Як знайти книгу в каталозі?", "Які електронні ресурси доступні?"];
  }
  if (/наук|стат|дисертац|scopus|research|репозитар/i.test(normalized)) {
    return ["Які електронні ресурси доступні?", "Як знайти книгу в каталозі?"];
  }
  if (/запис|квиток|реєстрац/i.test(normalized)) {
    return ["Який графік роботи бібліотеки?", "Які контакти бібліотеки?"];
  }
  if (/контакт|телефон|email|адрес/i.test(normalized)) {
    return ["Який графік роботи бібліотеки?", "Як записатися до бібліотеки?"];
  }
  return ["Як знайти книгу в каталозі?", "Який графік роботи бібліотеки?", "Які контакти бібліотеки?"];
}
