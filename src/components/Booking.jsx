import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar as CalendarIcon, Clock, CheckCircle, AlertCircle, Loader2, Smile } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { translations } from "../data/translations";
import { fetchAvailableSlots, createAppointment, generateTimeSlots } from "../lib/supabase";

const Booking = () => {
  const { lang } = useLanguage();
  const t = translations[lang];

  const [step, setStep] = useState(1);
  const [selectedService, setSelectedService] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formStatus, setFormStatus] = useState(null);
  const [errors, setErrors] = useState({});

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
  });

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
      // Try to fetch from Supabase, fallback to generated slots
      const fetchedSlots = await fetchAvailableSlots(selectedDateObj);
      setAvailableSlots(fetchedSlots.length > 0 ? fetchedSlots : slots);
    }

    setLoading(false);
    setSelectedTime("");
    if (slots.length > 0) setStep(3);
  };

  const validateForm = () => {
    const newErrors = {};

    if (!selectedService) newErrors.service = t.booking.validation.serviceRequired;
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

    setSubmitting(true);

    // Insert into Supabase
    const result = await createAppointment({
      service: selectedService,
      date: selectedDate,
      timeSlot: selectedTime,
      name: formData.name,
      phone: formData.phone,
      email: formData.email,
    });

    setSubmitting(false);

    if (result.success) {
      setFormStatus("success");
    } else {
      setFormStatus("error");
    }
  };

  const resetForm = () => {
    setStep(1);
    setSelectedService("");
    setSelectedDate("");
    setSelectedTime("");
    setAvailableSlots([]);
    setFormData({ name: "", phone: "", email: "" });
    setErrors({});
    setFormStatus(null);
  };

  return (
    <section id="booking" className="py-20 lg:py-28 bg-gradient-to-br from-secondary-800 via-secondary-900 to-secondary-900 relative overflow-hidden">
      {/* Decorative */}
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
          {/* Progress Steps */}
          <div className="flex border-b">
            {[
              { num: 1, icon: <Smile className="w-5 h-5" />, label: lang === "en" ? "Service" : "الخدمة" },
              { num: 2, icon: <CalendarIcon className="w-5 h-5" />, label: lang === "en" ? "Date" : "التاريخ" },
              { num: 3, icon: <Clock className="w-5 h-5" />, label: lang === "en" ? "Time" : "الوقت" },
              { num: 4, icon: <CheckCircle className="w-5 h-5" />, label: lang === "en" ? "Confirm" : "تأكيد" },
            ].map((s) => (
              <div
                key={s.num}
                className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-medium transition-colors ${
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
                    {lang === "en" ? "Book Another" : "احجز موعداً آخر"}
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
                    {lang === "en" ? "Try Again" : "حاول مرة أخرى"}
                  </button>
                </motion.div>
              ) : (
                <motion.form
                  key="form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onSubmit={handleSubmit}
                >
                  {/* Step 1: Service Selection */}
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

                  {/* Step 2: Date Selection */}
                  {step === 2 && (
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
                        onClick={() => setStep(1)}
                        className="mt-6 text-primary-600 hover:text-primary-700 font-medium"
                      >
                        {lang === "en" ? "← Back" : "→ الرجوع"}
                      </button>
                    </div>
                  )}

                  {/* Step 3: Time Selection */}
                  {step === 3 && (
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
                            onClick={() => setStep(2)}
                            className="mt-4 text-primary-600 hover:text-primary-700 font-medium"
                          >
                            {lang === "en" ? "Choose another date" : "اختر تاريخاً آخر"}
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
                                setStep(4);
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
                        onClick={() => setStep(2)}
                        className="mt-6 text-primary-600 hover:text-primary-700 font-medium"
                      >
                        {lang === "en" ? "← Back" : "→ الرجوع"}
                      </button>
                    </div>
                  )}

                  {/* Step 4: Confirm & Form */}
                  {step === 4 && (
                    <div>
                      {/* Summary */}
                      <div className="bg-gray-50 rounded-xl p-6 mb-8">
                        <h3 className="font-bold text-secondary-800 mb-4">
                          {lang === "en" ? "Booking Summary" : "ملخص الحجز"}
                        </h3>
                        <div className="space-y-2 text-sm">
                          <p className="text-gray-600">
                            <span className="font-medium text-secondary-700">
                              {lang === "en" ? "Service:" : "الخدمة:"}
                            </span>{" "}
                            {selectedService}
                          </p>
                          <p className="text-gray-600">
                            <span className="font-medium text-secondary-700">
                              {lang === "en" ? "Date:" : "التاريخ:"}
                            </span>{" "}
                            {selectedDate}
                          </p>
                          <p className="text-gray-600">
                            <span className="font-medium text-secondary-700">
                              {lang === "en" ? "Time:" : "الوقت:"}
                            </span>{" "}
                            {selectedTime}
                          </p>
                        </div>
                      </div>

                      {/* Form Fields */}
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
                          <input
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => {
                              setFormData((prev) => ({ ...prev, phone: e.target.value }));
                              setErrors((prev) => ({ ...prev, phone: "" }));
                            }}
                            className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none transition-colors ${
                              errors.phone
                                ? "border-red-500 focus:border-red-500"
                                : "border-gray-200 focus:border-primary-500"
                            }`}
                            placeholder="+966 5X XXX XXXX"
                          />
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
                          onClick={() => setStep(3)}
                          className="px-6 py-3 border-2 border-gray-200 text-secondary-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
                        >
                          {lang === "en" ? "← Back" : "→ الرجوع"}
                        </button>
                        <button
                          type="submit"
                          disabled={submitting}
                          className="flex-1 flex items-center justify-center gap-2 px-8 py-3 bg-primary-500 hover:bg-primary-600 disabled:bg-primary-300 text-white rounded-xl font-semibold transition-colors"
                        >
                          {submitting ? (
                            <>
                              <Loader2 className="w-5 h-5 animate-spin" />
                              {t.booking.submitting}
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-5 h-5" />
                              {t.booking.submit}
                            </>
                          )}
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
