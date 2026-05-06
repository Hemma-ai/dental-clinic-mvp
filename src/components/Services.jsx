import { motion } from "framer-motion";
import { Smile, Sparkles, Braces, Plus, HeartPulse, Baby } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { translations, servicesData } from "../data/translations";

const iconMap = { Smile, Sparkles, Braces, Plus, HeartPulse, Baby };

const Services = () => {
  const { lang } = useLanguage();
  const t = translations[lang];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 },
    },
  };

  return (
    <section id="services" className="py-20 lg:py-28 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-1.5 bg-primary-100 text-primary-700 rounded-full text-sm font-semibold mb-4">
            {lang === "en" ? "What We Offer" : "ما نقدمه"}
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-secondary-800 mb-4">
            {t.services.title}
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            {t.services.subtitle}
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8"
        >
          {t.services.items.map((service, index) => {
            const IconComponent = iconMap[servicesData[index]?.icon || "Tooth"];
            return (
              <motion.div
                key={index}
                variants={itemVariants}
                whileHover={{ y: -8 }}
                className="group bg-white rounded-2xl p-8 shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100"
              >
                <div className={`w-14 h-14 ${servicesData[index]?.color || "bg-primary-500"} rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                  <IconComponent className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-secondary-800 mb-3">
                  {service.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {service.description}
                </p>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
};

export default Services;
