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
});
