import { NextRequest, NextResponse } from "next/server";
import {
  checkRateLimit,
  generateFingerprint,
  rateLimitResponse,
} from "@/lib/rate-limit";
import { searchCatalog, getCatalogFormUrl } from "@/lib/catalog-search";
import { isForbiddenOrigin } from "@/lib/cors";
import { logger } from "@/lib/logger";
import { CatalogSearchParamsSchema } from "@/lib/validation";

export async function GET(request: NextRequest) {
  // CORS check
  if (isForbiddenOrigin(request)) {
    return NextResponse.json({ error: "Заборонене джерело" }, { status: 403 });
  }

  // Rate limiting
  const fingerprint = generateFingerprint(request);
  if (!(await checkRateLimit(fingerprint))) {
    return rateLimitResponse("Забагато запитів");
  }

  const { searchParams } = new URL(request.url);
  const rawParams = Object.fromEntries(searchParams.entries());
  const parsedParams = CatalogSearchParamsSchema.safeParse(rawParams);
  if (!parsedParams.success) {
    return NextResponse.json(
      {
        error: "Параметри пошуку мають некоректний формат",
        catalogUrl: getCatalogFormUrl(),
      },
      { status: 400 }
    );
  }

  const {
    q: query,
    author,
    title,
    udc,
    subject,
    keyword,
    page: pageNum,
  } = parsedParams.data;

  try {
    let searchTerm: string;
    let searchType:
      "title" | "author" | "general" | "udc" | "subject" | "keyword";

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
          error: "Каталог тимчасово недоступний, спробуйте пізніше",
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
