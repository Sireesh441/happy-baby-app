import { BACKEND_URL } from '@/lib/api';

export type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export async function sendChatMessage(messages: ChatMessage[]): Promise<string> {
  const response = await fetch(`${BACKEND_URL}/api/assistant`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error ?? 'The assistant is unavailable right now. Please try again shortly.');
  }
  return data.reply;
}
