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
 * - date: date (not null)
 * - time_slot: text (not null)
 * - patient_name: text (not null)
 * - phone: text (not null)
 * - email: text (nullable)
 * - status: text (default: 'pending') -- values: 'pending', 'confirmed', 'cancelled'
 *
 * Table: time_slots
 * - id: uuid (primary key, default: gen_random_uuid())
 * - date: date (not null)
 * - time_slot: text (not null) -- e.g., "09:00", "10:00"
 * - is_available: boolean (default: true)
 * - doctor_id: text (nullable)
 *
 * Row Level Security (RLS) Policies:
 * - Enable RLS on both tables
 * - Create policy: "Anyone can read time_slots" => SELECT for anon
 * - Create policy: "Anyone can insert appointments" => INSERT for anon
 */

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://your-project.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "your-anon-key";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Clinic working hours configuration
export const CLINIC_HOURS = {
  startHour: 9, // 9:00 AM
  endHour: 18,  // 6:00 PM
  slotDuration: 30, // minutes
  closedDays: [5], // Friday (0=Sunday, 5=Friday, 6=Saturday) -- adjust for your region
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

// Fetch available slots from Supabase for a given date
export const fetchAvailableSlots = async (date) => {
  try {
    const dateStr = date.toISOString().split("T")[0];

    const { data: bookedSlots, error } = await supabase
      .from("appointments")
      .select("time_slot")
      .eq("date", dateStr)
      .eq("status", "confirmed");

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

// Insert a new appointment into Supabase
export const createAppointment = async (appointmentData) => {
  try {
    const { data, error } = await supabase
      .from("appointments")
      .insert([
        {
          service: appointmentData.service,
          date: appointmentData.date,
          time_slot: appointmentData.timeSlot,
          patient_name: appointmentData.name,
          phone: appointmentData.phone,
          email: appointmentData.email || null,
          status: "pending",
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
