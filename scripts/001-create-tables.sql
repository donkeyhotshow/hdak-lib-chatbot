-- Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create library_info table
CREATE TABLE IF NOT EXISTS library_info (
  id SERIAL PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value_uk TEXT NOT NULL,
  value_en TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'admin',
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create library_resources table
CREATE TABLE IF NOT EXISTS library_resources (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  url TEXT NOT NULL,
  description_uk TEXT NOT NULL,
  description_en TEXT NOT NULL DEFAULT '',
  is_official BOOLEAN NOT NULL DEFAULT true,
  requires_auth BOOLEAN NOT NULL DEFAULT false
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_library_info_key ON library_info(key);
CREATE INDEX IF NOT EXISTS idx_library_info_category ON library_info(category);
