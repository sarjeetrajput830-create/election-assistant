import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock SpeechRecognition and SpeechSynthesis
if (typeof window !== 'undefined') {
  window.SpeechRecognition = vi.fn();
  window.webkitSpeechRecognition = vi.fn();
  window.speechSynthesis = {
    speak: vi.fn(),
    cancel: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    getVoices: vi.fn(() => []),
  };
  window.SpeechSynthesisUtterance = function(text) {
    this.text = text;
    this.lang = '';
    this.onend = null;
  };
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
}
