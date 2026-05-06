import { motion } from "framer-motion";
import { Award, Clock } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { translations, doctorsAvatars } from "../data/translations";

const Doctors = () => {
  const { lang } = useLanguage();
  const t = translations[lang];

  return (
    <section id="doctors" className="py-20 lg:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-1.5 bg-secondary-100 text-secondary-700 rounded-full text-sm font-semibold mb-4">
            {lang === "en" ? "Expert Team" : "فريق الخبراء"}
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-secondary-800 mb-4">
            {t.doctors.title}
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            {t.doctors.subtitle}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {t.doctors.items.map((doctor, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              whileHover={{ y: -10 }}
              className="group relative bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100"
            >
              {/* Image */}
              <div className="relative h-72 overflow-hidden">
                <img
                  src={doctorsAvatars[index]}
                  alt={doctor.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-secondary-900/80 via-transparent to-transparent" />
                <div className="absolute bottom-4 start-4 end-4">
                  <h3 className="text-lg font-bold text-white">{doctor.name}</h3>
                  <p className="text-primary-300 text-sm">{doctor.specialty}</p>
                </div>
              </div>

              {/* Info */}
              <div className="p-5">
                <div className="flex items-center gap-2 text-gray-600">
                  <Award className="w-4 h-4 text-primary-500" />
                  <span className="text-sm">{doctor.specialty}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600 mt-2">
                  <Clock className="w-4 h-4 text-primary-500" />
                  <span className="text-sm">{doctor.experience}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Doctors;
