import { useState } from "react";
import { LanguageProvider } from "./context/LanguageContext";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import Services from "./components/Services";
import Doctors from "./components/Doctors";
import Booking from "./components/Booking";
import DeveloperCTA from "./components/DeveloperCTA";
import Chatbot from "./components/Chatbot";
import Footer from "./components/Footer";
import AdminDashboard from "./components/AdminDashboard";

function App() {
  const [showAdmin, setShowAdmin] = useState(false);

  return (
    <LanguageProvider>
      {showAdmin ? (
        <AdminDashboard onBack={() => setShowAdmin(false)} />
      ) : (
        <div className="min-h-screen bg-white">
          <Navbar onAdminClick={() => setShowAdmin(true)} />
          <Hero />
          <Services />
          <Doctors />
          <Booking />
          <DeveloperCTA />
          <Footer />
          <Chatbot />
        </div>
      )}
    </LanguageProvider>
  );
}

export default App;
