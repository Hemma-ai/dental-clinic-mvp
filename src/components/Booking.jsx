import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar as CalendarIcon, Clock, CheckCircle, AlertCircle, Loader2, Smile, User, Shield, ArrowLeft, ChevronDown } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { translations, doctorList, countryCodes } from "../data/translations";
import { fetchAvailableSlotsForDoctor, createAppointment, generateTimeSlots, insertOTPRequest, verifyOTPCode } from "../lib/supabase";

const Booking = () => {
  const { lang } = useLanguage();
  const t = translations[lang];

  const [step, setStep] = useState(1);
  const [selectedService, setSelectedService] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formStatus, setFormStatus] = useState(null);
  const [errors, setErrors] = useState({});

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
  });

  const [selectedCountry, setSelectedCountry] = useState(countryCodes[0]);
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const countryButtonRef = useRef(null);
  const [dropdownStyle, setDropdownStyle] = useState({});

  useEffect(() => {
    if (showCountryDropdown && countryButtonRef.current) {
      const rect = countryButtonRef.current.getBoundingClientRect();
      setDropdownStyle({
        position: "fixed",
        top: rect.top - 8,
        start: `${rect.left}px`,
        end: `${window.innerWidth - rect.right}px`,
        zIndex: 9999,
      });
    }
  }, [showCountryDropdown]);

  const [otpStep, setOtpStep] = useState("none");
  const [otpCode, setOtpCode] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [resendTimer, setResendTimer] = useState(0);
  const [generatedOTP, setGeneratedOTP] = useState(null);

  const handleDateChange = async (e) => {
    const date = e.target.value;
    setSelectedDate(date);
    setLoading(true);
    setErrors((prev) => ({ ...prev, date: "" }));

    const selectedDateObj = new Date(date + "T00:00:00");
    const slots = generateTimeSlots(selectedDateObj);

    if (slots.length === 0) {
      setAvailableSlots([]);
    } else {
      const doctorName = selectedDoctor || "Unassigned";
      const fetchedSlots = await fetchAvailableSlotsForDoctor(selectedDateObj, doctorName);
      setAvailableSlots(fetchedSlots.length > 0 ? fetchedSlots : slots);
    }

    setLoading(false);
    setSelectedTime("");
    if (slots.length > 0) setStep(4);
  };

  const handleDoctorChange = async (doctorName) => {
    setSelectedDoctor(doctorName);
    setErrors((prev) => ({ ...prev, doctor: "" }));

    if (selectedDate) {
      setLoading(true);
      const selectedDateObj = new Date(selectedDate + "T00:00:00");
      const fetchedSlots = await fetchAvailableSlotsForDoctor(selectedDateObj, doctorName);
      const generatedSlots = generateTimeSlots(selectedDateObj);
      setAvailableSlots(fetchedSlots.length > 0 ? fetchedSlots : generatedSlots);
      setSelectedTime("");
      setLoading(false);
    }

    setStep(3);
  };

  const startOTPFlow = () => {
    setOtpStep("send");
    setOtpCode("");
    setOtpError("");
    setStep(6);
  };

  const handleSendOTP = async () => {
    setOtpLoading(true);
    setOtpError("");

    const fullPhone = selectedCountry.code + formData.phone;
    const result = await insertOTPRequest(fullPhone);

    setOtpLoading(false);

    if (result.success) {
      setGeneratedOTP(result.otpCode);
      setOtpStep("verify");
      setResendTimer(30);

      const timer = setInterval(() => {
        setResendTimer((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setOtpError(t.otp.error);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otpCode || otpCode.length !== 4) {
      setOtpError(t.otp.invalidCode);
      return;
    }

    setOtpLoading(true);
    setOtpError("");

    const fullPhone = selectedCountry.code + formData.phone;
    const result = await verifyOTPCode(fullPhone, otpCode);

    setOtpLoading(false);

    if (result.success) {
      setOtpStep("verified");
      setTimeout(() => {
        submitBooking();
      }, 1000);
    } else {
      setOtpError(t.otp.invalidCode);
      setOtpCode("");
    }
  };

  const handleResendOTP = async () => {
    if (resendTimer > 0) return;
    await handleSendOTP();
  };

  const submitBooking = async () => {
    const fullPhone = selectedCountry.code + formData.phone;
    const result = await createAppointment({
      service: selectedService,
      doctorName: selectedDoctor,
      date: selectedDate,
      timeSlot: selectedTime,
      name: formData.name,
      phone: fullPhone,
      email: formData.email,
    });

    if (result.success) {
      setFormStatus("success");
    } else {
      setFormStatus("error");
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!selectedService) newErrors.service = t.booking.validation.serviceRequired;
    if (!selectedDoctor) newErrors.doctor = t.booking.validation.doctorRequired;
    if (!selectedDate) newErrors.date = t.booking.validation.dateRequired;
    if (!selectedTime) newErrors.time = t.booking.validation.timeRequired;
    if (!formData.name.trim()) newErrors.name = t.booking.validation.nameRequired;
    if (!formData.phone.trim()) {
      newErrors.phone = t.booking.validation.phoneRequired;
    } else if (!/^[+]?[\d\s-]{8,}$/.test(formData.phone)) {
      newErrors.phone = t.booking.validation.phoneInvalid;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    startOTPFlow();
  };

  const resetForm = () => {
    setStep(1);
    setSelectedService("");
    setSelectedDoctor("");
    setSelectedDate("");
    setSelectedTime("");
    setAvailableSlots([]);
    setFormData({ name: "", phone: "", email: "" });
    setErrors({});
    setFormStatus(null);
    setOtpStep("none");
    setOtpCode("");
    setOtpError("");
    setGeneratedOTP(null);
    setSelectedCountry(countryCodes[0]);
    setShowCountryDropdown(false);
  };

  const getDoctorDisplayName = (doctorName) => {
    if (!doctorName) return "";
    const doctor = doctorList.find((d) => d.nameEn === doctorName || d.nameAr === doctorName);
    if (!doctor) return doctorName;
    return lang === "en" ? doctor.nameEn : doctor.nameAr;
  };

  const progressSteps = [
    { num: 1, icon: <Smile className="w-5 h-5" />, label: lang === "en" ? "Service" : "الخدمة" },
    { num: 2, icon: <User className="w-5 h-5" />, label: lang === "en" ? "Doctor" : "الطبيب" },
    { num: 3, icon: <CalendarIcon className="w-5 h-5" />, label: lang === "en" ? "Date" : "التاريخ" },
    { num: 4, icon: <Clock className="w-5 h-5" />, label: lang === "en" ? "Time" : "الوقت" },
    { num: 5, icon: <Shield className="w-5 h-5" />, label: lang === "en" ? "Verify" : "تحقق" },
    { num: 6, icon: <CheckCircle className="w-5 h-5" />, label: t.booking.submit },
  ];

  return (
    <section id="booking" className="py-20 lg:py-28 bg-gradient-to-br from-secondary-800 via-secondary-900 to-secondary-900 relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-20 -right-20 w-72 h-72 bg-primary-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 -left-20 w-96 h-96 bg-primary-400/10 rounded-full blur-3xl" />
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <span className="inline-block px-4 py-1.5 bg-primary-500/20 text-primary-300 rounded-full text-sm font-semibold mb-4">
            {lang === "en" ? "Easy Booking" : "حجز سهل"}
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
            {t.booking.title}
          </h2>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto">
            {t.booking.subtitle}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-white rounded-3xl shadow-2xl overflow-hidden"
        >
          <div className="flex border-b">
            {progressSteps.map((s) => (
              <div
                key={s.num}
                className={`flex-1 flex items-center justify-center gap-2 py-3 sm:py-4 text-xs sm:text-sm font-medium transition-colors ${
                  step >= s.num
                    ? "bg-primary-500 text-white"
                    : "bg-gray-50 text-gray-400"
                }`}
              >
                {s.icon}
                <span className="hidden sm:inline">{s.label}</span>
              </div>
            ))}
          </div>

          <div className="p-6 sm:p-10">
            <AnimatePresence mode="wait">
              {formStatus === "success" ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-12"
                >
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="w-10 h-10 text-green-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-secondary-800 mb-3">
                    {t.booking.success}
                  </h3>
                  <button
                    onClick={resetForm}
                    className="mt-6 px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-semibold transition-colors"
                  >
                    {t.booking.bookAnother}
                  </button>
                </motion.div>
              ) : formStatus === "error" ? (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-12"
                >
                  <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <AlertCircle className="w-10 h-10 text-red-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-secondary-800 mb-3">
                    {t.booking.error}
                  </h3>
                  <button
                    onClick={() => setFormStatus(null)}
                    className="mt-6 px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-semibold transition-colors"
                  >
                    {t.booking.tryAgain}
                  </button>
                </motion.div>
              ) : otpStep === "verified" ? (
                <motion.div
                  key="otp-verified"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-12"
                >
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="w-10 h-10 text-green-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-secondary-800 mb-3">
                    {t.otp.verified}
                  </h3>
                  <div className="flex items-center justify-center gap-2 text-gray-500">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>{lang === "en" ? "Finalizing your booking..." : "جاري إنهاء الحجز..."}</span>
                  </div>
                </motion.div>
              ) : otpStep !== "none" ? (
                <motion.div
                  key="otp-flow"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Shield className="w-8 h-8 text-primary-600" />
                    </div>
                    <h3 className="text-xl font-bold text-secondary-800 mb-2">
                      {t.otp.title}
                    </h3>
                    <p className="text-gray-500 text-sm">
                      {t.otp.subtitle}
                    </p>
                  </div>

                  {otpStep === "send" && (
                    <div className="max-w-sm mx-auto">
                      <div className="bg-gray-50 rounded-xl p-4 mb-6">
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">{lang === "en" ? "Phone:" : "الهاتف:"}</span>{" "}
                          {selectedCountry.code} {formData.phone}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleSendOTP}
                        disabled={otpLoading}
                        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary-500 hover:bg-primary-600 disabled:bg-primary-300 text-white rounded-xl font-semibold transition-colors"
                      >
                        {otpLoading ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            {t.otp.sending}
                          </>
                        ) : (
                          <>
                            <Shield className="w-5 h-5" />
                            {t.otp.sendBtn}
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setOtpStep("none");
                          setStep(5);
                        }}
                        className="w-full mt-3 flex items-center justify-center gap-2 px-6 py-3 border-2 border-gray-200 text-secondary-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
                      >
                        <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
                        {t.otp.back}
                      </button>
                    </div>
                  )}

                  {otpStep === "verify" && (
                    <div className="max-w-sm mx-auto">
                      <div className="bg-green-50 rounded-xl p-4 mb-6">
                        <p className="text-sm text-green-700">
                          {t.otp.codeSent}
                        </p>
                        <p className="text-xs text-green-600 mt-1">
                          {lang === "en" ? "Demo: Your code is" : "للتجربة: الرمز هو"} <span className="font-bold">{generatedOTP}</span>
                        </p>
                      </div>
                      <div className="mb-6">
                        <label className="block text-sm font-medium text-secondary-700 mb-2">
                          {t.otp.codeLabel}
                        </label>
                        <input
                          type="text"
                          value={otpCode}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, "").slice(0, 4);
                            setOtpCode(val);
                            setOtpError("");
                          }}
                          placeholder={t.otp.codePlaceholder}
                          maxLength={4}
                          className={`w-full px-4 py-4 text-center text-2xl tracking-widest border-2 rounded-xl focus:outline-none transition-colors ${
                            otpError
                              ? "border-red-500 focus:border-red-500"
                              : "border-gray-200 focus:border-primary-500"
                          }`}
                        />
                        {otpError && (
                          <p className="mt-2 text-red-500 text-sm flex items-center gap-1 justify-center">
                            <AlertCircle className="w-4 h-4" />
                            {otpError}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={handleVerifyOTP}
                        disabled={otpLoading || otpCode.length !== 4}
                        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary-500 hover:bg-primary-600 disabled:bg-primary-300 text-white rounded-xl font-semibold transition-colors"
                      >
                        {otpLoading ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            {t.otp.verifying}
                          </>
                        ) : (
                          t.otp.verifyBtn
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={handleResendOTP}
                        disabled={resendTimer > 0 || otpLoading}
                        className="w-full mt-3 px-6 py-3 text-primary-600 hover:text-primary-700 disabled:text-gray-400 font-medium transition-colors"
                      >
                        {resendTimer > 0
                          ? t.otp.resendTimer.replace("{seconds}", resendTimer)
                          : t.otp.resend}
                      </button>
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.form
                  key="form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onSubmit={handleSubmit}
                >
                  {step === 1 && (
                    <div>
                      <h3 className="text-xl font-bold text-secondary-800 mb-6">
                        {t.booking.selectService}
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {t.services.items.map((service, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => {
                              setSelectedService(service.title);
                              setErrors((prev) => ({ ...prev, service: "" }));
                              setStep(2);
                            }}
                            className={`p-4 rounded-xl border-2 text-start transition-all ${
                              selectedService === service.title
                                ? "border-primary-500 bg-primary-50"
                                : "border-gray-200 hover:border-primary-300"
                            }`}
                          >
                            <span className="font-semibold text-secondary-800">
                              {service.title}
                            </span>
                          </button>
                        ))}
                      </div>
                      {errors.service && (
                        <p className="mt-3 text-red-500 text-sm">{errors.service}</p>
                      )}
                    </div>
                  )}

                  {step === 2 && (
                    <div>
                      <h3 className="text-xl font-bold text-secondary-800 mb-6">
                        {t.booking.selectDoctor}
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {doctorList.map((doctor) => {
                          const displayName = lang === "en" ? doctor.nameEn : doctor.nameAr;
                          const displaySpecialty = lang === "en" ? doctor.specialtyEn : doctor.specialtyAr;
                          return (
                            <button
                              key={doctor.id}
                              type="button"
                              onClick={() => handleDoctorChange(displayName)}
                              className={`p-4 rounded-xl border-2 text-start transition-all ${
                                selectedDoctor === displayName
                                  ? "border-primary-500 bg-primary-50"
                                  : "border-gray-200 hover:border-primary-300"
                              }`}
                            >
                              <span className="font-semibold text-secondary-800 block">
                                {displayName}
                              </span>
                              <span className="text-sm text-gray-500">
                                {displaySpecialty}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      {errors.doctor && (
                        <p className="mt-3 text-red-500 text-sm">{errors.doctor}</p>
                      )}
                      <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="mt-6 text-primary-600 hover:text-primary-700 font-medium"
                      >
                        {lang === "en" ? "\u2190 Back" : "\u2192 الرجوع"}
                      </button>
                    </div>
                  )}

                  {step === 3 && (
                    <div>
                      <h3 className="text-xl font-bold text-secondary-800 mb-6">
                        {t.booking.selectDate}
                      </h3>
                      <div className="max-w-sm">
                        <input
                          type="date"
                          value={selectedDate}
                          onChange={handleDateChange}
                          min={new Date().toISOString().split("T")[0]}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none text-lg"
                        />
                        {errors.date && (
                          <p className="mt-2 text-red-500 text-sm">{errors.date}</p>
                        )}
                      </div>
                      <p className="mt-4 text-sm text-gray-500">{t.booking.workingHours}</p>
                      <button
                        type="button"
                        onClick={() => setStep(2)}
                        className="mt-6 text-primary-600 hover:text-primary-700 font-medium"
                      >
                        {lang === "en" ? "\u2190 Back" : "\u2192 الرجوع"}
                      </button>
                    </div>
                  )}

                  {step === 4 && (
                    <div>
                      <h3 className="text-xl font-bold text-secondary-800 mb-6">
                        {t.booking.selectTime}
                      </h3>
                      {loading ? (
                        <div className="flex items-center justify-center py-12">
                          <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
                        </div>
                      ) : availableSlots.length === 0 ? (
                        <div className="text-center py-8">
                          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                          <p className="text-gray-600">{t.booking.noSlots}</p>
                          <button
                            type="button"
                            onClick={() => setStep(3)}
                            className="mt-4 text-primary-600 hover:text-primary-700 font-medium"
                          >
                            {t.booking.chooseAnotherDate}
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                          {availableSlots.map((slot) => (
                            <button
                              key={slot}
                              type="button"
                              onClick={() => {
                                setSelectedTime(slot);
                                setErrors((prev) => ({ ...prev, time: "" }));
                                setStep(5);
                              }}
                              className={`py-3 px-4 rounded-xl border-2 text-sm font-medium transition-all ${
                                selectedTime === slot
                                  ? "border-primary-500 bg-primary-500 text-white"
                                  : "border-gray-200 hover:border-primary-300 text-secondary-700"
                              }`}
                            >
                              {slot}
                            </button>
                          ))}
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => setStep(3)}
                        className="mt-6 text-primary-600 hover:text-primary-700 font-medium"
                      >
                        {lang === "en" ? "\u2190 Back" : "\u2192 الرجوع"}
                      </button>
                    </div>
                  )}

                  {step === 5 && (
                    <div>
                      <div className="bg-gray-50 rounded-xl p-6 mb-8">
                        <h3 className="font-bold text-secondary-800 mb-4">
                          {t.booking.bookingSummary}
                        </h3>
                        <div className="space-y-2 text-sm">
                          <p className="text-gray-600">
                            <span className="font-medium text-secondary-700">
                              {t.booking.serviceLabel}:
                            </span>{" "}
                            {selectedService}
                          </p>
                          <p className="text-gray-600">
                            <span className="font-medium text-secondary-700">
                              {t.booking.doctorLabel}:
                            </span>{" "}
                            {getDoctorDisplayName(selectedDoctor)}
                          </p>
                          <p className="text-gray-600">
                            <span className="font-medium text-secondary-700">
                              {t.booking.dateLabel}:
                            </span>{" "}
                            {selectedDate}
                          </p>
                          <p className="text-gray-600">
                            <span className="font-medium text-secondary-700">
                              {t.booking.timeLabel}:
                            </span>{" "}
                            {selectedTime}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-5">
                        <div>
                          <label className="block text-sm font-medium text-secondary-700 mb-2">
                            {t.booking.name} *
                          </label>
                          <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => {
                              setFormData((prev) => ({ ...prev, name: e.target.value }));
                              setErrors((prev) => ({ ...prev, name: "" }));
                            }}
                            className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none transition-colors ${
                              errors.name
                                ? "border-red-500 focus:border-red-500"
                                : "border-gray-200 focus:border-primary-500"
                            }`}
                            placeholder={lang === "en" ? "John Doe" : "محمد أحمد"}
                          />
                          {errors.name && (
                            <p className="mt-1 text-red-500 text-sm">{errors.name}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-secondary-700 mb-2">
                            {t.booking.phone} *
                          </label>
                          <div className="flex gap-2">
                            <div className="relative">
                              <button
                                ref={countryButtonRef}
                                type="button"
                                onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                                className="flex items-center gap-1.5 px-3 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl hover:bg-gray-100 transition-colors"
                              >
                                <span className="text-base">{selectedCountry.flag}</span>
                                <ChevronDown className="w-4 h-4 text-gray-500" />
                              </button>
                              {showCountryDropdown && createPortal(
                                <div className="fixed inset-0 z-[9999]" onClick={() => setShowCountryDropdown(false)}>
                                  <div
                                    className="absolute bg-white border border-gray-200 rounded-xl shadow-xl min-w-56 overflow-hidden"
                                    style={{
                                      top: dropdownStyle.top || 0,
                                      ...(lang === "en" ? { left: dropdownStyle.start } : { right: dropdownStyle.end }),
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <div className="max-h-48 overflow-y-auto">
                                      {countryCodes.map((c, i) => (
                                        <button
                                          key={`cc-${i}`}
                                          type="button"
                                          onClick={() => {
                                            setSelectedCountry(c);
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
                                  </div>
                                </div>,
                                document.body
                              )}
                            </div>
                            <div className="flex-1 relative">
                              <span className="absolute start-3 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-400">
                                {selectedCountry.code}
                              </span>
                              <input
                                type="tel"
                                value={formData.phone}
                                onChange={(e) => {
                                  const val = e.target.value.replace(/\D/g, "").slice(0, selectedCountry.maxLength);
                                  setFormData((prev) => ({ ...prev, phone: val }));
                                  setErrors((prev) => ({ ...prev, phone: "" }));
                                }}
                                className={`w-full px-4 ps-16 py-3 border-2 rounded-xl focus:outline-none transition-colors ${
                                  errors.phone
                                    ? "border-red-500 focus:border-red-500"
                                    : "border-gray-200 focus:border-primary-500"
                                }`}
                                placeholder={lang === "en" ? "5X XXX XXXX" : "٥X XXX XXXX"}
                              />
                            </div>
                          </div>
                          {errors.phone && (
                            <p className="mt-1 text-red-500 text-sm">{errors.phone}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-secondary-700 mb-2">
                            {t.booking.email}
                          </label>
                          <input
                            type="email"
                            value={formData.email}
                            onChange={(e) =>
                              setFormData((prev) => ({ ...prev, email: e.target.value }))
                            }
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none transition-colors"
                            placeholder="example@email.com"
                          />
                        </div>
                      </div>

                      <div className="flex gap-4 mt-8">
                        <button
                          type="button"
                          onClick={() => setStep(4)}
                          className="px-6 py-3 border-2 border-gray-200 text-secondary-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
                        >
                          {lang === "en" ? "\u2190 Back" : "\u2192 الرجوع"}
                        </button>
                        <button
                          type="submit"
                          className="flex-1 flex items-center justify-center gap-2 px-8 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-semibold transition-colors"
                        >
                          <Shield className="w-5 h-5" />
                          {lang === "en" ? "Verify & Book" : "تحقق واحجز"}
                        </button>
                      </div>
                    </div>
                  )}
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Booking;
