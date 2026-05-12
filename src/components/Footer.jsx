import { useLanguage } from "../context/LanguageContext";
import { translations } from "../data/translations";
import { Smile } from "lucide-react";

const Footer = () => {
  const { lang } = useLanguage();
  const t = translations[lang];

  return (
    <footer className="bg-secondary-900 text-gray-400 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
              <Smile className="w-5 h-5 text-white" />
            </div>
            <span className="text-white font-bold">SmileCare</span>
          </div>
          <p className="text-sm text-center">{t.footer.rights}</p>
          <div />
        </div>
      </div>
    </footer>
  );
};

export default Footer;
