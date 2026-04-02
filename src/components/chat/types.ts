export interface Message {
  id: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  createdAt: string;
  status?: 'sending' | 'sent' | 'error';
}

// Matches DB schema: conversations table has id, title, createdAt only
// messages are loaded separately and attached client-side
export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  // Populated when loading a specific conversation
  messages?: Message[];
}
