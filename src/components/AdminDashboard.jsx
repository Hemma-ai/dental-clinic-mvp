import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, Eye, EyeOff, LogOut, ArrowLeft, Plus, Calendar, Filter,
  CheckCircle, XCircle, Trash2, Edit3, Loader2, Search, X, Users,
  Clock, CalendarCheck, AlertCircle, CalendarDays, MessageSquare, Download, Key
} from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { translations, doctorList } from "../data/translations";
import {
  fetchAllAppointments,
  createAppointment,
  updateAppointment,
  deleteAppointment,
  cancelAppointmentWithReason,
  rescheduleAppointment,
  generateTimeSlots,
  fetchAvailableSlotsForDoctor,
} from "../lib/supabase";

const ADMIN_PASSWORD = "smilecare2025";

const AdminDashboard = ({ onBack }) => {
  const { lang } = useLanguage();
  const t = translations[lang];

  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem("admin-auth") === "true";
  });
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(null);
  const [showRescheduleModal, setShowRescheduleModal] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalStatus, setModalStatus] = useState(null);

  const [cancelReason, setCancelReason] = useState("");

  const [rescheduleData, setRescheduleData] = useState({
    date: "",
    time: "",
    availableSlots: [],
    slotsLoading: false,
  });

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    service: "",
    doctor: "",
    date: "",
    time: "",
    status: "pending",
  });

  const loadAppointments = async () => {
    setLoading(true);
    const result = await fetchAllAppointments();
    if (result.success) {
      setAppointments(result.data || []);
    }
    setLoading(false);
  };

  const handleLogin = async () => {
    setLoginLoading(true);
    setLoginError(false);

    await new Promise((r) => setTimeout(r, 600));

    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      sessionStorage.setItem("admin-auth", "true");
      await loadAppointments();
    } else {
      setLoginError(true);
    }

    setLoginLoading(false);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem("admin-auth");
    setPassword("");
    setAppointments([]);
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadAppointments();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const exportToExcel = () => {
    const headers = lang === "en"
      ? ["Patient Name", "Phone", "Email", "Service", "Doctor", "Date", "Time", "Status", "Cancellation Reason", "Rescheduled Date", "Rescheduled Time"]
      : ["اسم المريض", "الهاتف", "البريد الإلكتروني", "الخدمة", "الطبيب", "التاريخ", "الوقت", "الحالة", "سبب الإلغاء", "تاريخ إعادة الجدولة", "وقت إعادة الجدولة"];

    const statusLabels = {
      pending: lang === "en" ? "Pending" : "قيد الانتظار",
      confirmed: lang === "en" ? "Confirmed" : "مؤكد",
      canceled: lang === "en" ? "Canceled" : "ملغي",
      cancelled: lang === "en" ? "Canceled" : "ملغي",
      rescheduled: lang === "en" ? "Rescheduled" : "معاد جدولته",
    };

    const rows = filteredAppointments.map((apt) => [
      apt.patient_name || "",
      apt.phone || "",
      apt.email || "",
      apt.service || "",
      apt.doctor_name || "",
      apt.date || "",
      apt.time_slot || "",
      statusLabels[apt.status] || apt.status || "",
      apt.cancellation_reason || "",
      apt.rescheduled_date || "",
      apt.rescheduled_time || "",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");

    const bom = "\uFEFF";
    const blob = new Blob([bom + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `appointments_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const filteredAppointments = appointments.filter((apt) => {
    const today = new Date().toISOString().split("T")[0];

    if (filter === "today") return apt.date === today;
    if (filter === "upcoming") return apt.date >= today;
    if (filter === "confirmed") return apt.status === "confirmed";
    if (filter === "pending") return apt.status === "pending";
    if (filter === "cancelled") return apt.status === "canceled" || apt.status === "cancelled";
    if (filter === "rescheduled") return apt.status === "rescheduled";

    return true;
  }).filter((apt) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      apt.patient_name?.toLowerCase().includes(q) ||
      apt.phone?.includes(q)
    );
  });

  const today = new Date().toISOString().split("T")[0];
  const stats = {
    total: appointments.length,
    pending: appointments.filter((a) => a.status === "pending").length,
    confirmed: appointments.filter((a) => a.status === "confirmed").length,
    rescheduled: appointments.filter((a) => a.status === "rescheduled").length,
    todayCount: appointments.filter((a) => a.date === today).length,
  };

  const resetFormData = () => {
    setFormData({ name: "", phone: "", email: "", service: "", doctor: "", date: "", time: "", status: "pending" });
    setModalStatus(null);
  };

  const handleAddAppointment = async () => {
    setModalLoading(true);
    setModalStatus(null);

    const result = await createAppointment({
      service: formData.service,
      doctorName: formData.doctor,
      date: formData.date,
      timeSlot: formData.time,
      name: formData.name,
      phone: formData.phone,
      email: formData.email,
    });

    setModalLoading(false);

    if (result.success) {
      setModalStatus({ type: "success", message: t.admin.modal.createSuccess });
      await loadAppointments();
      setTimeout(() => {
        setShowAddModal(false);
        resetFormData();
      }, 1500);
    } else {
      setModalStatus({ type: "error", message: t.admin.modal.createError });
    }
  };

  const handleEditAppointment = async () => {
    setModalLoading(true);
    setModalStatus(null);

    const result = await updateAppointment(showEditModal, {
      service: formData.service,
      doctor_name: formData.doctor,
      date: formData.date,
      time_slot: formData.time,
      patient_name: formData.name,
      phone: formData.phone,
      email: formData.email,
      status: formData.status,
    });

    setModalLoading(false);

    if (result.success) {
      setModalStatus({ type: "success", message: t.admin.modal.updateSuccess });
      await loadAppointments();
      setTimeout(() => {
        setShowEditModal(false);
        resetFormData();
      }, 1500);
    } else {
      setModalStatus({ type: "error", message: t.admin.modal.updateError });
    }
  };

  const handleDeleteAppointment = async () => {
    setModalLoading(true);

    const result = await deleteAppointment(showDeleteModal);

    setModalLoading(false);

    if (result.success) {
      await loadAppointments();
      setShowDeleteModal(null);
    }
  };

  const handleConfirmStatus = async (id) => {
    await updateAppointment(id, { status: "confirmed" });
    await loadAppointments();
  };

  const openCancelModal = (apt) => {
    setCancelReason("");
    setModalStatus(null);
    setShowCancelModal(apt);
  };

  const handleCancelAppointment = async () => {
    if (!cancelReason.trim()) return;

    console.log("[Admin] Cancel appointment:", {
      id: showCancelModal?.id,
      reason: cancelReason,
      appointment: showCancelModal,
    });

    if (!showCancelModal?.id) {
      console.error("[Admin] No appointment ID found for cancellation");
      setModalStatus({ type: "error", message: t.cancel.error });
      return;
    }

    setModalLoading(true);

    const result = await cancelAppointmentWithReason(showCancelModal.id, cancelReason);

    setModalLoading(false);

    if (result.success) {
      setModalStatus({ type: "success", message: t.cancel.success });
      await loadAppointments();
      setTimeout(() => {
        setShowCancelModal(null);
        setCancelReason("");
      }, 1500);
    } else {
      setModalStatus({ type: "error", message: t.cancel.error });
    }
  };

  const openRescheduleModal = async (apt) => {
    setRescheduleData({ date: "", time: "", availableSlots: [], slotsLoading: false });
    setModalStatus(null);
    setShowRescheduleModal(apt);
  };

  const handleRescheduleDateChange = async (dateStr) => {
    setRescheduleData((prev) => ({ ...prev, date: dateStr, time: "", slotsLoading: true }));

    const selectedDateObj = new Date(dateStr + "T00:00:00");
    const doctorName = showRescheduleModal?.doctor_name || "Unassigned";
    const slots = await fetchAvailableSlotsForDoctor(selectedDateObj, doctorName);
    const generatedSlots = generateTimeSlots(selectedDateObj);
    const finalSlots = slots.length > 0 ? slots : generatedSlots;

    setRescheduleData((prev) => ({
      ...prev,
      availableSlots: finalSlots,
      slotsLoading: false,
    }));
  };

  const handleRescheduleAppointment = async () => {
    if (!rescheduleData.date || !rescheduleData.time) return;

    setModalLoading(true);

    const result = await rescheduleAppointment(
      showRescheduleModal.id,
      rescheduleData.date,
      rescheduleData.time
    );

    setModalLoading(false);

    if (result.success) {
      setModalStatus({ type: "success", message: t.reschedule.success });
      await loadAppointments();
      setTimeout(() => {
        setShowRescheduleModal(null);
      }, 1500);
    } else {
      setModalStatus({ type: "error", message: t.reschedule.error });
    }
  };

  const openEditModal = (apt) => {
    setFormData({
      name: apt.patient_name || "",
      phone: apt.phone || "",
      email: apt.email || "",
      service: apt.service || "",
      doctor: apt.doctor_name || "",
      date: apt.date || "",
      time: apt.time_slot || "",
      status: apt.status || "pending",
    });
    setShowEditModal(apt.id);
    setModalStatus(null);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr + "T00:00:00");
      return d.toLocaleDateString(lang === "en" ? "en-US" : "ar-SA", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: "bg-yellow-100 text-yellow-700",
      confirmed: "bg-green-100 text-green-700",
      canceled: "bg-red-100 text-red-700",
      cancelled: "bg-red-100 text-red-700",
      rescheduled: "bg-blue-100 text-blue-700",
    };
    const labels = {
      pending: t.admin.table.pending,
      confirmed: t.admin.table.confirmed,
      canceled: t.admin.table.cancelled,
      cancelled: t.admin.table.cancelled,
      rescheduled: t.admin.table.rescheduled,
    };
    return (
      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${styles[status] || styles.pending}`}>
        {labels[status] || status}
      </span>
    );
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-secondary-800 via-secondary-900 to-secondary-900 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-primary-500 to-primary-600 p-8 text-center">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-white">{t.admin.login.title}</h1>
              <p className="text-primary-100 mt-2 text-sm">{t.admin.login.subtitle}</p>
            </div>

            <div className="p-8">
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-2">
                    {t.admin.login.passwordLabel}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setLoginError(false);
                      }}
                      onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                      placeholder={t.admin.login.passwordPlaceholder}
                      className={`w-full px-4 py-3 pe-12 border-2 rounded-xl focus:outline-none transition-colors ${
                        loginError
                          ? "border-red-500 focus:border-red-500"
                          : "border-gray-200 focus:border-primary-500"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {loginError && (
                    <p className="mt-2 text-red-500 text-sm flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {t.admin.login.error}
                    </p>
                  )}
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                  <Key className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-amber-800">
                      {lang === "en" ? "Demo Password:" : "كلمة المرور للتجربة:"}
                    </p>
                    <p className="text-lg font-mono font-bold text-amber-900 mt-1 select-all">
                      {ADMIN_PASSWORD}
                    </p>
                    <p className="text-xs text-amber-600 mt-1">
                      {lang === "en" ? "For testing purposes only" : "لأغراض التجربة فقط"}
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleLogin}
                  disabled={loginLoading || !password}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary-500 hover:bg-primary-600 disabled:bg-gray-300 text-white rounded-xl font-semibold transition-colors"
                >
                  {loginLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {t.admin.login.loggingIn}
                    </>
                  ) : (
                    <>
                      <Shield className="w-5 h-5" />
                      {t.admin.login.loginBtn}
                    </>
                  )}
                </button>

                <button
                  onClick={onBack}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 border-2 border-gray-200 text-secondary-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
                  {t.admin.login.backToSite}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="flex items-center gap-2 text-gray-600 hover:text-secondary-700 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
                <span className="hidden sm:inline">{t.admin.dashboard.backToSite}</span>
              </button>
              <div className="h-6 w-px bg-gray-200" />
              <h1 className="text-lg font-bold text-secondary-800">{t.admin.dashboard.title}</h1>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={loadAppointments}
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-secondary-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Filter className="w-4 h-4" />
                {t.admin.dashboard.refresh}
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                {t.admin.dashboard.logout}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          {[
            { icon: <Calendar className="w-6 h-6" />, value: stats.total, label: t.admin.dashboard.totalAppointments, color: "bg-secondary-600" },
            { icon: <Clock className="w-6 h-6" />, value: stats.pending, label: t.admin.dashboard.pending, color: "bg-yellow-500" },
            { icon: <CalendarCheck className="w-6 h-6" />, value: stats.confirmed, label: t.admin.dashboard.confirmed, color: "bg-green-500" },
            { icon: <CalendarDays className="w-6 h-6" />, value: stats.rescheduled, label: t.admin.dashboard.rescheduled, color: "bg-blue-500" },
            { icon: <Users className="w-6 h-6" />, value: stats.todayCount, label: t.admin.dashboard.today, color: "bg-primary-500" },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white rounded-xl p-5 shadow-sm border border-gray-100"
            >
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 ${stat.color} rounded-xl flex items-center justify-center text-white`}>
                  {stat.icon}
                </div>
                <div>
                  <div className="text-2xl font-bold text-secondary-800">{stat.value}</div>
                  <div className="text-sm text-gray-500">{stat.label}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex flex-wrap gap-2">
              {[
                { key: "all", label: t.admin.dashboard.all },
                { key: "today", label: t.admin.dashboard.todayFilter },
                { key: "upcoming", label: t.admin.dashboard.upcoming },
                { key: "confirmed", label: t.admin.dashboard.confirmedFilter },
                { key: "pending", label: t.admin.dashboard.pendingFilter },
                { key: "cancelled", label: t.admin.dashboard.cancelFilter },
                { key: "rescheduled", label: t.admin.dashboard.rescheduledFilter },
              ].map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filter === f.key
                      ? "bg-primary-500 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="flex gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-none">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t.admin.dashboard.searchPlaceholder}
                  className="w-full sm:w-64 ps-10 pe-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary-500"
                />
              </div>
              <button
                onClick={exportToExcel}
                disabled={filteredAppointments.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
              >
                <Download className="w-4 h-4" />
                {lang === "en" ? "Export CSV" : "تصدير CSV"}
              </button>
              <button
                onClick={() => {
                  resetFormData();
                  setShowAddModal(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                {t.admin.dashboard.addAppointment}
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
            </div>
          ) : filteredAppointments.length === 0 ? (
            <div className="text-center py-20">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">{t.admin.dashboard.noAppointments}</p>
            </div>
          ) : (
            <>
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="text-start px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t.admin.table.name}</th>
                      <th className="text-start px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t.admin.table.phone}</th>
                      <th className="text-start px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t.admin.table.service}</th>
                      <th className="text-start px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t.admin.table.doctor}</th>
                      <th className="text-start px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t.admin.table.date}</th>
                      <th className="text-start px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t.admin.table.time}</th>
                      <th className="text-start px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t.admin.table.status}</th>
                      <th className="text-start px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t.admin.table.actions}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredAppointments.map((apt) => (
                      <tr key={apt.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 font-medium text-secondary-800">{apt.patient_name}</td>
                        <td className="px-6 py-4 text-gray-600">{apt.phone}</td>
                        <td className="px-6 py-4 text-gray-600">{apt.service}</td>
                        <td className="px-6 py-4 text-gray-600">{apt.doctor_name}</td>
                        <td className="px-6 py-4 text-gray-600">{formatDate(apt.date)}</td>
                        <td className="px-6 py-4 text-gray-600">{apt.time_slot}</td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            {getStatusBadge(apt.status)}
                            {apt.cancellation_reason && (
                              <span className="text-xs text-gray-500 flex items-center gap-1" title={apt.cancellation_reason}>
                                <MessageSquare className="w-3 h-3" />
                                {apt.cancellation_reason.length > 20
                                  ? apt.cancellation_reason.slice(0, 20) + "..."
                                  : apt.cancellation_reason}
                              </span>
                            )}
                            {apt.status === "rescheduled" && apt.rescheduled_date && (
                              <span className="text-xs text-blue-500">
                                {formatDate(apt.rescheduled_date)} {apt.rescheduled_time}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1">
                            {apt.status === "pending" && (
                              <>
                                <button
                                  onClick={() => handleConfirmStatus(apt.id)}
                                  className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                  title={t.admin.table.confirm}
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => openCancelModal(apt)}
                                  className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                                  title={t.admin.table.cancel}
                                >
                                  <XCircle className="w-4 h-4" />
                                </button>
                              </>
                            )}
                            {apt.status === "confirmed" && (
                              <button
                                onClick={() => openRescheduleModal(apt)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title={t.admin.table.reschedule}
                              >
                                <CalendarDays className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => openEditModal(apt)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title={t.admin.table.edit}
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setShowDeleteModal(apt.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title={t.admin.table.delete}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="lg:hidden divide-y divide-gray-100">
                {filteredAppointments.map((apt) => (
                  <div key={apt.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-secondary-800">{apt.patient_name}</h3>
                        <p className="text-sm text-gray-500">{apt.phone}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {getStatusBadge(apt.status)}
                        {apt.cancellation_reason && (
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" />
                            {apt.cancellation_reason.length > 15
                              ? apt.cancellation_reason.slice(0, 15) + "..."
                              : apt.cancellation_reason}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <p className="text-gray-600"><span className="font-medium">{t.admin.table.service}:</span> {apt.service}</p>
                      <p className="text-gray-600"><span className="font-medium">{t.admin.table.doctor}:</span> {apt.doctor_name}</p>
                      <p className="text-gray-600"><span className="font-medium">{t.admin.table.date}:</span> {formatDate(apt.date)}</p>
                      <p className="text-gray-600"><span className="font-medium">{t.admin.table.time}:</span> {apt.time_slot}</p>
                    </div>
                    <div className="flex items-center gap-2 pt-2 border-t">
                      {apt.status === "pending" && (
                        <button onClick={() => handleConfirmStatus(apt.id)} className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-green-50 text-green-700 rounded-lg text-sm font-medium">
                          <CheckCircle className="w-4 h-4" />{t.admin.table.confirm}
                        </button>
                      )}
                      {apt.status === "pending" && (
                        <button onClick={() => openCancelModal(apt)} className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-orange-50 text-orange-700 rounded-lg text-sm font-medium">
                          <XCircle className="w-4 h-4" />{t.admin.table.cancel}
                        </button>
                      )}
                      <button onClick={() => openEditModal(apt)} className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium">
                        <Edit3 className="w-4 h-4" />{t.admin.table.edit}
                      </button>
                      <button onClick={() => setShowDeleteModal(apt.id)} className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-red-50 text-red-700 rounded-lg text-sm font-medium">
                        <Trash2 className="w-4 h-4" />{t.admin.table.delete}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <AppointmentModal
        isOpen={showAddModal}
        onClose={() => { setShowAddModal(false); resetFormData(); }}
        onSubmit={handleAddAppointment}
        loading={modalLoading}
        status={modalStatus}
        formData={formData}
        setFormData={setFormData}
        title={t.admin.modal.addTitle}
        lang={lang}
        t={t}
      />

      <AppointmentModal
        isOpen={!!showEditModal}
        onClose={() => { setShowEditModal(false); resetFormData(); }}
        onSubmit={handleEditAppointment}
        loading={modalLoading}
        status={modalStatus}
        formData={formData}
        setFormData={setFormData}
        title={t.admin.modal.editTitle}
        lang={lang}
        t={t}
        isEdit
      />

      <AnimatePresence>
        {showCancelModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => { setShowCancelModal(null); setCancelReason(""); }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl p-6 w-full max-w-md"
            >
              <div className="w-14 h-14 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-7 h-7 text-orange-600" />
              </div>
              <h3 className="text-xl font-bold text-secondary-800 text-center mb-2">
                {t.cancel.title}
              </h3>
              <p className="text-gray-500 text-center text-sm mb-4">
                {lang === "en" ? `Cancelling appointment for ${showCancelModal.patient_name}` : `إلغاء موعد ${showCancelModal.patient_name}`}
              </p>

              {modalStatus && (
                <div className={`mb-4 p-3 rounded-xl text-sm flex items-center gap-2 ${
                  modalStatus.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                }`}>
                  {modalStatus.type === "success" ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  {modalStatus.message}
                </div>
              )}

              <div className="mb-6">
                <label className="block text-sm font-medium text-secondary-700 mb-2">
                  {t.cancel.reasonLabel} *
                </label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder={t.cancel.reasonPlaceholder}
                  rows={3}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none resize-none"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => { setShowCancelModal(null); setCancelReason(""); }}
                  className="flex-1 py-3 border-2 border-gray-200 text-secondary-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
                >
                  {t.admin.modal.cancelBtn}
                </button>
                <button
                  onClick={handleCancelAppointment}
                  disabled={modalLoading || !cancelReason.trim()}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-300 text-white rounded-xl font-semibold transition-colors"
                >
                  {modalLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                  {modalLoading ? t.cancel.cancelling : t.cancel.cancelBtn}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showRescheduleModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowRescheduleModal(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl p-6 w-full max-w-md"
            >
              <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CalendarDays className="w-7 h-7 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-secondary-800 text-center mb-2">
                {t.reschedule.title}
              </h3>
              <p className="text-gray-500 text-center text-sm mb-4">
                {lang === "en" ? `Rescheduling appointment for ${showRescheduleModal.patient_name}` : `إعادة جدولة موعد ${showRescheduleModal.patient_name}`}
              </p>
              <p className="text-xs text-gray-400 text-center mb-4">
                {lang === "en" ? "Current:" : "الحالي:"} {formatDate(showRescheduleModal.date)} {showRescheduleModal.time_slot}
              </p>

              {modalStatus && (
                <div className={`mb-4 p-3 rounded-xl text-sm flex items-center gap-2 ${
                  modalStatus.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                }`}>
                  {modalStatus.type === "success" ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  {modalStatus.message}
                </div>
              )}

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-2">
                    {t.reschedule.newDateLabel}
                  </label>
                  <input
                    type="date"
                    value={rescheduleData.date}
                    onChange={(e) => handleRescheduleDateChange(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-2">
                    {t.reschedule.newTimeLabel}
                  </label>
                  {rescheduleData.slotsLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="w-5 h-5 text-primary-500 animate-spin" />
                    </div>
                  ) : rescheduleData.availableSlots.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-2">{t.reschedule.noSlots}</p>
                  ) : (
                    <div className="grid grid-cols-4 gap-2">
                      {rescheduleData.availableSlots.map((slot) => (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => setRescheduleData((prev) => ({ ...prev, time: slot }))}
                          className={`py-2 px-3 rounded-lg border-2 text-xs font-medium transition-all ${
                            rescheduleData.time === slot
                              ? "border-primary-500 bg-primary-500 text-white"
                              : "border-gray-200 hover:border-primary-300 text-secondary-700"
                          }`}
                        >
                          {slot}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowRescheduleModal(null)}
                  className="flex-1 py-3 border-2 border-gray-200 text-secondary-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
                >
                  {t.admin.modal.cancelBtn}
                </button>
                <button
                  onClick={handleRescheduleAppointment}
                  disabled={modalLoading || !rescheduleData.date || !rescheduleData.time}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-xl font-semibold transition-colors"
                >
                  {modalLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                  {modalLoading ? t.reschedule.rescheduling : t.reschedule.rescheduleBtn}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDeleteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowDeleteModal(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl p-6 w-full max-w-sm"
            >
              <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-7 h-7 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-secondary-800 text-center mb-2">
                {t.admin.modal.deleteTitle}
              </h3>
              <p className="text-gray-600 text-center text-sm mb-6">
                {t.admin.modal.deleteConfirm}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteModal(null)}
                  className="flex-1 py-3 border-2 border-gray-200 text-secondary-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
                >
                  {t.admin.modal.cancelBtn}
                </button>
                <button
                  onClick={handleDeleteAppointment}
                  disabled={modalLoading}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white rounded-xl font-semibold transition-colors"
                >
                  {modalLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                  {t.admin.modal.deleteBtn}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const AppointmentModal = ({ isOpen, onClose, onSubmit, loading, status, formData, setFormData, title, lang, t, isEdit }) => {
  const [availableSlots, setAvailableSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);

  useEffect(() => {
    if (formData.date && formData.doctor) {
      setSlotsLoading(true);
      fetchAvailableSlotsForDoctor(new Date(formData.date + "T00:00:00"), formData.doctor)
        .then((slots) => {
          setAvailableSlots(slots);
          if (!slots.includes(formData.time)) {
            setFormData((p) => ({ ...p, time: "" }));
          }
        })
        .finally(() => setSlotsLoading(false));
    } else {
      setAvailableSlots(formData.date ? generateTimeSlots(new Date(formData.date + "T00:00:00")) : []);
    }
  }, [formData.date, formData.doctor]);

  const timeSlots = availableSlots;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl w-full max-w-lg flex flex-col"
            style={{ maxHeight: "90vh" }}
          >
            <div className="flex items-center justify-between p-6 border-b shrink-0">
              <h2 className="text-xl font-bold text-secondary-800">{title}</h2>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {status && (
              <div className={`mx-6 mt-4 p-3 rounded-xl text-sm flex items-center gap-2 shrink-0 ${
                status.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
              }`}>
                {status.type === "success" ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                {status.message}
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1.5">{t.admin.form.name}</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                  placeholder={t.admin.form.namePlaceholder}
                  className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1.5">{t.admin.form.phone}</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))}
                  placeholder={t.admin.form.phonePlaceholder}
                  className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1.5">{t.admin.form.email}</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                  placeholder={t.admin.form.emailPlaceholder}
                  className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1.5">{t.admin.form.service}</label>
                <select
                  value={formData.service}
                  onChange={(e) => setFormData((p) => ({ ...p, service: e.target.value }))}
                  className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none bg-white"
                >
                  <option value="">{t.admin.form.selectService}</option>
                  {t.services.items.map((s, i) => (
                    <option key={i} value={s.title}>{s.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1.5">{t.admin.form.doctor}</label>
                <select
                  value={formData.doctor}
                  onChange={(e) => setFormData((p) => ({ ...p, doctor: e.target.value }))}
                  className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none bg-white"
                >
                  <option value="">{t.admin.form.selectDoctor}</option>
                  {doctorList.map((d) => (
                    <option key={d.id} value={lang === "en" ? d.nameEn : d.nameAr}>
                      {lang === "en" ? d.nameEn : d.nameAr}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1.5">{t.admin.form.date}</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => {
                      setFormData((p) => ({ ...p, date: e.target.value, time: "" }));
                    }}
                    min={new Date().toISOString().split("T")[0]}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1.5">{t.admin.form.time}</label>
                  <select
                    value={formData.time}
                    onChange={(e) => setFormData((p) => ({ ...p, time: e.target.value }))}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none bg-white"
                  >
                    <option value="">{t.admin.form.selectTime}</option>
                    {timeSlots.map((slot) => (
                      <option key={slot} value={slot}>{slot}</option>
                    ))}
                  </select>
                </div>
              </div>

              {isEdit && (
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1.5">{t.admin.form.status}</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData((p) => ({ ...p, status: e.target.value }))}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none bg-white"
                  >
                    <option value="pending">{t.admin.table.pending}</option>
                    <option value="confirmed">{t.admin.table.confirmed}</option>
                    <option value="canceled">{t.admin.table.cancelled}</option>
                    <option value="rescheduled">{t.admin.table.rescheduled}</option>
                  </select>
                </div>
              )}
            </div>

            <div className="flex gap-3 p-6 border-t">
              <button
                onClick={onClose}
                className="flex-1 py-3 border-2 border-gray-200 text-secondary-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
              >
                {t.admin.modal.cancelBtn}
              </button>
              <button
                onClick={onSubmit}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-primary-500 hover:bg-primary-600 disabled:bg-gray-300 text-white rounded-xl font-semibold transition-colors"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                {loading ? t.admin.modal.saving : t.admin.modal.save}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AdminDashboard;
