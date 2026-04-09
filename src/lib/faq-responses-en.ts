/**
 * English FAQ responses for HDAK Library chatbot.
 * Mirrors the Ukrainian FAQ_RESPONSES structure.
 */

import { LIBRARY, ALL_LINKS, isLibraryOpen } from "./constants";

export interface FaqResponse {
  content: string | (() => string);
  thinkDelay: number;
  charsPerStep: number;
  stepDelay: number;
}

export const FAQ_RESPONSES_EN: Record<string, FaqResponse> = {
  // ─── Library hours ────────────────────────────────────────────
  "What are the library hours?": {
    content: () =>
      [
        `Here are the current opening hours of the HDAK Library:`,
        ``,
        `| Day | Hours |`,
        `|-----|-------|`,
        `| Monday – Friday | **9:00 – 16:45** _(lunch break 13:00–13:45)_ |`,
        `| Saturday | **9:00 – 13:30** |`,
        `| Sunday | closed |`,
        ``,
        `> ⚠️ **Sanitary day** — last Friday of each month _(lending desks closed)_`,
        ``,
        isLibraryOpen()
          ? `🟢 **The library is open right now** — come visit us!`
          : `🔴 **The library is currently closed.** Please visit during working hours.`,
        ``,
        `📍 ${LIBRARY.addressEn}`,
        ``,
        `_Feel free to ask if you have any other questions._`,
      ].join("\n"),
    thinkDelay: 0,
    charsPerStep: 5,
    stepDelay: 12,
  },

  // ─── How to register ─────────────────────────────────────────
  "How to register at the library?": {
    content: [
      `Registering at the HDAK Library is quick and easy. Here's what you need:`,
      ``,
      `**Required documents:**`,
      `- 🪪 Student ID or passport`,
      `- 📷 One passport-size photo (3×4 cm)`,
      ``,
      `**Registration steps:**`,
      ``,
      `1. Visit the **lending desk** (building 1, ground floor) or the **reading room**`,
      `2. Fill in a **reader registration form** — takes just a few minutes`,
      `3. Receive your **library card** — you're now a registered reader!`,
      ``,
      `> ⏱ The whole process takes **10–15 minutes**.`,
      ``,
      `**Library services are free** for HDAK students, faculty, and staff.`,
      ``,
      `---`,
      ``,
      `📞 Phone: **${LIBRARY.phoneFull}**`,
      `📧 Email: **${LIBRARY.email}**`,
      ``,
      `_Don't hesitate to reach out if you have questions._`,
    ].join("\n"),
    thinkDelay: 0,
    charsPerStep: 5,
    stepDelay: 12,
  },

  // ─── How to find a book ───────────────────────────────────────
  "How to find a book in the catalog?": {
    content: [
      `Finding a book in our catalog is easy. Here are your options:`,
      ``,
      `**🖥️ Online catalog (recommended):**`,
      ``,
      `1. Go to: [Electronic Catalog](${ALL_LINKS.catalog_search})`,
      `2. Enter the **book title**, **author's name**, or a **keyword**`,
      `3. Click "Search" and select the item from the results`,
      ``,
      `> 💡 **Tip:** if you can't find by title, try searching by **author** or **subject**.`,
      ``,
      `**📱 Mobile app:**`,
      `Search on the go — [download for Android](${ALL_LINKS.mobile_app}).`,
      ``,
      `**📚 New acquisitions:**`,
      `Want to see what's new? Browse [new arrivals](${ALL_LINKS.new_books}).`,
      ``,
      `**📚 Academic publications:**`,
      `For HDAK faculty research — [repository](${ALL_LINKS.repository}).`,
      ``,
      `---`,
      ``,
      `_Can't find what you're looking for? Tell me the title or topic and I'll try to help._`,
    ].join("\n"),
    thinkDelay: 0,
    charsPerStep: 5,
    stepDelay: 12,
  },

  // ─── Contacts ─────────────────────────────────────────────────
  "What are the library contacts?": {
    content: [
      `Here are all the ways to reach the HDAK Library:`,
      ``,
      `**📍 Address:**`,
      `${LIBRARY.addressEn}`,
      `_(near "Istorychny Muzey" metro station)_`,
      ``,
      `---`,
      ``,
      `**📞 Phone:** [${LIBRARY.phoneFull}](tel:${LIBRARY.phoneFull.replace(/[\s()\-]/g, "")})`,
      ``,
      `**📧 Email:** [${LIBRARY.email}](mailto:${LIBRARY.email})`,
      ``,
      `**💬 Viber / Telegram:** [${LIBRARY.messenger}](https://t.me/+${LIBRARY.messenger.replace("+", "")})`,
      ``,
      `---`,
      ``,
      `**🌐 Social media:**`,
      `- [Instagram](${LIBRARY.instagram}) — news, exhibitions, events`,
      `- [Facebook Messenger](${LIBRARY.facebook}) — quick questions online`,
      `- [Telegram](${ALL_LINKS.telegram}) — messenger contact`,
      ``,
      `**🏫 Official website:** [lib-hdak.in.ua](${ALL_LINKS.main})`,
      ``,
      `---`,
      ``,
      `_Choose the most convenient way — we're always happy to help!_`,
    ].join("\n"),
    thinkDelay: 0,
    charsPerStep: 5,
    stepDelay: 12,
  },

  // ─── Library rules ────────────────────────────────────────────
  "What are the library rules?": {
    content: [
      `Here are the key rules every HDAK Library reader should know:`,
      ``,
      `**👤 Who can use the library:**`,
      `HDAK students, faculty, and staff. Service requires a **library card** — all services are **free**.`,
      ``,
      `---`,
      ``,
      `**📖 Borrowing rules:**`,
      `- Return books **on time**`,
      `- Handle materials **carefully**: no writing, no folding pages`,
      `- **Lost or damaged** items must be replaced`,
      ``,
      `**🔇 In reading rooms:**`,
      `- Maintain **silence** and respect other readers`,
      `- Keep your phone on **silent mode**`,
      `- **Food and drinks** are not allowed`,
      ``,
      `**🗓 Sanitary day:**`,
      `Last Friday of the month — lending desks are closed.`,
      ``,
      `---`,
      ``,
      `📄 [Full library rules](${ALL_LINKS.rules})`,
      `📄 [E-reading room rules](${ALL_LINKS.rules_eroom})`,
      ``,
      `_Following the rules ensures a comfortable experience for everyone. Thank you!_`,
    ].join("\n"),
    thinkDelay: 0,
    charsPerStep: 5,
    stepDelay: 12,
  },

  // ─── Electronic resources ─────────────────────────────────────
  "What electronic resources are available?": {
    content: [
      `The HDAK Library provides access to a wide range of electronic resources:`,
      ``,
      `**🔬 International academic databases:**`,
      `_(access via HDAK network or by contacting a librarian)_`,
      ``,
      `- [Scopus](${ALL_LINKS.scopus}) — largest abstract and citation database`,
      `- [Web of Science](${ALL_LINKS.wos}) — leading scientometric platform`,
      `- [ScienceDirect](${ALL_LINKS.sciencedirect}) — full-text Elsevier journals`,
      `- [Springer Nature](${ALL_LINKS.springer}) — Springer books and journals`,
      `- [Research4Life](${ALL_LINKS.research4life}) — open access for Ukraine`,
      ``,
      `**📚 Ukrainian and open-access resources:**`,
      `- [Digital Library of Culture](${ALL_LINKS.elib_culture}) — subject-specific materials`,
      `- [UkrINTEI](${ALL_LINKS.ukrintei}) — scientific and technical information`,
      `- [DOAJ](${ALL_LINKS.doaj}) — open-access peer-reviewed journals`,
      ``,
      `**🏛 HDAK Library resources:**`,
      `- [HDAK Repository](${ALL_LINKS.repository}) — faculty research publications`,
      `- [New acquisitions](${ALL_LINKS.new_books}) — latest additions to the collection`,
      `- [Virtual exhibitions](${ALL_LINKS.exhibitions}) — thematic collections`,
      `- [Useful links](${ALL_LINKS.helpful_links}) — curated resource directory`,
      ``,
      `---`,
      ``,
      `> 💡 For access to paid databases — contact a librarian or use the **HDAK network**.`,
      ``,
      `_Need help finding academic information? Just ask — I'm here to help._`,
    ].join("\n"),
    thinkDelay: 0,
    charsPerStep: 5,
    stepDelay: 12,
  },
};
