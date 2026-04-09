import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, generateFingerprint } from "@/lib/rate-limit";
import { searchCatalog, CATALOG_FORM_URL } from "@/lib/catalog-search";
import { isForbiddenOrigin } from "@/lib/cors";

const UDC_RE = /^[\d.]+$/;

export async function GET(request: NextRequest) {
  // CORS check
  if (isForbiddenOrigin(request)) {
    return NextResponse.json({ error: "Заборонене джерело" }, { status: 403 });
  }

  // Rate limiting
  const fingerprint = generateFingerprint(request);
  if (!(await checkRateLimit(fingerprint))) {
    return NextResponse.json({ error: "Забагато запитів" }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");
  const author = searchParams.get("author");
  const title = searchParams.get("title");
  const udc = searchParams.get("udc");
  const subject = searchParams.get("subject");
  const keyword = searchParams.get("keyword");
  const page = searchParams.get("page");

  if (!query && !author && !title && !udc && !subject && !keyword) {
    return NextResponse.json(
      {
        error:
          "Вкажіть параметр пошуку: q, author, title, udc, subject або keyword",
        catalogUrl: CATALOG_FORM_URL,
      },
      { status: 400 }
    );
  }

  // Validate UDC — only digits and dots
  if (udc !== null && !UDC_RE.test(udc)) {
    return NextResponse.json(
      {
        error:
          "Невалідний УДК: допустимі лише цифри та крапки (наприклад: 78.01)",
        catalogUrl: CATALOG_FORM_URL,
      },
      { status: 400 }
    );
  }

  const pageNum = Math.max(1, parseInt(page || "1", 10) || 1);

  try {
    let searchTerm: string;
    let searchType:
      | "title"
      | "author"
      | "general"
      | "udc"
      | "subject"
      | "keyword";

    if (udc) {
      searchTerm = udc;
      searchType = "udc";
    } else if (subject) {
      searchTerm = subject;
      searchType = "subject";
    } else if (keyword) {
      searchTerm = keyword;
      searchType = "keyword";
    } else if (author) {
      searchTerm = author;
      searchType = "author";
    } else if (title) {
      searchTerm = title;
      searchType = "title";
    } else {
      searchTerm = query!;
      searchType = "general";
    }

    const result = await searchCatalog(searchTerm, searchType, 10, pageNum);
    const { books, total, unavailable } = result;

    if (unavailable) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Каталог тимчасово недоступний. Спробуйте пізніше або скористайтесь прямим посиланням.",
          catalogUrl: CATALOG_FORM_URL,
        },
        { status: 503 }
      );
    }

    return NextResponse.json({
      success: true,
      searchTerm,
      searchField: searchType,
      totalResults: total,
      currentPage: pageNum,
      books,
      catalogUrl: CATALOG_FORM_URL,
      message:
        books.length > 0
          ? `Знайдено ${total} документів. Показано ${books.length}.`
          : "За вашим запитом нічого не знайдено в каталозі.",
    });
  } catch (error) {
    console.error("Помилка пошуку в каталозі:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Помилка пошуку в каталозі",
        catalogUrl: CATALOG_FORM_URL,
      },
      { status: 500 }
    );
  }
}
