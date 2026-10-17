import { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { advisoryApi } from '../../services/api';

interface Message {
  id: string;
  sender: 'user' | 'ai';
  content: string;
}

export default function AdvisoryScreen() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'ai',
      content: "Hello! I'm your AI farming assistant. Ask me anything about your crops, pests, diseases, or farming practices.",
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);
  
  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    
    const userMessage: Message = {
      id: Date.now().toString(),
      sender: 'user',
      content: input.trim(),
    };
    
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    
    try {
      const response = await advisoryApi.sendMessage(
        userMessage.content,
        sessionId || undefined
      );
      
      if (!sessionId) {
        setSessionId(response.data.session_id);
      }
      
      const aiMessage: Message = {
        id: response.data.ai_message.id,
        sender: 'ai',
        content: response.data.ai_message.content,
      };
      
      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          sender: 'ai',
          content: 'Sorry, I encountered an error. Please try again.',
        },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => flatListRef.current?.scrollToEnd(), 100);
    }
  };
  
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>💬 Ask AI</Text>
        <Text style={styles.subtitle}>Your digital extension officer</Text>
      </View>
      
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          renderItem={({ item }) => (
            <View
              style={[
                styles.messageBubble,
                item.sender === 'user' ? styles.userBubble : styles.aiBubble,
              ]}
            >
              <Text
                style={[
                  styles.messageText,
                  item.sender === 'user' ? styles.userText : styles.aiText,
                ]}
              >
                {item.content}
              </Text>
            </View>
          )}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        />
        
        {loading && (
          <View style={styles.typingIndicator}>
            <ActivityIndicator size="small" color="#2E7D32" />
            <Text style={styles.typingText}>AI is thinking...</Text>
          </View>
        )}
        
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Ask about your crops..."
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!input.trim() || loading) && styles.sendDisabled]}
            onPress={sendMessage}
            disabled={!input.trim() || loading}
          >
            <Text style={styles.sendIcon}>➤</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F9F4' },
  header: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#1B5E20' },
  subtitle: { fontSize: 13, color: '#666', marginTop: 4 },
  messagesList: { padding: 16 },
  messageBubble: {
    maxWidth: '80%', padding: 12, borderRadius: 16, marginBottom: 12,
  },
  userBubble: {
    alignSelf: 'flex-end', backgroundColor: '#2E7D32',
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    alignSelf: 'flex-start', backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
  },
  messageText: { fontSize: 15, lineHeight: 22 },
  userText: { color: '#fff' },
  aiText: { color: '#333' },
  typingIndicator: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 8,
  },
  typingText: { marginLeft: 8, color: '#666', fontSize: 13 },
  inputRow: {
    flexDirection: 'row', padding: 12, borderTopWidth: 1,
    borderTopColor: '#E0E0E0', backgroundColor: '#fff',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1, backgroundColor: '#F5F5F5', borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 10,
    fontSize: 15, maxHeight: 100,
  },
  sendButton: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#2E7D32', marginLeft: 8,
    justifyContent: 'center', alignItems: 'center',
  },
  sendDisabled: { opacity: 0.4 },
  sendIcon: { color: '#fff', fontSize: 18 },
});