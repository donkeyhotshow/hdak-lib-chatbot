import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, generateFingerprint } from "@/lib/rate-limit";
import { searchCatalog, getCatalogFormUrl } from "@/lib/catalog-search";
import { isForbiddenOrigin } from "@/lib/cors";
import { logger } from "@/lib/logger";

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
        catalogUrl: getCatalogFormUrl(),
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
        catalogUrl: getCatalogFormUrl(),
      },
      { status: 400 }
    );
  }

  const pageNum = Math.min(
    10000,
    Math.max(1, Number.parseInt(page || "1", 10) || 1)
  );
  const selectedTerm =
    udc || subject || keyword || author || title || query || "";
  if (
    selectedTerm.length > 200 ||
    /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(selectedTerm)
  ) {
    return NextResponse.json(
      {
        error: "Параметр пошуку має некоректний формат",
        catalogUrl: getCatalogFormUrl(),
      },
      { status: 400 }
    );
  }

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
          catalogUrl: getCatalogFormUrl(),
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
      catalogUrl: getCatalogFormUrl(),
      message:
        books.length > 0
          ? `Знайдено ${total} документів. Показано ${books.length}.`
          : "За вашим запитом нічого не знайдено в каталозі.",
    });
  } catch (error) {
    logger.error(
      "Помилка пошуку в каталозі",
      error instanceof Error ? error : new Error(String(error))
    );
    return NextResponse.json(
      {
        success: false,
        error: "Помилка пошуку в каталозі",
        catalogUrl: getCatalogFormUrl(),
      },
      { status: 500 }
    );
  }
}
