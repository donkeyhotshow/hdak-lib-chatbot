import { describe, it, expect, afterEach } from "vitest";
import {
  getSessionState,
  setSessionState,
  clearSession,
  clearAllSessions,
  getActiveSessionCount,
  touchSession,
} from "./sessionStore";

afterEach(() => {
  clearAllSessions();
});

describe("sessionStore", () => {
  it("returns undefined for a non-existent session", () => {
    expect(getSessionState(42)).toBeUndefined();
    expect(getSessionState(42, 99)).toBeUndefined();
  });

  it("creates a new session and retrieves it by userId", () => {
    const entry = setSessionState(1, {
      dialogState: { sessionLanguage: "uk", messageCount: 1, lastActiveAt: "", context: {} },
    });

    expect(entry.userId).toBe(1);
    expect(entry.dialogState.sessionLanguage).toBe("uk");
    expect(entry.dialogState.messageCount).toBe(1);

    const retrieved = getSessionState(1);
    expect(retrieved).toBeDefined();
    expect(retrieved?.dialogState.sessionLanguage).toBe("uk");
  });

  it("creates a separate session entry when conversationId is provided", () => {
    setSessionState(1, {
      dialogState: { sessionLanguage: "uk", messageCount: 1, lastActiveAt: "", context: {} },
    });
    setSessionState(1, {
      conversationId: 5,
      dialogState: { sessionLanguage: "en", messageCount: 2, lastActiveAt: "", context: {} },
    }, 5);

    const global = getSessionState(1);
    const conv = getSessionState(1, 5);

    expect(global?.dialogState.sessionLanguage).toBe("uk");
    expect(conv?.dialogState.sessionLanguage).toBe("en");
    expect(conv?.conversationId).toBe(5);
  });

  it("merges partial updates preserving existing fields", () => {
    setSessionState(7, {
      dialogState: {
        sessionLanguage: "ru",
        messageCount: 3,
        lastActiveAt: "",
        context: { step: 1 },
      },
    });

    const updated = setSessionState(7, {
      dialogState: {
        messageCount: 4,
        lastActiveAt: "",
        context: {},
      },
    });

    // sessionLanguage was not provided in the second call — it should be preserved.
    expect(updated.dialogState.sessionLanguage).toBe("ru");
    expect(updated.dialogState.messageCount).toBe(4);
  });

  it("always stamps lastActiveAt with the current time", () => {
    const before = new Date().toISOString();
    const entry = setSessionState(3, {
      dialogState: {
        messageCount: 0,
        lastActiveAt: "1970-01-01T00:00:00.000Z",
        context: {},
      },
    });
    const after = new Date().toISOString();

    expect(entry.dialogState.lastActiveAt >= before).toBe(true);
    expect(entry.dialogState.lastActiveAt <= after).toBe(true);
  });

  it("clearSession removes the entry for a given userId", () => {
    setSessionState(10, {
      dialogState: { messageCount: 1, lastActiveAt: "", context: {} },
    });
    expect(getSessionState(10)).toBeDefined();

    clearSession(10);
    expect(getSessionState(10)).toBeUndefined();
  });

  it("clearSession with conversationId removes only that session entry", () => {
    setSessionState(11, {
      dialogState: { messageCount: 1, lastActiveAt: "", context: {} },
    });
    setSessionState(11, {
      conversationId: 20,
      dialogState: { messageCount: 2, lastActiveAt: "", context: {} },
    }, 20);

    clearSession(11, 20);

    expect(getSessionState(11)).toBeDefined();
    expect(getSessionState(11, 20)).toBeUndefined();
  });

  it("getActiveSessionCount reflects the number of live sessions", () => {
    expect(getActiveSessionCount()).toBe(0);
    setSessionState(20, { dialogState: { messageCount: 0, lastActiveAt: "", context: {} } });
    setSessionState(21, { dialogState: { messageCount: 0, lastActiveAt: "", context: {} } });
    expect(getActiveSessionCount()).toBe(2);
  });

  it("touchSession returns true for existing session and false for missing one", () => {
    setSessionState(30, { dialogState: { messageCount: 0, lastActiveAt: "", context: {} } });
    expect(touchSession(30)).toBe(true);
    expect(touchSession(99)).toBe(false);
  });
});
