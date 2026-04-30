import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import App from '../App';

// Mock the GoogleGenerativeAI library
vi.mock('@google/generative-ai', () => {
  return {
    GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
      getGenerativeModel: vi.fn().mockReturnValue({
        generateContent: vi.fn().mockResolvedValue({
          response: {
            text: () => 'Mocked AI response',
          },
        }),
      }),
    })),
  };
});

describe('App Component', () => {
  it('renders the main heading', () => {
    render(<App />);
    const heading = screen.getByText(/E-Matdata Assistant/i);
    expect(heading).toBeInTheDocument();
  });

  it('toggles language from English to Hindi', () => {
    render(<App />);
    
    // Check initial English text
    expect(screen.getByText(/Official Election Information Portal/i)).toBeInTheDocument();
    
    // Click Hindi button
    const hindiBtn = screen.getByText('Hindi');
    fireEvent.click(hindiBtn);
    
    // Check Hindi text
    expect(screen.getByText(/आधिकारिक चुनाव सूचना पोर्टल/i)).toBeInTheDocument();
    expect(screen.getByText(/ई-मतदाता सहायक/i)).toBeInTheDocument();
  });

  it('updates API key input', () => {
    render(<App />);
    const input = screen.getByPlaceholderText(/Enter Gemini API Key/i);
    
    fireEvent.change(input, { target: { value: 'test-api-key' } });
    expect(input.value).toBe('test-api-key');
  });

  it('shows typing indicator when sending a message', async () => {
    render(<App />);
    
    // Set API key first
    const apiKeyInput = screen.getByPlaceholderText(/Enter Gemini API Key/i);
    fireEvent.change(apiKeyInput, { target: { value: 'test-api-key' } });

    const input = screen.getByPlaceholderText(/Let's chat/i);
    const sendBtn = screen.getByText('➤');

    fireEvent.change(input, { target: { value: 'Hello' } });
    fireEvent.click(sendBtn);

    expect(screen.getByText(/Typing.../i)).toBeInTheDocument();
  });

  it('shows error message when sending message without API key', async () => {
    render(<App />);
    const input = screen.getByPlaceholderText(/Let's chat/i);
    const sendBtn = screen.getByText('➤');

    fireEvent.change(input, { target: { value: 'Hello' } });
    fireEvent.click(sendBtn);

    // It should show the warning about missing API key
    const warning = await screen.findByText(/Please provide a Gemini API Key/i);
    expect(warning).toBeInTheDocument();
  });
});
