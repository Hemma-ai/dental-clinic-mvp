import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Calendar, ArrowRight } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { translations } from "../data/translations";

const TypewriterText = ({ texts }) => {
  const [currentText, setCurrentText] = useState("");
  const [textIndex, setTextIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const type = () => {
      const fullText = texts[textIndex];

      if (!isDeleting) {
        setCurrentText(fullText.substring(0, charIndex + 1));
        setCharIndex((prev) => prev + 1);

        if (charIndex + 1 === fullText.length) {
          setTimeout(() => setIsDeleting(true), 2000);
        }
      } else {
        setCurrentText(fullText.substring(0, charIndex - 1));
        setCharIndex((prev) => prev - 1);

        if (charIndex - 1 === 0) {
          setIsDeleting(false);
          setTextIndex((prev) => (prev + 1) % texts.length);
        }
      }
    };

    const speed = isDeleting ? 50 : 100;
    const timeout = setTimeout(type, speed);
    return () => clearTimeout(timeout);
  }, [charIndex, isDeleting, textIndex, texts]);

  return (
    <span>
      {currentText}
      <motion.span
        animate={{ opacity: [1, 0] }}
        transition={{ duration: 0.5, repeat: Infinity }}
        className="inline-block w-0.5 h-10 bg-primary-400 ms-1"
      />
    </span>
  );
};

const Hero = () => {
  const { lang } = useLanguage();
  const t = translations[lang];

  const scrollToBooking = () => {
    document.querySelector("#booking")?.scrollIntoView({ behavior: "smooth" });
  };

  const scrollToServices = () => {
    document.querySelector("#services")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section id="home" className="relative min-h-screen flex items-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <img
          src="https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=1920&q=80"
          alt="Dental Clinic"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-secondary-900/90 via-secondary-800/80 to-secondary-700/60" />
      </div>

      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-primary-400/10 rounded-full blur-3xl" />
      </div>

      {/* Content */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-3xl"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full mb-6"
          >
            <div className="w-2 h-2 bg-primary-400 rounded-full animate-pulse" />
            <span className="text-primary-200 text-sm font-medium">
              {lang === "en" ? "Welcome to SmileCare" : "مرحباً بك في سمايل كير"}
            </span>
          </motion.div>

          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold text-white mb-6 leading-tight min-h-[160px] sm:min-h-[120px]">
            <TypewriterText texts={t.hero.typewriter} />
          </h1>

          <p className="text-lg sm:text-xl text-gray-200 mb-10 max-w-2xl leading-relaxed">
            {t.hero.subtitle}
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={scrollToBooking}
              className="inline-flex items-center justify-center gap-3 px-8 py-4 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-semibold text-lg shadow-lg shadow-primary-500/30 transition-colors"
            >
              <Calendar className="w-5 h-5" />
              {t.hero.cta}
              <ArrowRight className="w-5 h-5 rtl:rotate-180" />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={scrollToServices}
              className="inline-flex items-center justify-center gap-3 px-8 py-4 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white rounded-xl font-semibold text-lg border border-white/20 transition-colors"
            >
              {t.hero.secondaryCta}
            </motion.button>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.8 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-6 mt-20"
        >
          {[
            { value: "15+", label: lang === "en" ? "Years Experience" : "سنة خبرة" },
            { value: "10K+", label: lang === "en" ? "Happy Patients" : "مريض سعيد" },
            { value: "6", label: lang === "en" ? "Expert Doctors" : "طبيب متخصص" },
            { value: "98%", label: lang === "en" ? "Satisfaction Rate" : "نسبة الرضا" },
          ].map((stat, i) => (
            <div key={i} className="text-center p-4 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
              <div className="text-3xl font-bold text-primary-400">{stat.value}</div>
              <div className="text-sm text-gray-300 mt-1">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;
