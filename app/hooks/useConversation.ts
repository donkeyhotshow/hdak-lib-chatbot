import { useState, useEffect, useCallback } from 'react';

export function useConversation() {
  const [currentConversationId, setCurrentConversationId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Array<{id: number; text: string; sender: 'user' | 'bot'; chips?: {label: string; keyword: string}[]; timestamp?: number}>>([]);
  const [isTyping, setIsTyping] = useState(false);

  // Fetch messages for a conversation
  const loadMessages = useCallback(async (conversationId: number) => {
    try {
      const res = await fetch(`/api/conversations/${conversationId}/messages`);
      if (!res.ok) throw new Error('Failed to load messages');
      const data = await res.json();
      
      // Transform API messages to our internal format
      // Assuming API returns: { id, role, content, created_at }
      // We need to convert to: { id, text, sender, chips?, timestamp }
      const transformed = data.map((msg: any) => ({
        id: msg.id,
        text: msg.content,
        sender: msg.role === 'user' ? 'user' : 'bot',
        // For simplicity, we're not handling chips from API in this hook
        // In a real app, you might store chips separately or derive them
        timestamp: msg.created_at ? new Date(msg.created_at).getTime() : Date.now()
      }));
      
      setMessages(transformed);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  }, []);

  // Create a new conversation
  const createNewConversation = useCallback(async () => {
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Нова розмова' })
      });
      if (!res.ok) throw new Error('Failed to create conversation');
      const conversation = await res.json();
      setCurrentConversationId(conversation.id);
      // Clear messages for new conversation
      setMessages([]);
    } catch (error) {
      console.error('Error creating conversation:', error);
    }
  }, []);

  // Send a message to the current conversation
  const sendMessage = useCallback(async (content: string) => {
    if (!currentConversationId) return null;

    setIsTyping(true);
    try {
      // First, optimistically add the user message
      const userMessage = {
        id: Date.now(),
        text: content,
        sender: 'user' as const,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, userMessage]);

      // Send to API
      const res = await fetch(`/api/conversations/${currentConversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      });

      if (!res.ok) throw new Error('Failed to send message');

      // The API will stream the response, but for simplicity in this hook,
      // we'll wait for the complete response. In a real app, you'd handle streaming.
      const data = await res.text(); // Assuming plain text response
      
      // Add AI response
      const aiMessage = {
        id: Date.now() + 1,
        text: data,
        sender: 'bot' as const,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, aiMessage]);
      
      return data;
    } catch (error) {
      console.error('Error sending message:', error);
      // Remove the optimistic user message on error?
      setMessages(prev => prev.slice(0, -1)); // Remove last message (the optimistic one)
      return null;
    } finally {
      setIsTyping(false);
    }
  }, [currentConversationId]);

  // Load messages when conversation ID changes
  useEffect(() => {
    if (currentConversationId !== null) {
      loadMessages(currentConversationId);
    }
  }, [currentConversationId, loadMessages]);

  return {
    currentConversationId,
    messages,
    isTyping,
    sendMessage,
    createNewConversation,
    setCurrentConversationId // Allow setting conversation ID externally (e.g., from URL)
  };
}