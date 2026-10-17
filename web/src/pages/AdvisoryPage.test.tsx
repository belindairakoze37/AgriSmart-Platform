import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AdvisoryPage } from './AdvisoryPage';

const apiMocks = vi.hoisted(() => ({
  getProfile: vi.fn(),
  getSessions: vi.fn(),
  getMessages: vi.fn(),
  sendMessage: vi.fn(),
}));

vi.mock('../api/client', () => ({
  advisoryApi: {
    getSessions: apiMocks.getSessions,
    getMessages: apiMocks.getMessages,
    sendMessage: apiMocks.sendMessage,
  },
  farmApi: { getProfile: apiMocks.getProfile },
  getApiErrorMessage: (error: unknown) =>
    error instanceof Error ? error.message : 'Request failed',
}));

function renderAdvisor() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter><AdvisoryPage /></MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('agricultural advisor', () => {
  afterEach(() => cleanup());

  beforeEach(() => {
    vi.clearAllMocks();
    Element.prototype.scrollIntoView = vi.fn();
    apiMocks.getProfile.mockResolvedValue({
      district: 'Gulu',
      primary_crops: ['Maize', 'Beans'],
    });
    apiMocks.getSessions.mockResolvedValue({
      count: 0,
      next: null,
      previous: null,
      results: [],
    });
    apiMocks.getMessages.mockResolvedValue({
      count: 0,
      next: null,
      previous: null,
      results: [],
    });
    apiMocks.sendMessage.mockResolvedValue({
      session_id: 'session-1',
      user_message: {
        id: 'message-1',
        sender: 'user',
        content: 'When should I plant maize?',
        intent: '',
        confidence: null,
        sources: [],
        metadata: {},
        created_at: '2026-01-01T12:00:00Z',
      },
      ai_message: {
        id: 'message-2',
        sender: 'ai',
        content: 'Plant during the first rains.',
        intent: 'planting',
        confidence: 0.7,
        sources: [],
        metadata: {},
        created_at: '2026-01-01T12:00:01Z',
      },
    });
  });

  it('sends farm context with a question and starts a saved conversation', async () => {
    renderAdvisor();
    fireEvent.click(await screen.findByRole('button', { name: /new conversation/i }));
    fireEvent.change(screen.getByLabelText('Message the agricultural advisor'), {
      target: { value: 'When should I plant maize?' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));

    await waitFor(() =>
      expect(apiMocks.sendMessage).toHaveBeenCalledWith(
        'When should I plant maize?',
        undefined,
        { crop_type: 'Maize, Beans', location: 'Gulu' },
      ),
    );
  });

  it('shows a fresh question composer when starting from an existing conversation', async () => {
    apiMocks.getSessions.mockResolvedValue({
      count: 1,
      next: null,
      previous: null,
      results: [{
        id: 'old-session',
        title: 'Old question',
        crop_type: 'Maize',
        location: 'Gulu',
        language: 'en',
        is_active: true,
        last_message: {
          content: 'Previous advice',
          sender: 'ai',
          created_at: '2026-01-01T12:00:00Z',
        },
        message_count: 2,
        created_at: '2026-01-01T11:00:00Z',
        updated_at: '2026-01-01T12:00:00Z',
      }],
    });
    apiMocks.getMessages.mockResolvedValue({
      count: 1,
      next: null,
      previous: null,
      results: [{
        id: 'old-message',
        sender: 'ai',
        content: 'Previous advice',
        intent: 'general',
        confidence: 0.7,
        sources: [],
        metadata: {},
        created_at: '2026-01-01T12:00:00Z',
      }],
    });

    renderAdvisor();
    expect(await screen.findByText('Previous advice')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'New conversation' }));

    expect(await screen.findByRole('heading', {
      name: 'What is happening on your farm?',
    })).toBeInTheDocument();
    expect(screen.getByText('Guidance for your farm · New conversation')).toBeInTheDocument();
    expect(screen.getByLabelText('Message the agricultural advisor')).toHaveValue('');
  });
});
