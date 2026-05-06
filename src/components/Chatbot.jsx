import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, ChevronRight } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { translations } from "../data/translations";

const Chatbot = () => {
  const { lang } = useLanguage();
  const t = translations[lang];
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setTimeout(() => {
        setMessages([
          {
            id: 1,
            type: "bot",
            text: t.chatbot.greeting,
          },
        ]);
        setShowQuickReplies(true);
      }, 500);
    }
  }, [isOpen, lang]);

  const addMessage = (text, type) => {
    setMessages((prev) => [
      ...prev,
      { id: Date.now(), type, text },
    ]);
  };

  const handleQuickReply = (option) => {
    setShowQuickReplies(false);
    addMessage(t.chatbot.quickReplies[option], "user");

    setTimeout(() => {
      if (option === "book") {
        addMessage(t.chatbot.responses.book, "bot");
        setTimeout(() => {
          setShowQuickReplies(true);
        }, 500);
      } else {
        addMessage(t.chatbot.responses[option], "bot");
        setTimeout(() => {
          setShowQuickReplies(true);
        }, 500);
      }
    }, 800);
  };

  const handleBookCta = () => {
    setIsOpen(false);
    document.querySelector("#booking")?.scrollIntoView({ behavior: "smooth" });
  };

  const quickReplyOptions = [
    { key: "book", icon: "📅" },
    { key: "services", icon: "🦷" },
    { key: "location", icon: "📍" },
    { key: "contact", icon: "📞" },
  ];

  return (
    <>
      {/* Floating Button */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 end-6 z-50 w-14 h-14 bg-primary-500 hover:bg-primary-600 text-white rounded-full shadow-lg shadow-primary-500/30 flex items-center justify-center transition-colors"
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
            >
              <X className="w-6 h-6" />
            </motion.div>
          ) : (
            <motion.div
              key="chat"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
            >
              <MessageCircle className="w-6 h-6" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 end-6 z-50 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100"
            style={{ maxHeight: "calc(100vh - 140px)" }}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-primary-500 to-primary-600 p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <span className="text-xl">🦷</span>
              </div>
              <div>
                <h4 className="text-white font-semibold">SmileCare</h4>
                <p className="text-primary-100 text-xs">
                  {lang === "en" ? "Online | Typically replies instantly" : "متصل | يرد فوراً"}
                </p>
              </div>
            </div>

            {/* Messages */}
            <div className="p-4 space-y-3 overflow-y-auto" style={{ maxHeight: "400px" }}>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm whitespace-pre-line ${
                      msg.type === "user"
                        ? "bg-primary-500 text-white rounded-br-md"
                        : "bg-gray-100 text-secondary-800 rounded-bl-md"
                    }`}
                  >
                    {msg.text}
                  </div>
                </motion.div>
              ))}

              {/* Quick Replies */}
              {showQuickReplies && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-wrap gap-2 pt-2"
                >
                  {quickReplyOptions.map((option) => (
                    <button
                      key={option.key}
                      onClick={() => handleQuickReply(option.key)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary-50 hover:bg-primary-100 text-primary-700 rounded-full text-sm font-medium transition-colors border border-primary-200"
                    >
                      <span>{option.icon}</span>
                      {t.chatbot.quickReplies[option.key]}
                    </button>
                  ))}

                  {/* Book CTA for book response */}
                  {messages.some((m) => m.text === t.chatbot.responses.book) && (
                    <button
                      onClick={handleBookCta}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-full text-sm font-medium transition-colors w-full justify-center"
                    >
                      {t.chatbot.responses.bookCta}
                      <ChevronRight className="w-4 h-4 rtl:rotate-180" />
                    </button>
                  )}
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input (decorative) */}
            <div className="p-3 border-t bg-gray-50">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder={lang === "en" ? "Type a message..." : "اكتب رسالة..."}
                  className="flex-1 px-4 py-2 bg-white border border-gray-200 rounded-full text-sm focus:outline-none focus:border-primary-500"
                  readOnly
                />
                <button className="w-9 h-9 bg-primary-500 text-white rounded-full flex items-center justify-center">
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Chatbot;
