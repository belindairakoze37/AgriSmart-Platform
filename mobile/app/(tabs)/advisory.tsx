import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowUp, Leaf, Plus, Sprout } from 'lucide-react-native';
import { FeedbackState } from '../../components/FeedbackState';
import { LoadingState } from '../../components/LoadingState';
import { colors } from '../../constants/theme';
import {
  advisoryApi,
  farmApi,
  getApiErrorMessage,
  toArray,
  type AdvisoryMessage,
} from '../../services/api';

const suggestedPrompts = [
  'When should I plant maize?',
  'How can I control Fall Armyworm?',
  'What fertilizer works well for beans?',
];

export default function AdvisoryScreen() {
  const queryClient = useQueryClient();
  const listRef = useRef<FlatList<AdvisoryMessage>>(null);
  const [sessionId, setSessionId] = useState<string>();
  const [newConversation, setNewConversation] = useState(false);
  const [draft, setDraft] = useState('');
  const [sendError, setSendError] = useState<string>();
  const farmProfileQuery = useQuery({
    queryKey: ['farmer-profile'],
    queryFn: async () => (await farmApi.getProfile()).data,
  });
  const sessionsQuery = useQuery({
    queryKey: ['advisory', 'sessions'],
    queryFn: async () =>
      toArray((await advisoryApi.getSessions()).data),
  });

  const activeSessionId = newConversation
    ? undefined
    : sessionId ?? sessionsQuery.data?.[0]?.id;

  const messagesQuery = useQuery({
    queryKey: ['advisory', 'messages', activeSessionId],
    queryFn: async () => {
      if (!activeSessionId) return [];
      return toArray((await advisoryApi.getMessages(activeSessionId)).data);
    },
    enabled: Boolean(activeSessionId),
  });

  const sendMutation = useMutation({
    mutationFn: ({
      content,
      currentSessionId,
      context,
    }: {
      content: string;
      currentSessionId?: string;
      context?: { crop_type?: string; location?: string };
    }) => advisoryApi.sendMessage(content, currentSessionId, context),
    onSuccess: ({ data }) => {
      setSessionId(data.session_id);
      setNewConversation(false);
      setSendError(undefined);
      queryClient.setQueryData<AdvisoryMessage[]>(
        ['advisory', 'messages', data.session_id],
        (previous) => [
          ...(previous ?? []),
          data.user_message,
          data.ai_message,
        ],
      );
      void queryClient.invalidateQueries({ queryKey: ['advisory', 'sessions'] });
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    },
    onError: (error, variables) => {
      setDraft(variables.content);
      setSendError(getApiErrorMessage(error));
    },
  });

  const messages = messagesQuery.data ?? [];
  const submit = () => {
    const content = draft.trim();
    if (!content || sendMutation.isPending) return;
    setDraft('');
    setSendError(undefined);
    sendMutation.mutate({
      content,
      currentSessionId: activeSessionId,
      context: {
        ...(farmProfileQuery.data?.primary_crops.length
          ? { crop_type: farmProfileQuery.data.primary_crops.join(', ') }
          : {}),
        ...(farmProfileQuery.data?.district
          ? { location: farmProfileQuery.data.district }
          : {}),
      },
    });
  };

  const startNewConversation = () => {
    setSessionId(undefined);
    setNewConversation(true);
    setDraft('');
    setSendError(undefined);
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F5F9F4]" edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Sprout color={colors.white} size={21} />
        </View>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Ask AI</Text>
          <Text style={styles.subtitle}>Agricultural guidance for your farm</Text>
        </View>
        <Pressable
          accessibilityLabel="Start a new conversation"
          accessibilityRole="button"
          onPress={startNewConversation}
          style={styles.newConversationButton}
        >
          <Plus color={colors.primary} size={20} />
        </Pressable>
        <View style={styles.online}>
          <View style={styles.onlineDot} />
          <Text style={styles.onlineText}>Advisor</Text>
        </View>
      </View>

      {sessionsQuery.data && sessionsQuery.data.length > 0 ? (
        <ScrollView
          contentContainerStyle={styles.sessions}
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          {sessionsQuery.data.map((session) => {
            const selected = session.id === activeSessionId;
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected }}
                key={session.id}
                onPress={() => {
                  setNewConversation(false);
                  setSessionId(session.id);
                  setSendError(undefined);
                }}
                style={[styles.sessionChip, selected && styles.selectedSessionChip]}
              >
                <Text
                  numberOfLines={1}
                  style={[styles.sessionChipText, selected && styles.selectedSessionText]}
                >
                  {session.title || session.crop_type || 'Conversation'}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}

      {sessionsQuery.isError ? (
        <View style={styles.sessionError}>
          <Text style={styles.sessionErrorText}>
            Previous conversations could not be loaded. You can still start a new question.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => void sessionsQuery.refetch()}
          >
            <Text style={styles.retry}>Retry</Text>
          </Pressable>
        </View>
      ) : null}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        style={styles.chat}
      >
        {messagesQuery.isPending && activeSessionId ? (
          <LoadingState label="Loading your conversation..." />
        ) : messagesQuery.isError ? (
          <View style={styles.messageError}>
            <FeedbackState
              actionLabel="Reload conversation"
              kind="error"
              message={getApiErrorMessage(messagesQuery.error)}
              onAction={() => void messagesQuery.refetch()}
              title="Could not load messages"
            />
          </View>
        ) : (
          <FlatList
            contentContainerStyle={[
              styles.messages,
              messages.length === 0 && styles.emptyMessages,
            ]}
            data={messages}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={
              <View style={styles.welcome}>
                <View style={styles.welcomeIcon}>
                  <Leaf color={colors.primary} size={24} />
                </View>
                <Text style={styles.welcomeTitle}>What is happening on your farm?</Text>
                <Text style={styles.welcomeText}>
                  Ask about planting, crop care, pests, diseases, or harvesting.
                  The advisor will use the backend’s agricultural guidance service.
                </Text>
                  {farmProfileQuery.data?.district || farmProfileQuery.data?.primary_crops.length ? (
                    <Text style={styles.contextHint}>
                      Farm context: {[farmProfileQuery.data.district, ...farmProfileQuery.data.primary_crops].filter(Boolean).join(' · ')}
                  </Text>
                  ) : null}
                  {farmProfileQuery.isError ? (
                    <Text style={styles.contextWarning}>
                      Farm location and crop context could not be loaded.
                    </Text>
                  ) : null}
                  <View style={styles.promptGrid}>
                    {suggestedPrompts.map((prompt) => (
                      <Pressable
                        accessibilityRole="button"
                        key={prompt}
                        onPress={() => setDraft(prompt)}
                        style={styles.prompt}
                      >
                        <Text style={styles.suggestionText}>{prompt}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
            }
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
            ref={listRef}
            renderItem={({ item }) => (
              <View
                style={[
                  styles.messageRow,
                  item.sender === 'user' && styles.userRow,
                ]}
              >
                {item.sender !== 'user' ? (
                  <View style={styles.messageAvatar}>
                    <Sprout color={colors.primary} size={15} />
                  </View>
                ) : null}
                <View
                  style={[
                    styles.bubble,
                    item.sender === 'user' ? styles.userBubble : styles.advisorBubble,
                  ]}
                >
                  <Text
                    style={[
                      styles.messageText,
                      item.sender === 'user' && styles.userMessageText,
                    ]}
                  >
                    {item.content}
                  </Text>
                  {item.sender === 'ai' && item.sources.length > 0 ? (
                    <Text style={styles.sources}>
                      Sources: {item.sources.join(', ')}
                    </Text>
                  ) : null}
                </View>
              </View>
            )}
          />
        )}

        {sendMutation.isPending ? (
          <View style={styles.thinking}>
            <ActivityIndicator color={colors.primary} size="small" />
            <Text style={styles.thinkingText}>Getting guidance...</Text>
          </View>
        ) : null}
        {sendError ? (
          <Text accessibilityRole="alert" style={styles.sendError}>{sendError}</Text>
        ) : null}
        <View style={styles.composer}>
          <TextInput
            accessibilityLabel="Message the agricultural advisor"
            editable={!sendMutation.isPending}
            maxLength={2000}
            multiline
            onChangeText={setDraft}
            onSubmitEditing={submit}
            placeholder="Ask about your crops..."
            placeholderTextColor="#9CA3AF"
            style={styles.input}
            value={draft}
          />
          <Pressable
            accessibilityLabel="Send message"
            accessibilityRole="button"
            disabled={!draft.trim() || sendMutation.isPending}
            onPress={submit}
            style={[
              styles.sendButton,
              (!draft.trim() || sendMutation.isPending) && styles.sendDisabled,
            ]}
          >
            <ArrowUp color={colors.white} size={21} strokeWidth={2.6} />
          </Pressable>
        </View>
        <Text style={styles.disclaimer}>
          Guidance is informational. Consult a local extension officer for critical decisions.
        </Text>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', backgroundColor: colors.white, borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: 'row', gap: 11, paddingHorizontal: 18, paddingVertical: 13 },
  sessions: { gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  sessionChip: { backgroundColor: colors.white, borderColor: colors.border, borderRadius: 20, borderWidth: 1, justifyContent: 'center', maxWidth: 180, minHeight: 36, paddingHorizontal: 14 },
  selectedSessionChip: { backgroundColor: colors.paleGreen, borderColor: colors.primary },
  sessionChipText: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  selectedSessionText: { color: colors.darkGreen, fontWeight: '800' },
  headerIcon: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: 13, height: 42, justifyContent: 'center', width: 42 },
  headerCopy: { flex: 1 },
  newConversationButton: { alignItems: 'center', backgroundColor: colors.paleGreen, borderRadius: 18, height: 36, justifyContent: 'center', width: 36 },
  title: { color: colors.darkGreen, fontSize: 17, fontWeight: '800' },
  subtitle: { color: colors.muted, fontSize: 11, marginTop: 3 },
  online: { alignItems: 'center', flexDirection: 'row', gap: 5 },
  onlineDot: { backgroundColor: colors.success, borderRadius: 4, height: 7, width: 7 },
  onlineText: { color: colors.muted, fontSize: 10, fontWeight: '700' },
  sessionError: { alignItems: 'center', backgroundColor: '#FFF7E6', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 15, paddingVertical: 10 },
  sessionErrorText: { color: '#866E41', flex: 1, fontSize: 11, lineHeight: 16, marginRight: 8 },
  retry: { color: colors.primary, fontSize: 12, fontWeight: '800' },
  chat: { flex: 1 },
  messages: { padding: 16, paddingBottom: 24 },
  emptyMessages: { flexGrow: 1, justifyContent: 'center' },
  welcome: { alignItems: 'center', alignSelf: 'center', maxWidth: 330, padding: 20 },
  welcomeIcon: { alignItems: 'center', backgroundColor: colors.paleGreen, borderRadius: 28, height: 56, justifyContent: 'center', width: 56 },
  welcomeTitle: { color: colors.darkGreen, fontSize: 18, fontWeight: '800', marginTop: 16, textAlign: 'center' },
  welcomeText: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 8, textAlign: 'center' },
  contextHint: { color: colors.primary, fontSize: 10, lineHeight: 15, marginTop: 12, textAlign: 'center' },
  contextWarning: { color: colors.warning, fontSize: 10, marginTop: 8, textAlign: 'center' },
  promptGrid: { alignSelf: 'stretch', gap: 8, marginTop: 15 },
  prompt: { backgroundColor: colors.white, borderColor: colors.border, borderRadius: 13, borderWidth: 1, padding: 11 },
  suggestionText: { color: colors.primary, fontSize: 11, fontWeight: '700', textAlign: 'center' },
  messageRow: { alignItems: 'flex-end', flexDirection: 'row', gap: 7, marginBottom: 13 },
  userRow: { justifyContent: 'flex-end' },
  messageAvatar: { alignItems: 'center', backgroundColor: colors.paleGreen, borderRadius: 15, height: 29, justifyContent: 'center', width: 29 },
  bubble: { borderRadius: 17, maxWidth: '82%', paddingHorizontal: 14, paddingVertical: 11 },
  advisorBubble: { backgroundColor: colors.white, borderBottomLeftRadius: 5 },
  userBubble: { backgroundColor: colors.primary, borderBottomRightRadius: 5 },
  messageText: { color: colors.text, fontSize: 14, lineHeight: 21 },
  userMessageText: { color: colors.white },
  sources: { color: colors.muted, fontSize: 10, lineHeight: 15, marginTop: 9 },
  messageError: { flex: 1, justifyContent: 'center', padding: 20 },
  thinking: { alignItems: 'center', flexDirection: 'row', gap: 8, paddingHorizontal: 18, paddingVertical: 8 },
  thinkingText: { color: colors.muted, fontSize: 12 },
  sendError: { color: colors.error, fontSize: 12, paddingHorizontal: 16, paddingTop: 8 },
  composer: { alignItems: 'flex-end', backgroundColor: colors.white, borderColor: colors.border, borderRadius: 17, borderWidth: 1, flexDirection: 'row', gap: 8, marginHorizontal: 14, marginTop: 8, padding: 7 },
  input: { color: colors.text, flex: 1, fontSize: 14, maxHeight: 110, minHeight: 41, paddingHorizontal: 9, paddingVertical: 10 },
  sendButton: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: 13, height: 42, justifyContent: 'center', width: 42 },
  sendDisabled: { opacity: 0.4 },
  disclaimer: { color: colors.muted, fontSize: 9, lineHeight: 13, paddingHorizontal: 16, paddingVertical: 8, textAlign: 'center' },
});
