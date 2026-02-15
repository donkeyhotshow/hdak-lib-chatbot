// This file is kept for compatibility with the template structure.
// The actual storage logic for chat is in server/replit_integrations/chat/storage.ts
// We can re-export it or just leave this empty/minimal if we don't have other data.

import { chatStorage } from "./replit_integrations/chat/storage";

export interface IStorage {
  // Add any application-specific storage methods here if needed
}

export class MemStorage implements IStorage {
  // MemStorage implementation if needed for non-persistent data
}

export const storage = new MemStorage();
