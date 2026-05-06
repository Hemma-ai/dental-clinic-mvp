import { motion } from "framer-motion";
import { Monitor, MessageSquare, BarChart3, Users, ExternalLink } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { translations } from "../data/translations";

const DeveloperCTA = () => {
  const { lang } = useLanguage();
  const t = translations[lang];

  // Replace with actual WhatsApp number
  const WHATSAPP_NUMBER = "966123456789";
  const WHATSAPP_MESSAGE = encodeURIComponent(
    lang === "en"
      ? "Hi! I'm interested in building a smart system for my clinic."
      : "مرحباً! أنا مهتم ببناء نظام ذكي لعيادتي."
  );

  const devServices = [
    { icon: Monitor, ...t.developerCTA.services[0] },
    { icon: MessageSquare, ...t.developerCTA.services[1] },
    { icon: BarChart3, ...t.developerCTA.services[2] },
    { icon: Users, ...t.developerCTA.services[3] },
  ];

  return (
    <section id="contact" className="py-20 lg:py-28 bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 relative overflow-hidden">
      {/* Decorative */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/4 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-white/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <span className="inline-block px-4 py-1.5 bg-white/20 text-white rounded-full text-sm font-semibold mb-4">
            {lang === "en" ? "Built by Experts" : "بواسطة خبراء"}
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
            {t.developerCTA.title}
          </h2>
          <p className="text-lg text-primary-100 max-w-2xl mx-auto">
            {t.developerCTA.subtitle}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {devServices.map((service, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -5 }}
              className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-colors"
            >
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-4">
                <service.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">{service.title}</h3>
              <p className="text-primary-100 text-sm">{service.description}</p>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <a
            href={`https://wa.me/${WHATSAPP_NUMBER}?text=${WHATSAPP_MESSAGE}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 px-10 py-5 bg-white hover:bg-gray-50 text-primary-700 rounded-2xl font-bold text-lg shadow-xl shadow-black/10 transition-all hover:shadow-2xl"
          >
            <MessageSquare className="w-6 h-6" />
            {t.developerCTA.cta}
            <ExternalLink className="w-5 h-5" />
          </a>
        </motion.div>
      </div>
    </section>
  );
};

export default DeveloperCTA;
