import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Globe, Smile } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { translations } from "../data/translations";

const Navbar = () => {
  const { lang, toggleLang } = useLanguage();
  const t = translations[lang];
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { label: t.nav.home, href: "#home" },
    { label: t.nav.services, href: "#services" },
    { label: t.nav.doctors, href: "#doctors" },
    { label: t.nav.booking, href: "#booking" },
    { label: t.nav.contact, href: "#contact" },
  ];

  const scrollToSection = (href) => {
    const el = document.querySelector(href);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
    setMobileOpen(false);
  };

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/80 backdrop-blur-md shadow-lg"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo */}
          <motion.a
            href="#home"
            className="flex items-center gap-2 cursor-pointer"
            whileHover={{ scale: 1.05 }}
            onClick={(e) => {
              e.preventDefault();
              scrollToSection("#home");
            }}
          >
            <div className="w-10 h-10 bg-primary-500 rounded-xl flex items-center justify-center">
              <Smile className="w-6 h-6 text-white" />
            </div>
            <span className={`text-xl font-bold ${scrolled ? "text-secondary-800" : "text-white"}`}>
              SmileCare
            </span>
          </motion.a>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <button
                key={link.href}
                onClick={() => scrollToSection(link.href)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-primary-500/10 ${
                  scrolled ? "text-secondary-700" : "text-white/90 hover:text-white"
                }`}
              >
                {link.label}
              </button>
            ))}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3">
            {/* Language Toggle */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={toggleLang}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                scrolled
                  ? "text-secondary-700 hover:bg-gray-100"
                  : "text-white hover:bg-white/10"
              }`}
            >
              <Globe className="w-4 h-4" />
              {lang === "en" ? "عربي" : "EN"}
            </motion.button>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className={`lg:hidden p-2 rounded-lg ${
                scrolled ? "text-secondary-700" : "text-white"
              }`}
            >
              {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-white/95 backdrop-blur-md border-t"
          >
            <div className="px-4 py-4 space-y-1">
              {navLinks.map((link) => (
                <button
                  key={link.href}
                  onClick={() => scrollToSection(link.href)}
                  className="block w-full text-start px-4 py-3 rounded-lg text-secondary-700 hover:bg-primary-50 font-medium"
                >
                  {link.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
};

export default Navbar;
