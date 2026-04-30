import { useState, useRef, useEffect, memo, useCallback, useMemo } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import './index.css';

function App() {
  const [lang, setLang] = useState('en'); // 'en' or 'hi'
  const [apiKey, setApiKey] = useState('');
  
  const initialMessages = {
    en: "Namaskar! I am your official Election Information Assistant. I can help so with the election process vote. How may I assist you today?",
    hi: "नमस्कार! मैं आपका आधिकारिक चुनाव सूचना सहायक हूं। मैं आपको चुनाव प्रक्रिया और मतदान में मदद कर सकता हूं। आज मैं आपकी कैसे सहायता कर सकता हूं?"
  };

  const [messages, setMessages] = useState([
    { id: 1, text: initialMessages['en'], sender: "bot" }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      
      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInputValue(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event) => {
        console.error("Speech recognition error", event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  const toggleLanguage = (newLang) => {
    setLang(newLang);
    // If the only message is the initial greeting, switch it
    if (messages.length === 1 && messages[0].sender === 'bot') {
      setMessages([{ id: Date.now(), text: initialMessages[newLang], sender: 'bot' }]);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const speakText = (text) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === 'en' ? 'en-IN' : 'hi-IN';
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      if (recognitionRef.current) {
        recognitionRef.current.lang = lang === 'en' ? 'en-IN' : 'hi-IN';
        recognitionRef.current.start();
        setIsListening(true);
      } else {
        alert("Your browser does not support Speech Recognition.");
      }
    }
  };

  const fetchGeminiResponse = async (userText) => {
    if (!apiKey) {
      return lang === 'en' 
        ? "Please provide a Gemini API Key at the top right to receive intelligent answers." 
        : "कृपया बुद्धिमान उत्तर प्राप्त करने के लिए शीर्ष दाईं ओर एक Gemini API Key प्रदान करें।";
    }

    try {
      // Structured Logging for Google Cloud Logs Explorer
      console.log(JSON.stringify({
        severity: "INFO",
        message: `API request for query: ${userText}`,
        user_language: lang,
        timestamp: new Date().toISOString()
      }));

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      
      const currentDate = new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      
      const systemInstruction = lang === 'en' 
        ? `Today is ${currentDate}. You are an official Indian Election Information Assistant. Provide neutral, accurate, and concise information about voter registration, election processes, EVM, VVPAT, and timelines in India for the current year. If specific dates haven't been announced for a region, tell the user to check the official ECI website. Do not provide outdated historical dates as if they are current. Keep answers under 3-4 sentences. Do not answer political questions.`
        : `आज ${currentDate} है। आप एक आधिकारिक भारतीय चुनाव सूचना सहायक हैं। वर्तमान वर्ष के लिए मतदाता पंजीकरण, चुनाव प्रक्रियाओं, EVM, VVPAT और भारत में समय-सीमा के बारे में निष्पक्ष और सटीक जानकारी प्रदान करें। यदि विशिष्ट तारीखों की घोषणा नहीं की गई है, तो उपयोगकर्ता को आधिकारिक ECI वेबसाइट देखने के लिए कहें। पुरानी तारीखों को वर्तमान के रूप में न दें। उत्तर 3-4 वाक्यों से कम रखें। राजनीतिक सवालों का उत्तर न दें।`;

      const prompt = `${systemInstruction}\n\nUser Question: ${userText}`;
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      // Error logging for Google Cloud Error Reporting
      console.error(JSON.stringify({
        severity: "ERROR",
        message: `API Error: ${error.message}`,
        stack: error.stack,
        user_language: lang
      }));

      return lang === 'en' 
        ? "Sorry, I encountered an error communicating with the API. Please check your API key." 
        : "क्षमा करें, API से संचार करते समय मुझे एक त्रुटि का सामना करना पड़ा। कृपया अपनी API Key जांचें।";
    }
  };

  const handleSend = async (text) => {
    if (!text.trim()) return;
    
    const newUserMsg = { id: Date.now(), text, sender: "user" };
    setMessages(prev => [...prev, newUserMsg]);
    setInputValue("");
    setIsLoading(true);

    const botText = await fetchGeminiResponse(text);
    
    setMessages(prev => [...prev, { id: Date.now() + 1, text: botText, sender: "bot" }]);
    setIsLoading(false);
    
    speakText(botText);
  };

  return (
    <div className="app-wrapper">
      <div className="chakra-bg-topleft"></div>
      <div className="chakra-bg-bottomleft"></div>
      <div className="chakra-bg-bottomright"></div>
      
      {/* Header Section */}
      <header className="main-header">
        <div className="header-content">
          <div className="logo-section">
            <img src="/logo.png" alt="National Election Portal Logo" className="gov-logo" />
            <div className="header-text">
              <h1>{lang === 'en' ? "E-Matdata Assistant" : "ई-मतदाता सहायक"}</h1>
              <p>{lang === 'en' ? "Official Election Information Portal" : "आधिकारिक चुनाव सूचना पोर्टल"}</p>
            </div>
          </div>
          
          <div className="center-chakra">
            <svg viewBox="0 0 100 100" width="80" height="80" aria-hidden="true">
              <circle cx="50" cy="50" r="48" fill="none" stroke="#fff" strokeWidth="2" />
              <circle cx="50" cy="50" r="10" fill="none" stroke="#fff" strokeWidth="2" />
              <g stroke="#fff" strokeWidth="1.5">
                {[...Array(24)].map((_, i) => (
                  <line key={i} x1="50" y1="50" x2="50" y2="2" transform={`rotate(${i * 15} 50 50)`} />
                ))}
              </g>
            </svg>
          </div>
          
          <div className="header-right-actions">
            {/* Google Identity Services Integration */}
            <div id="g_id_onload"
                 data-client_id="YOUR_GOOGLE_CLIENT_ID"
                 data-context="signin"
                 data-ux_mode="popup"
                 data-auto_prompt="false">
            </div>
            <div className="g_id_signin" data-type="standard"></div>
            
            <div className="lang-section-wrapper">
              <div className="lang-pill-container">
                <button className={`pill-btn ${lang === 'en' ? 'active' : ''}`} onClick={() => toggleLanguage('en')}>English</button>
                <button className={`pill-btn ${lang === 'hi' ? 'active' : ''}`} onClick={() => toggleLanguage('hi')}>Hindi</button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Tricolor Wave Separator */}
      <div className="tricolor-wave-bar"></div>

      <div className="main-container">
        {/* API Key Sub-header */}
        <div className="action-bar">
          <div className="api-input-wrapper">
            <span className="key-icon">🔑</span>
            <input 
              type="password" 
              placeholder={lang === 'en' ? "Enter Gemini API Key" : "Gemini API Key दर्ज करें"} 
              value={apiKey} 
              onChange={(e) => setApiKey(e.target.value)} 
            />
          </div>
          <button className="settings-btn" aria-label={lang === 'en' ? "Settings" : "सेटिंग्स"}>⚙️</button>
        </div>

        {/* 4 Cards Grid */}
        <div className="info-grid">
          {/* Card 1: Voter Forms */}
          <div className="info-card tricolor-card">
            <h3 className="card-title saffron-header">📝 {lang === 'en' ? "Voter Forms" : "मतदाता प्रपत्र"}</h3>
            <div className="card-body">
              <button className="card-action-btn" onClick={() => handleSend(lang === 'en' ? "How to fill Form 6 for Voter Registration?" : "मतदाता पंजीकरण के लिए फॉर्म 6 कैसे भरें?")}>
                {lang === 'en' ? "Voter Registration (Form 6)" : "मतदाता पंजीकरण (फॉर्म 6)"} <span>&gt;</span>
              </button>
            </div>
            <div className="card-footer green-footer">
              <div className="footer-links">
                <button className="text-link" onClick={() => handleSend("What is Form 7 for?")}>{lang === 'en' ? "Form 7/8" : "फॉर्म 7/8"}</button>
                <button className="text-link" onClick={() => handleSend("How to update details using Form 8?")}>{lang === 'en' ? "Update Details" : "विवरण अपडेट करें"}</button>
              </div>
            </div>
          </div>

          {/* Card 2: Election Schedule & Polling Booths (Google Maps) */}
          <div className="info-card tricolor-card">
            <h3 className="card-title saffron-header">🗓️ {lang === 'en' ? "Election Info" : "चुनाव जानकारी"}</h3>
            <div className="card-body center-flex column-flex">
              <button className="card-action-btn" onClick={() => handleSend(lang === 'en' ? "What is the election schedule?" : "चुनाव कार्यक्रम क्या है?")}>
                {lang === 'en' ? "View Schedule" : "शेड्यूल देखें"} 📅
              </button>
              <a 
                href="https://www.google.com/maps/search/polling+booth+near+me" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="maps-link-btn"
              >
                📍 {lang === 'en' ? "Find Polling Booth" : "मतदान केंद्र खोजें"}
              </a>
            </div>
            <div className="card-footer green-footer centered-text">
              {lang === 'en' ? "Google Maps Integrated" : "गूगल मैप्स एकीकृत"}
            </div>
          </div>

          {/* Card 3: Voting Guide */}
          <div className="info-card tricolor-card">
            <h3 className="card-title saffron-header">📋 {lang === 'en' ? "Voting Guide" : "मतदान गाइड"}</h3>
            <div className="card-body guide-body">
              <div className="guide-item" onClick={() => handleSend(lang === 'en' ? "What are the steps at the polling booth?" : "मतदान केंद्र पर क्या कदम हैं?")}>
                <span className="guide-icon">🚶</span>
                <span>{lang === 'en' ? "Steps at Booth" : "बूथ पर चरण"}</span>
              </div>
              <hr className="divider" />
              <div className="guide-item" onClick={() => handleSend(lang === 'en' ? "How does EVM and VVPAT work?" : "EVM और VVPAT कैसे काम करते हैं?")}>
                <span className="guide-icon">🖥️</span>
                <span>{lang === 'en' ? "EVM & VVPAT" : "EVM और VVPAT"}</span>
              </div>
            </div>
            <div className="card-footer green-footer centered-text">
              {lang === 'en' ? "Citizen Guidelines" : "नागरिक दिशानिर्देश"}
            </div>
          </div>

          {/* Card 4: Citizen Guidelines */}
          <div className="info-card plain-card">
            <h3 className="card-title">Citizen Guidelines</h3>
            <div className="card-body">
              <ul className="guidelines-list">
                <li><strong>{lang === 'en' ? "Verify Name" : "नाम जांचें"}:</strong> {lang === 'en' ? "Ensure your name is on the electoral roll before polling day." : "सुनिश्चित करें कि आपका नाम मतदाता सूची में है।"}</li>
                <li><strong>{lang === 'en' ? "Carry ID" : "आईडी रखें"}:</strong> {lang === 'en' ? "Bring your EPIC or approved ID card." : "अपना EPIC या आईडी कार्ड लाएं।"}</li>
                <li><strong>{lang === 'en' ? "Model Code" : "आदर्श संहिता"}:</strong> {lang === 'en' ? "Observe the Model Code of Conduct." : "आदर्श आचार संहिता का पालन करें।"}</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Chat Interface */}
        <div className="chat-interface">
          <div className="chat-header">
            <h2>{lang === 'en' ? "Chat with Assistant" : "सहायक के साथ चैट करें"}</h2>
            <button className="stop-speech-btn" onClick={stopSpeaking} title={lang === 'en' ? "Stop Speaking" : "बोलना बंद करें"}>
              🛑 {lang === 'en' ? "Stop Voice" : "आवाज़ रोकें"}
            </button>
          </div>
          
          <div className="chat-box">
            <div className="chat-messages">
              {messages.map((msg) => (
                <MessageItem key={msg.id} msg={msg} lang={lang} speakText={speakText} />
              ))}
              {isLoading && (
                <div className="message-row bot">
                  <div className="speaker-icon">⏳</div>
                  <div className="message-bubble bot loading">
                    {lang === 'en' ? "Typing..." : "टाइप कर रहा है..."}
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            
            <form className="chat-input-row" onSubmit={(e) => { e.preventDefault(); handleSend(inputValue); }}>
              <input 
                type="text" 
                className="chat-input"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={lang === 'en' ? "Let's chat" : "आइए बात करते हैं"}
                disabled={isLoading}
              />
              <button 
                type="button" 
                aria-label={lang === 'en' ? (isListening ? "Stop listening" : "Start voice input") : (isListening ? "सुनना बंद करें" : "वॉयस इनपुट शुरू करें")}
              >
                🎤
              </button>
              <button type="submit" className="send-btn" disabled={isLoading || !inputValue.trim()} aria-label={lang === 'en' ? "Send message" : "संदेश भेजें"}>
                ➤
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

// Memoized Message Item for Efficiency
const MessageItem = memo(({ msg, lang, speakText }) => (
  <div className={`message-row ${msg.sender}`}>
    {msg.sender === 'bot' && (
      <button 
        className="speaker-icon" 
        onClick={() => speakText(msg.text)} 
        aria-label={lang === 'en' ? "Read message aloud" : "संदेश जोर से पढ़ें"}
      >
        🔊
      </button>
    )}
    <div className={`message-bubble ${msg.sender}`}>
      {msg.text.split('\n').map((line, i) => (
        <span key={i}>{line}{i !== msg.text.split('\n').length - 1 && <br />}</span>
      ))}
    </div>
  </div>
));

export default App;
