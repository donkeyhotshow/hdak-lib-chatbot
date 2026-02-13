import { describe, it, expect } from "vitest";
import * as db from "./db";

describe("Chatbot Database Functions", () => {
  describe("Library Resource Management", () => {
    it("should retrieve all resources from database", async () => {
      const resources = await db.getAllResources();
      
      expect(Array.isArray(resources)).toBe(true);
      expect(resources.length).toBeGreaterThan(0);
      
      // Verify seeded resources exist
      const hasElectronicLibrary = resources.some(r => r.nameEn === "Electronic Library");
      expect(hasElectronicLibrary).toBe(true);
    });

    it("should search resources by English keywords", async () => {
      const resources = await db.searchResources("library");
      
      expect(Array.isArray(resources)).toBe(true);
      expect(resources.length).toBeGreaterThan(0);
    });

    it("should search resources by Ukrainian keywords", async () => {
      const resources = await db.searchResources("бібліотека");
      
      expect(Array.isArray(resources)).toBe(true);
    });

    it("should search resources by Russian keywords", async () => {
      const resources = await db.searchResources("база");
      
      expect(Array.isArray(resources)).toBe(true);
    });

    it("should filter resources by type database", async () => {
      const resources = await db.getResourcesByType("database");
      
      expect(Array.isArray(resources)).toBe(true);
      expect(resources.length).toBeGreaterThan(0);
      
      // Verify all returned resources are of type database
      resources.forEach(r => {
        expect(r.type).toBe("database");
      });
    });

    it("should filter resources by type electronic_library", async () => {
      const resources = await db.getResourcesByType("electronic_library");
      
      expect(Array.isArray(resources)).toBe(true);
      expect(resources.length).toBeGreaterThan(0);
    });

    it("should create a new resource", async () => {
      const timestamp = Date.now();
      const resource = await db.createResource({
        nameEn: `Test Resource ${timestamp}`,
        nameUk: `Тестовий ресурс ${timestamp}`,
        nameRu: `Тестовый ресурс ${timestamp}`,
        type: "other",
        url: "https://test.example.com",
      });
      
      expect(resource).toBeDefined();
      expect(resource?.url).toBe("https://test.example.com");
    });

    it("should update a resource", async () => {
      const timestamp = Date.now();
      const created = await db.createResource({
        nameEn: `Original ${timestamp}`,
        type: "other",
      });

      if (created) {
        const updated = await db.updateResource(created.id, {
          nameEn: `Updated ${timestamp}`,
        });
        
        expect(updated).toBeDefined();
        expect(updated?.id).toBe(created.id);
      }
    });

    it("should delete a resource", async () => {
      const timestamp = Date.now();
      const created = await db.createResource({
        nameEn: `Delete Test ${timestamp}`,
        type: "other",
      });

      if (created) {
        const deleted = await db.deleteResource(created.id);
        expect(deleted).toBe(true);
      }
    });
  });

  describe("Library Contact Management", () => {
    it("should retrieve all contacts from database", async () => {
      const contacts = await db.getAllContacts();
      
      expect(Array.isArray(contacts)).toBe(true);
      expect(contacts.length).toBeGreaterThan(0);
      
      // Verify seeded contacts exist
      const hasEmailContact = contacts.some(c => c.type === "email");
      expect(hasEmailContact).toBe(true);
    });

    it("should create a new contact", async () => {
      const timestamp = Date.now();
      const contact = await db.createContact({
        type: "email",
        value: `test${timestamp}@example.com`,
        labelEn: `Test Email ${timestamp}`,
      });
      
      expect(contact).toBeDefined();
    });

    it("should update a contact", async () => {
      const timestamp = Date.now();
      const created = await db.createContact({
        type: "phone",
        value: "+1234567890",
        labelEn: `Phone ${timestamp}`,
      });

      if (created) {
        const updated = await db.updateContact(created.id, {
          value: "+0987654321",
        });
        
        expect(updated).toBeDefined();
        expect(updated?.value).toBe("+0987654321");
      }
    });

    it("should delete a contact", async () => {
      const timestamp = Date.now();
      const created = await db.createContact({
        type: "address",
        value: `Test Address ${timestamp}`,
        labelEn: "Test Location",
      });

      if (created) {
        const deleted = await db.deleteContact(created.id);
        expect(deleted).toBe(true);
      }
    });
  });

  describe("Library Info Management", () => {
    it("should retrieve existing library info", async () => {
      const info = await db.getLibraryInfo("about");
      
      expect(info).toBeDefined();
      expect(info?.key).toBe("about");
      expect(info?.valueEn).toBeDefined();
    });

    it("should set new library info", async () => {
      const timestamp = Date.now();
      const testKey = `test_info_${timestamp}`;
      
      const info = await db.setLibraryInfo(
        testKey,
        "Test English Value",
        "Тест українське значення",
        "Тест русское значение"
      );
      
      expect(info).toBeDefined();
    });

    it("should update existing library info", async () => {
      const timestamp = Date.now();
      const testKey = `update_info_${timestamp}`;
      
      // Create first
      await db.setLibraryInfo(
        testKey,
        "Original Value",
        "Оригінальне значення",
        "Исходное значение"
      );

      // Update
      const updated = await db.setLibraryInfo(
        testKey,
        "Updated Value",
        "Оновлене значення",
        "Обновленное значение"
      );
      
      expect(updated).toBeDefined();
    });
  });

  describe("User Query Logging", () => {
    it("should log a user query", async () => {
      const query = await db.logUserQuery(
        1,
        null,
        "Test query about resources",
        "en",
        [1, 2]
      );
      
      expect(query).toBeDefined();
    });

    it("should log anonymous query", async () => {
      const query = await db.logUserQuery(
        null,
        null,
        "Anonymous test query",
        "uk",
        null
      );
      
      expect(query).toBeDefined();
    });
  });

  describe("Conversation and Message Management", () => {
    it("should retrieve conversations list", async () => {
      const conversations = await db.getConversations(1);
      
      expect(Array.isArray(conversations)).toBe(true);
    });

    it("should retrieve messages from conversation", async () => {
      // Get first conversation if any exist
      const conversations = await db.getConversations(1);
      
      if (conversations.length > 0) {
        const messages = await db.getMessages(conversations[0].id);
        expect(Array.isArray(messages)).toBe(true);
      }
    });
  });
});
