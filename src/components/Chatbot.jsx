import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, ChevronRight } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { translations, doctorList, countryCodes } from "../data/translations";
import { fetchAvailableSlotsForDoctor, createAppointment, generateTimeSlots, insertOTPRequest, verifyOTPCode } from "../lib/supabase";

const Chatbot = () => {
  const { lang } = useLanguage();
  const t = translations[lang];
  const bf = t.chatbot.bookingFlow;

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [inputMode, setInputMode] = useState("buttons");
  const [inputValue, setInputValue] = useState("");

  const [bookingStep, setBookingStep] = useState("idle");
  // idle, selectService, selectDoctor, selectDate, selectTime, enterName, enterPhone, enterOTP, confirmBooking, done
  const [bookingData, setBookingData] = useState({
    service: "",
    doctor: "",
    date: "",
    time: "",
    name: "",
    phone: "",
    countryCode: "+966",
  });
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [bookingSubmitting, setBookingSubmitting] = useState(false);

  const [selectedCountry, setSelectedCountry] = useState(countryCodes[0]);
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);

  const [otpLoading, setOtpLoading] = useState(false);
  const [generatedOTP, setGeneratedOTP] = useState(null);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setTimeout(() => {
        setMessages([
          { id: 1, type: "bot", text: t.chatbot.greeting },
        ]);
        setShowQuickReplies(true);
      }, 500);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, lang]);

  const addBotMessage = (text) => {
    return new Promise((resolve) => {
      setMessages((prev) => [
        ...prev,
        { id: Date.now(), type: "bot", text },
      ]);
      setTimeout(resolve, 800);
    });
  };

  const addUserMessage = (text) => {
    setMessages((prev) => [
      ...prev,
      { id: Date.now(), type: "user", text },
    ]);
  };

  const showQuickReplyButtons = (options) => {
    setShowQuickReplies(true);
    setMessages((prev) => [
      ...prev,
      { id: Date.now() + 1, type: "quickReplies", options },
    ]);
  };

  const showSelectionButtons = (items, onSelect, type) => {
    setMessages((prev) => [
      ...prev,
      { id: Date.now() + 1, type, items, onSelect },
    ]);
  };

  const startBookingFlow = async () => {
    setShowQuickReplies(false);
    setBookingStep("selectService");
    await addBotMessage(bf.startBooking);

    const serviceButtons = t.services.items.map((s, i) => ({
      id: i,
      label: s.title,
      value: s.title,
    }));

    showSelectionButtons(serviceButtons, handleServiceSelect, "serviceSelection");
  };

  const handleServiceSelect = async (serviceTitle) => {
    setBookingData((prev) => ({ ...prev, service: serviceTitle }));
    addUserMessage(serviceTitle);

    await addBotMessage(bf.askDoctor);
    setBookingStep("selectDoctor");

    const doctorButtons = doctorList.map((d) => ({
      id: d.id,
      label: lang === "en" ? d.nameEn : d.nameAr,
      value: lang === "en" ? d.nameEn : d.nameAr,
    }));

    showSelectionButtons(doctorButtons, handleDoctorSelect, "doctorSelection");
  };

  const handleDoctorSelect = async (doctorName) => {
    setBookingData((prev) => ({ ...prev, doctor: doctorName }));
    addUserMessage(doctorName);

    await addBotMessage(bf.askDate);
    setBookingStep("selectDate");
    setInputMode("date");
  };

  const handleDateSelect = async (dateStr) => {
    const selectedDateObj = new Date(dateStr + "T00:00:00");
    const dayOfWeek = selectedDateObj.getDay();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (selectedDateObj < today) {
      await addBotMessage(bf.dateInvalid);
      setInputMode("date");
      return;
    }

    if (dayOfWeek === 5) {
      await addBotMessage(bf.dateIsFriday);
      setInputMode("date");
      return;
    }

    addUserMessage(dateStr);
    setBookingData((prev) => ({ ...prev, date: dateStr }));
    setBookingStep("selectTime");
    setInputMode("none");

    setSlotsLoading(true);
    const doctorName = bookingData.doctor || "Unassigned";
    const slots = await fetchAvailableSlotsForDoctor(selectedDateObj, doctorName);
    const generatedSlots = generateTimeSlots(selectedDateObj);
    const finalSlots = slots.length > 0 ? slots : generatedSlots;
    setSlotsLoading(false);

    if (finalSlots.length === 0) {
      await addBotMessage(bf.noSlotsForDate);
      await addBotMessage(bf.askDate);
      setBookingStep("selectDate");
      setInputMode("date");
      return;
    }

    await addBotMessage(bf.askTime.replace("{date}", dateStr));

    const timeButtons = finalSlots.map((slot) => ({
      id: slot,
      label: slot,
      value: slot,
    }));

    showSelectionButtons(timeButtons, handleTimeSelect, "timeSelection");
  };

  const handleTimeSelect = async (timeSlot) => {
    setBookingData((prev) => ({ ...prev, time: timeSlot }));
    addUserMessage(timeSlot);

    await addBotMessage(bf.askName);
    setBookingStep("enterName");
    setInputMode("text");
    setInputValue("");
  };

  const handleNameSubmit = async () => {
    const name = inputValue.trim();
    if (!name) return;

    addUserMessage(name);
    setBookingData((prev) => ({ ...prev, name }));
    setInputValue("");

    await addBotMessage(bf.askPhone);
    setBookingStep("enterPhone");
    setInputMode("text");
    setInputValue("");
  };

  const handlePhoneSubmit = async () => {
    const phone = inputValue.trim();
    if (!phone || phone.length < 8) {
      await addBotMessage(bf.invalidPhone);
      return;
    }

    const fullPhone = bookingData.countryCode + phone;

    addUserMessage(`${bookingData.countryCode} ${phone}`);
    setBookingData((prev) => ({ ...prev, phone: fullPhone }));
    setInputValue("");
    setInputMode("none");

    await sendOTP(fullPhone);
  };

  const sendOTP = async (fullPhone) => {
    setOtpLoading(true);

    const otpMsg = bf.otpSent.replace("{phone}", fullPhone);
    await addBotMessage(otpMsg);

    if (generatedOTP) {
      await addBotMessage(lang === "en" ? `Demo code: ${generatedOTP}` : `رمز التجربة: ${generatedOTP}`);
    }

    const result = await insertOTPRequest(fullPhone);
    setOtpLoading(false);

    if (result.success) {
      setGeneratedOTP(result.otpCode);
    }

    await addBotMessage(bf.askOTP.replace("{phone}", fullPhone));
    setBookingStep("enterOTP");
    setInputMode("text");
    setInputValue("");
  };

  const handleOTPSubmit = async () => {
    const code = inputValue.trim();
    if (!code || code.length !== 4) {
      await addBotMessage(bf.invalidOTP);
      return;
    }

    addUserMessage("****");
    setInputValue("");
    setInputMode("none");

    setOtpLoading(true);
    const result = await verifyOTPCode(bookingData.phone, code);
    setOtpLoading(false);

    if (result.success) {
      await addBotMessage(bf.otpVerified);
      await showBookingConfirmation();
    } else {
      await addBotMessage(bf.invalidOTP);
      setBookingStep("enterOTP");
      setInputMode("text");
      setInputValue("");
    }
  };

  const showBookingConfirmation = async () => {
    const summary = bf.confirmBooking
      .replace("{service}", bookingData.service)
      .replace("{doctor}", bookingData.doctor)
      .replace("{date}", bookingData.date)
      .replace("{time}", bookingData.time)
      .replace("{name}", bookingData.name)
      .replace("{phone}", bookingData.phone);

    await addBotMessage(summary);
    setBookingStep("confirmBooking");

    showQuickReplyButtons([
      { key: "confirm", label: bf.confirmBtn, icon: "✅" },
      { key: "cancel", label: bf.cancelBooking, icon: "❌" },
    ]);
  };

  const confirmBooking = async () => {
    setShowQuickReplies(false);
    setBookingSubmitting(true);

    addUserMessage(bf.confirmBtn);

    const result = await createAppointment({
      service: bookingData.service,
      doctorName: bookingData.doctor,
      date: bookingData.date,
      timeSlot: bookingData.time,
      name: bookingData.name,
      phone: bookingData.phone,
    });

    setBookingSubmitting(false);
    setBookingStep("done");

    if (result.success) {
      await addBotMessage(bf.bookingSuccess);
    } else {
      await addBotMessage(bf.bookingFailed);
    }

    showQuickReplyButtons([
      { key: "startOver", label: bf.startOver, icon: "🔄" },
      { key: "mainMenu", label: bf.backMenu, icon: "🏠" },
    ]);
  };

  const cancelBookingFlow = async () => {
    setShowQuickReplies(false);
    addUserMessage(bf.cancelBooking);
    setBookingStep("idle");
    setBookingData({ service: "", doctor: "", date: "", time: "", name: "", phone: "", countryCode: "+966" });
    setGeneratedOTP(null);
    setSelectedCountry(countryCodes[0]);

    await addBotMessage(t.chatbot.greeting);
    setShowQuickReplies(true);
  };

  const resetToMainMenu = async () => {
    setShowQuickReplies(false);
    setBookingStep("idle");
    setBookingData({ service: "", doctor: "", date: "", time: "", name: "", phone: "", countryCode: "+966" });
    setGeneratedOTP(null);
    setSelectedCountry(countryCodes[0]);

    await addBotMessage(t.chatbot.greeting);
    setShowQuickReplies(true);
  };

  const handleQuickReply = async (option) => {
    setShowQuickReplies(false);

    if (option === "confirm") {
      await confirmBooking();
      return;
    }

    if (option === "cancel") {
      await cancelBookingFlow();
      return;
    }

    if (option === "startOver") {
      await resetToMainMenu();
      return;
    }

    if (option === "mainMenu") {
      await resetToMainMenu();
      return;
    }

    addUserMessage(t.chatbot.quickReplies[option]);

    if (option === "book") {
      await startBookingFlow();
    } else {
      await addBotMessage(t.chatbot.responses[option]);
      setTimeout(() => setShowQuickReplies(true), 500);
    }
  };

  const handleTextInput = () => {
    if (bookingStep === "selectDate") {
      handleDateSelect(inputValue);
    } else if (bookingStep === "enterName") {
      handleNameSubmit();
    } else if (bookingStep === "enterPhone") {
      handlePhoneSubmit();
    } else if (bookingStep === "enterOTP") {
      handleOTPSubmit();
    }
  };

  const renderMessageContent = (msg) => {
    if (msg.type === "quickReplies") {
      return (
        <div className="flex flex-wrap gap-2 pt-1">
          {msg.options.map((opt, i) => (
            <button
              key={`qr-${msg.id}-${i}`}
              onClick={() => handleQuickReply(opt.key || opt.value)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary-50 hover:bg-primary-100 text-primary-700 rounded-full text-sm font-medium transition-colors border border-primary-200"
            >
              {opt.icon && <span>{opt.icon}</span>}
              {opt.label}
            </button>
          ))}
        </div>
      );
    }

    if (msg.type === "serviceSelection") {
      return (
        <div className="flex flex-wrap gap-2 pt-1">
          {msg.items.map((item, i) => (
            <button
              key={`svc-${msg.id}-${i}`}
              onClick={() => {
                setMessages((prev) => prev.filter((m) => m.id !== msg.id));
                handleServiceSelect(item.value);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-secondary-50 hover:bg-secondary-100 text-secondary-700 rounded-full text-sm font-medium transition-colors border border-secondary-200"
            >
              {item.label}
            </button>
          ))}
        </div>
      );
    }

    if (msg.type === "doctorSelection") {
      return (
        <div className="flex flex-wrap gap-2 pt-1">
          {msg.items.map((item, i) => (
            <button
              key={`doc-${msg.id}-${i}`}
              onClick={() => {
                setMessages((prev) => prev.filter((m) => m.id !== msg.id));
                handleDoctorSelect(item.value);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary-50 hover:bg-primary-100 text-primary-700 rounded-full text-sm font-medium transition-colors border border-primary-200"
            >
              {item.label}
            </button>
          ))}
        </div>
      );
    }

    if (msg.type === "timeSelection") {
      if (slotsLoading) {
        return (
          <div className="flex items-center justify-center py-4">
            <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        );
      }
      return (
        <div className="grid grid-cols-3 gap-2 pt-1">
          {msg.items.map((item, i) => (
            <button
              key={`time-${msg.id}-${i}`}
              onClick={() => {
                setMessages((prev) => prev.filter((m) => m.id !== msg.id));
                handleTimeSelect(item.value);
              }}
              className="py-2 px-3 bg-gray-50 hover:bg-primary-500 hover:text-white rounded-lg text-sm font-medium transition-colors border border-gray-200"
            >
              {item.label}
            </button>
          ))}
        </div>
      );
    }

    return <span className="whitespace-pre-line">{msg.text}</span>;
  };

  const quickReplyOptions = [
    { key: "book", icon: "📅" },
    { key: "services", icon: "🦷" },
    { key: "location", icon: "📍" },
    { key: "contact", icon: "📞" },
  ];

  const isInputVisible = inputMode === "text" || inputMode === "date";

  return (
    <>
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

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 end-6 z-50 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100 flex flex-col"
            style={{ maxHeight: "calc(100vh - 140px)", height: "calc(100vh - 140px)" }}
          >
            <div className="bg-gradient-to-r from-primary-500 to-primary-600 p-4 flex items-center gap-3 shrink-0">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                🦷
              </div>
              <div>
                <h4 className="text-white font-semibold">SmileCare</h4>
                <p className="text-primary-100 text-xs">
                  {lang === "en" ? "Online | Typically replies instantly" : "متصل | يرد فوراً"}
                </p>
              </div>
            </div>

            <div className="flex-1 p-4 space-y-3 overflow-y-auto min-h-0">
              {messages.map((msg, i) => (
                <motion.div
                  key={`${msg.id}-${i}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm ${
                      msg.type === "user"
                        ? "bg-primary-500 text-white rounded-br-md"
                        : "bg-gray-100 text-secondary-800 rounded-bl-md"
                    }`}
                  >
                    {renderMessageContent(msg)}
                  </div>
                </motion.div>
              ))}

              {showQuickReplies && bookingStep === "idle" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-wrap gap-2 pt-2"
                >
                  {quickReplyOptions.map((option, i) => (
                    <button
                      key={`nav-${option.key}-${i}`}
                      onClick={() => handleQuickReply(option.key)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary-50 hover:bg-primary-100 text-primary-700 rounded-full text-sm font-medium transition-colors border border-primary-200"
                    >
                      <span>{option.icon}</span>
                      {t.chatbot.quickReplies[option.key]}
                    </button>
                  ))}
                </motion.div>
              )}

              {bookingStep === "selectService" && messages.length <= 3 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="pt-2"
                >
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      setBookingStep("idle");
                      setMessages([]);
                      setShowQuickReplies(false);
                      document.querySelector("#booking")?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-secondary-600 hover:bg-secondary-700 text-white rounded-full text-sm font-medium transition-colors"
                  >
                    {lang === "en" ? "Go to full booking page" : "انتقل لصفحة الحجز الكاملة"}
                    <ChevronRight className="w-4 h-4 rtl:rotate-180" />
                  </button>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            <div className="shrink-0">
              {isInputVisible && (
                <div className="p-3 border-t bg-white">
                  {inputMode === "date" ? (
                    <div className="space-y-2">
                      <input
                        type="date"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        min={new Date().toISOString().split("T")[0]}
                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-500"
                        onKeyDown={(e) => e.key === "Enter" && inputValue && handleTextInput()}
                      />
                      <button
                        onClick={handleTextInput}
                        disabled={!inputValue}
                        className="w-full py-2.5 bg-primary-500 hover:bg-primary-600 disabled:bg-gray-300 text-white rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
                      >
                        {lang === "en" ? "Check Available Slots" : "تحقق من المواعيد المتاحة"}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {bookingStep === "enterPhone" && (
                        <div className="relative">
                          <button
                            onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm hover:bg-gray-50 transition-colors w-full"
                          >
                            <span className="text-base">{selectedCountry.flag}</span>
                            <span className="font-medium text-secondary-700">{selectedCountry.code}</span>
                            <span className="text-gray-500 text-xs">
                              {lang === "en" ? selectedCountry.labelEn : selectedCountry.labelAr}
                            </span>
                            <span className="ms-auto text-gray-400">
                              {showCountryDropdown ? "\u25B2" : "\u25BC"}
                            </span>
                          </button>
                          {showCountryDropdown && (
                            <div className="absolute bottom-full mb-1 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg z-[100] max-h-48 overflow-y-auto">
                              {countryCodes.map((c, i) => (
                                <button
                                  key={`cc-${i}`}
                                  onClick={() => {
                                    setSelectedCountry(c);
                                    setBookingData((prev) => ({ ...prev, countryCode: c.code }));
                                    setShowCountryDropdown(false);
                                  }}
                                  className={`flex items-center gap-2 px-4 py-2.5 text-sm w-full hover:bg-primary-50 transition-colors ${
                                    selectedCountry.code === c.code ? "bg-primary-50 text-primary-700" : ""
                                  }`}
                                >
                                  <span className="text-base">{c.flag}</span>
                                  <span className="font-medium">{c.code}</span>
                                  <span className="text-gray-500">
                                    {lang === "en" ? c.labelEn : c.labelAr}
                                  </span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        {bookingStep === "enterPhone" && (
                          <span className="flex-shrink-0 px-3 py-2 bg-gray-100 rounded-full text-sm font-medium text-secondary-700">
                            {selectedCountry.code}
                          </span>
                        )}
                        <input
                          type={bookingStep === "enterOTP" ? "password" : "text"}
                          value={inputValue}
                          onChange={(e) => setInputValue(e.target.value)}
                          placeholder={
                            bookingStep === "enterName"
                              ? bf.namePlaceholder
                              : bookingStep === "enterPhone"
                              ? bf.phonePlaceholder
                              : bf.otpPlaceholder
                          }
                          maxLength={bookingStep === "enterOTP" ? 4 : bookingStep === "enterName" ? 50 : selectedCountry.maxLength}
                          className="flex-1 px-4 py-2 bg-white border border-gray-200 rounded-full text-sm focus:outline-none focus:border-primary-500"
                          onKeyDown={(e) => e.key === "Enter" && inputValue && handleTextInput()}
                        />
                      <button
                        onClick={handleTextInput}
                        disabled={!inputValue.trim() || otpLoading}
                        className="w-9 h-9 bg-primary-500 hover:bg-primary-600 disabled:bg-gray-300 text-white rounded-full flex items-center justify-center transition-colors shrink-0"
                      >
                        {otpLoading ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                       </button>
                     </div>
                    </div>
                  )}
                </div>
              )}

              {bookingSubmitting && (
                <div className="p-3 border-t bg-gray-50 flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm text-gray-500">
                    {lang === "en" ? "Booking your appointment..." : "جاري حجز موعدك..."}
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Chatbot;
