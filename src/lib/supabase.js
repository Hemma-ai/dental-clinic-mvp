import { createClient } from "@supabase/supabase-js";

/*
 * SUPABASE SETUP INSTRUCTIONS:
 * 
 * 1. Create a Supabase project at https://supabase.com
 * 2. Copy your Project URL and anon key from Settings > API
 * 3. Replace the values below with your actual credentials
 * 4. Or better: create a .env file with:
 *    VITE_SUPABASE_URL=your_project_url
 *    VITE_SUPABASE_ANON_KEY=your_anon_key
 *
 * REQUIRED DATABASE TABLES:
 * 
 * Table: appointments
 * - id: uuid (primary key, default: gen_random_uuid())
 * - created_at: timestamp (default: now())
 * - service: text (not null)
 * - doctor_name: text (not null)
 * - date: date (not null)
 * - time_slot: text (not null)
 * - patient_name: text (not null)
 * - phone: text (not null)
 * - email: text (nullable)
 * - status: text (default: 'pending') -- values: 'pending', 'confirmed', 'rescheduled', 'canceled'
 * - cancellation_reason: text (nullable)
 * - rescheduled_date: date (nullable)
 * - rescheduled_time: text (nullable)
 *
 * Table: otp_requests
 * - id: uuid (primary key, default: gen_random_uuid())
 * - created_at: timestamp (default: now())
 * - phone: text (not null)
 * - otp_code: text (not null)
 * - is_verified: boolean (default: false)
 * - expires_at: timestamp (default: now() + interval '10 minutes')
 *
 * Row Level Security (RLS) Policies:
 * - Enable RLS on both tables
 * - appointments: SELECT, INSERT, UPDATE, DELETE for anon
 * - otp_requests: SELECT, INSERT for anon
 */

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://your-project.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "your-anon-key";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Clinic working hours configuration
export const CLINIC_HOURS = {
  startHour: 9, // 9:00 AM
  endHour: 18,  // 6:00 PM
  slotDuration: 30, // minutes
  closedDays: [5], // Friday (0=Sunday, 5=Friday, 6=Saturday)
};

// Generate time slots for a given date
export const generateTimeSlots = (date) => {
  const slots = [];
  const day = date.getDay();
  
  if (CLINIC_HOURS.closedDays.includes(day)) {
    return [];
  }

  for (let hour = CLINIC_HOURS.startHour; hour < CLINIC_HOURS.endHour; hour++) {
    for (let min = 0; min < 60; min += CLINIC_HOURS.slotDuration) {
      const h = hour.toString().padStart(2, "0");
      const m = min.toString().padStart(2, "0");
      slots.push(`${h}:${m}`);
    }
  }

  return slots;
};

// Fetch available slots for a specific doctor on a specific date
// Filters out slots that are already booked (pending or confirmed) for that doctor
export const fetchAvailableSlotsForDoctor = async (date, doctorName) => {
  try {
    const dateStr = date.toISOString().split("T")[0];

    const { data: bookedSlots, error } = await supabase
      .from("appointments")
      .select("time_slot")
      .eq("date", dateStr)
      .eq("doctor_name", doctorName)
      .in("status", ["pending", "confirmed"]);

    if (error) {
      console.error("Error fetching slots:", error);
      return generateTimeSlots(date);
    }

    const allSlots = generateTimeSlots(date);
    const booked = bookedSlots?.map((s) => s.time_slot) || [];

    return allSlots.filter((slot) => !booked.includes(slot));
  } catch (err) {
    console.error("Error:", err);
    return generateTimeSlots(date);
  }
};

// Legacy fallback (without doctor filter)
export const fetchAvailableSlots = async (date) => {
  try {
    const dateStr = date.toISOString().split("T")[0];

    const { data: bookedSlots, error } = await supabase
      .from("appointments")
      .select("time_slot")
      .eq("date", dateStr)
      .in("status", ["pending", "confirmed"]);

    if (error) {
      console.error("Error fetching slots:", error);
      return generateTimeSlots(date);
    }

    const allSlots = generateTimeSlots(date);
    const booked = bookedSlots?.map((s) => s.time_slot) || [];

    return allSlots.filter((slot) => !booked.includes(slot));
  } catch (err) {
    console.error("Error:", err);
    return generateTimeSlots(date);
  }
};

// Generate a random 4-digit OTP code
export const generateOTP = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

// Insert an OTP request into Supabase
// The external backend will listen to this and send via WhatsApp
export const insertOTPRequest = async (phone) => {
  try {
    const otpCode = generateOTP();

    const { data, error } = await supabase
      .from("otp_requests")
      .insert([
        {
          phone,
          otp_code: otpCode,
          is_verified: false,
        },
      ])
      .select();

    if (error) throw error;
    // In production, return the OTP only for testing.
    // The backend should handle sending it via WhatsApp.
    return { success: true, data, otpCode };
  } catch (error) {
    console.error("Error inserting OTP request:", error);
    return { success: false, error, otpCode: null };
  }
};

// Verify the OTP code against the latest unverified request for a phone number
export const verifyOTPCode = async (phone, otpCode) => {
  try {
    const { data, error } = await supabase
      .from("otp_requests")
      .select("*")
      .eq("phone", phone)
      .eq("otp_code", otpCode)
      .eq("is_verified", false)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) throw error;

    if (!data || data.length === 0) {
      return { success: false, message: "invalid_otp" };
    }

    // Mark as verified
    const { error: updateError } = await supabase
      .from("otp_requests")
      .update({ is_verified: true })
      .eq("id", data[0].id);

    if (updateError) throw updateError;

    return { success: true, message: "verified" };
  } catch (error) {
    console.error("Error verifying OTP:", error);
    return { success: false, message: "error" };
  }
};

// Insert a new appointment into Supabase
export const createAppointment = async (appointmentData) => {
  try {
    const { data, error } = await supabase
      .from("appointments")
      .insert([
        {
          service: appointmentData.service,
          doctor_name: appointmentData.doctorName || "Unassigned",
          date: appointmentData.date,
          time_slot: appointmentData.timeSlot,
          patient_name: appointmentData.name,
          phone: appointmentData.phone,
          email: appointmentData.email || null,
          status: appointmentData.status || "pending",
        },
      ])
      .select();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error("Error creating appointment:", error);
    return { success: false, error };
  }
};

// Fetch all appointments (for Admin Dashboard)
export const fetchAllAppointments = async () => {
  try {
    const { data, error } = await supabase
      .from("appointments")
      .select("*")
      .order("date", { ascending: true })
      .order("time_slot", { ascending: true });

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error("Error fetching appointments:", error);
    return { success: false, error, data: [] };
  }
};

// Update an appointment status or fields
export const updateAppointment = async (id, updateData) => {
  console.log("[Supabase] updateAppointment called with:", { id, updateData });
  try {
    if (!id) {
      console.error("[Supabase] No ID provided to updateAppointment");
      return { success: false, error: new Error("No appointment ID provided") };
    }
    const { data, error } = await supabase
      .from("appointments")
      .update(updateData)
      .eq("id", id)
      .select();

    if (error) {
      console.error("[Supabase] Update error:", JSON.stringify(error, null, 2));
      throw error;
    }
    console.log("[Supabase] Update success:", data);
    return { success: true, data };
  } catch (error) {
    console.error("[Supabase] Update error:", JSON.stringify(error, null, 2));
    console.error("[Supabase] Error details - code:", error?.code, "message:", error?.message, "details:", error?.details, "hint:", error?.hint);
    return { success: false, error };
  }
};

// Cancel an appointment with a reason
export const cancelAppointmentWithReason = async (id, reason) => {
  console.log("[Supabase] cancelAppointmentWithReason called:", { id, reason });
  if (!id) {
    console.error("[Supabase] No ID provided to cancelAppointmentWithReason");
    return { success: false, error: new Error("No appointment ID provided") };
  }
  const updateData = { status: "canceled", cancellation_reason: reason };
  console.log("[Supabase] Sending update data:", updateData);
  const result = await updateAppointment(id, updateData);
  if (!result.success && result.error?.message?.includes("cancellation_reason")) {
    console.warn("[Supabase] cancellation_reason column may not exist, retrying without reason");
    const fallback = await updateAppointment(id, { status: "canceled" });
    if (fallback.success) {
      console.warn("[Supabase] Fallback succeeded — add 'cancellation_reason' column to the appointments table");
    }
    return fallback;
  }
  return result;
};

// Reschedule an appointment to a new date/time
export const rescheduleAppointment = async (id, newDate, newTimeSlot) => {
  return updateAppointment(id, {
    status: "rescheduled",
    rescheduled_date: newDate,
    rescheduled_time: newTimeSlot,
    date: newDate,
    time_slot: newTimeSlot,
  });
};

// Delete an appointment
export const deleteAppointment = async (id) => {
  try {
    const { error } = await supabase
      .from("appointments")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error("Error deleting appointment:", error);
    return { success: false, error };
  }
};
