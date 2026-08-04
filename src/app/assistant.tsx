import { Stack } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { sendChatMessage, type ChatMessage } from '@/lib/assistant-api';

const GREETING: ChatMessage = {
  role: 'assistant',
  content: "Hi! I'm Ask Happy Baby 👶 Tell me what you're shopping for and I'll suggest a few products.",
};

export default function AssistantScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [draft, setDraft] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSend() {
    const content = draft.trim();
    if (!content || isSending) return;

    const nextMessages = [...messages, { role: 'user', content } as ChatMessage];
    setMessages(nextMessages);
    setDraft('');
    setError(null);
    setIsSending(true);

    try {
      const reply = await sendChatMessage(nextMessages);
      setMessages((current) => [...current, { role: 'assistant', content: reply }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setIsSending(false);
      requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
    }
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: 'Ask Happy Baby' }} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.select({ ios: 88, default: 0 })}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}>
          {messages.map((message, index) => (
            <MessageBubble key={index} message={message} />
          ))}
          {isSending && (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={theme.textSecondary} />
            </View>
          )}
          {error && (
            <ThemedText style={styles.error} type="small">
              {error}
            </ThemedText>
          )}
        </ScrollView>

        <ThemedView
          type="backgroundElement"
          style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, Spacing.three) }]}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Ask about products..."
            placeholderTextColor={theme.textSecondary}
            style={[styles.input, { color: theme.text }]}
            multiline
            editable={!isSending}
            onSubmitEditing={handleSend}
          />
          <Pressable
            onPress={handleSend}
            disabled={!draft.trim() || isSending}
            style={[styles.sendButton, (!draft.trim() || isSending) && styles.sendButtonDisabled]}
            accessibilityRole="button"
            accessibilityLabel="Send message">
            <ThemedText type="smallBold" style={styles.sendButtonText}>
              Send
            </ThemedText>
          </Pressable>
        </ThemedView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  return (
    <View style={[styles.bubbleRow, isUser && styles.bubbleRowUser]}>
      <ThemedView
        type={isUser ? 'backgroundSelected' : 'backgroundElement'}
        style={[styles.bubble, isUser && styles.bubbleUser]}>
        <ThemedText>{message.content}</ThemedText>
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  messageList: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  bubbleRow: {
    flexDirection: 'row',
  },
  bubbleRowUser: {
    justifyContent: 'flex-end',
  },
  bubble: {
    maxWidth: '85%',
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  bubbleUser: {
    borderBottomRightRadius: Spacing.half,
  },
  loadingRow: {
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.two,
  },
  error: {
    color: '#dc2626',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    ...Platform.select({
      web: { boxShadow: '0 -2px 12px rgba(0,0,0,0.08)' },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 8,
      },
    }),
  },
  input: {
    flex: 1,
    fontSize: 16,
    maxHeight: 100,
    paddingVertical: Spacing.two,
  },
  sendButton: {
    backgroundColor: '#3c87f7',
    borderRadius: Spacing.five,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    color: '#ffffff',
  },
});
