/**
 * server/src/utils/seed.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * MediQueue AI — Demo Data Seed Script
 *
 * Populates: Departments → Users → Doctors → Patients → Appointments →
 *            QueueEntries → Beds
 *
 * Run:
 *   cd server
 *   npx ts-node -r tsconfig-paths/register src/utils/seed.ts
 *
 * Or (after adding the npm script):
 *   npm run seed
 *
 * Idempotent: drops all seeded collections before re-inserting, so it is
 * safe to run multiple times without duplicate-key errors.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

// ── Models ────────────────────────────────────────────────────────────────────
import User from "../models/User.model";
import Department from "../models/Department.model";
import Doctor from "../models/Doctor.model";
import Patient from "../models/Patient.model";
import Appointment from "../models/Appointment.model";
import QueueEntry from "../models/QueueEntry.model";
import Bed from "../models/Bed.model";
import BedAllocation from "../models/BedAllocation.model";
import MedicalAssessment from "../models/MedicalAssessment.model";
import Notification from "../models/Notification.model";

// ── Config ────────────────────────────────────────────────────────────────────
const MONGO_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/mediqueue_ai";

const DEMO_PASSWORD = "Demo@1234"; // All demo accounts share this password

// ─────────────────────────────────────────────────────────────────────────────
// 1. DEPARTMENTS
// ─────────────────────────────────────────────────────────────────────────────
const DEPARTMENTS = [
  {
    name: "Cardiology",
    code: "CARD",
    description: "Heart and cardiovascular system specialists",
    avgConsultationTime: 20,
  },
  {
    name: "Orthopedics",
    code: "ORTH",
    description: "Bone, joint, and musculoskeletal conditions",
    avgConsultationTime: 15,
  },
  {
    name: "Pediatrics",
    code: "PEDS",
    description: "Medical care for infants, children, and adolescents",
    avgConsultationTime: 15,
  },
  {
    name: "General Medicine",
    code: "GENM",
    description: "Primary care and general health consultations",
    avgConsultationTime: 10,
  },
  {
    name: "Dermatology",
    code: "DERM",
    description: "Skin, hair, and nail conditions",
    avgConsultationTime: 12,
  },
  {
    name: "ENT",
    code: "ENT",
    description: "Ear, Nose, and Throat specialist care",
    avgConsultationTime: 12,
  },
  {
    name: "Gynecology",
    code: "GYNE",
    description: "Women's reproductive health and obstetrics",
    avgConsultationTime: 20,
  },
  {
    name: "Neurology",
    code: "NEUR",
    description: "Brain, spine, and nervous system conditions",
    avgConsultationTime: 25,
  },
  {
    name: "Emergency",
    code: "EMER",
    description: "24/7 emergency and trauma care",
    avgConsultationTime: 30,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// 2. STAFF USERS (admin, reception, nurses, doctors)
// ─────────────────────────────────────────────────────────────────────────────
const STAFF_USERS = [
  // Admin
  {
    name: "Dr. Santosh Kumar",
    email: "admin@mediqueue.com",
    phone: "9000000001",
    role: "admin" as const,
    isVerified: true,
  },
  // Reception
  {
    name: "Priya Menon",
    email: "reception@mediqueue.com",
    phone: "9000000002",
    role: "reception" as const,
    isVerified: true,
  },
  // Nurses
  {
    name: "Nurse Lakshmi",
    email: "nurse1@mediqueue.com",
    phone: "9000000003",
    role: "nurse" as const,
    isVerified: true,
  },
  {
    name: "Nurse Kavitha",
    email: "nurse2@mediqueue.com",
    phone: "9000000004",
    role: "nurse" as const,
    isVerified: true,
  },
  // Doctors — one per department (9)
  {
    name: "Dr. Arjun Sharma",
    email: "dr.arjun@mediqueue.com",
    phone: "9000000011",
    role: "doctor" as const,
    isVerified: true,
  },
  {
    name: "Dr. Meena Patel",
    email: "dr.meena@mediqueue.com",
    phone: "9000000012",
    role: "doctor" as const,
    isVerified: true,
  },
  {
    name: "Dr. Ravi Rao",
    email: "dr.ravi@mediqueue.com",
    phone: "9000000013",
    role: "doctor" as const,
    isVerified: true,
  },
  {
    name: "Dr. Sunita Iyer",
    email: "dr.sunita@mediqueue.com",
    phone: "9000000014",
    role: "doctor" as const,
    isVerified: true,
  },
  {
    name: "Dr. Kiran Das",
    email: "dr.kiran@mediqueue.com",
    phone: "9000000015",
    role: "doctor" as const,
    isVerified: true,
  },
  {
    name: "Dr. Pooja Nair",
    email: "dr.pooja@mediqueue.com",
    phone: "9000000016",
    role: "doctor" as const,
    isVerified: true,
  },
  {
    name: "Dr. Ramesh Gupta",
    email: "dr.ramesh@mediqueue.com",
    phone: "9000000017",
    role: "doctor" as const,
    isVerified: true,
  },
  {
    name: "Dr. Anita Bose",
    email: "dr.anita@mediqueue.com",
    phone: "9000000018",
    role: "doctor" as const,
    isVerified: true,
  },
  {
    name: "Dr. Vikram Singh",
    email: "dr.vikram@mediqueue.com",
    phone: "9000000019",
    role: "doctor" as const,
    isVerified: true,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// 3. DOCTOR PROFILES  (maps to STAFF_USERS index 4-12)
// ─────────────────────────────────────────────────────────────────────────────
// doctorIndex → departmentName mapping
const DOCTOR_DEPT_MAP: Record<number, string> = {
  0: "Cardiology",
  1: "Orthopedics",
  2: "Pediatrics",
  3: "General Medicine",
  4: "Dermatology",
  5: "ENT",
  6: "Gynecology",
  7: "Neurology",
  8: "Emergency",
};

const DOCTOR_PROFILES = [
  {
    specialization: "Interventional Cardiology",
    qualifications: ["MBBS", "MD", "DM Cardiology"],
    licenseNumber: "MCI-CARD-001",
    experienceYears: 14,
    consultationFee: 800,
    maxPatientsPerDay: 30,
    availabilityStatus: "available" as const,
  },
  {
    specialization: "Joint Replacement & Sports Medicine",
    qualifications: ["MBBS", "MS Orthopaedics", "Fellowship Joint Replacement"],
    licenseNumber: "MCI-ORTH-002",
    experienceYears: 10,
    consultationFee: 700,
    maxPatientsPerDay: 25,
    availabilityStatus: "available" as const,
  },
  {
    specialization: "Neonatology & Paediatric Critical Care",
    qualifications: ["MBBS", "MD Paediatrics", "Fellowship Neonatology"],
    licenseNumber: "MCI-PEDS-003",
    experienceYears: 8,
    consultationFee: 500,
    maxPatientsPerDay: 35,
    availabilityStatus: "available" as const,
  },
  {
    specialization: "Internal Medicine & Diabetology",
    qualifications: ["MBBS", "MD General Medicine"],
    licenseNumber: "MCI-GENM-004",
    experienceYears: 12,
    consultationFee: 400,
    maxPatientsPerDay: 40,
    availabilityStatus: "available" as const,
  },
  {
    specialization: "Clinical & Cosmetic Dermatology",
    qualifications: ["MBBS", "MD Dermatology"],
    licenseNumber: "MCI-DERM-005",
    experienceYears: 7,
    consultationFee: 600,
    maxPatientsPerDay: 30,
    availabilityStatus: "available" as const,
  },
  {
    specialization: "Otorhinolaryngology & Head Neck Surgery",
    qualifications: ["MBBS", "MS ENT"],
    licenseNumber: "MCI-ENT-006",
    experienceYears: 9,
    consultationFee: 500,
    maxPatientsPerDay: 28,
    availabilityStatus: "available" as const,
  },
  {
    specialization: "Obstetrics & Gynaecology",
    qualifications: ["MBBS", "MS OBG", "Fellowship Laparoscopy"],
    licenseNumber: "MCI-GYNE-007",
    experienceYears: 11,
    consultationFee: 600,
    maxPatientsPerDay: 25,
    availabilityStatus: "available" as const,
  },
  {
    specialization: "Neurology & Stroke Medicine",
    qualifications: ["MBBS", "MD", "DM Neurology"],
    licenseNumber: "MCI-NEUR-008",
    experienceYears: 15,
    consultationFee: 900,
    maxPatientsPerDay: 20,
    availabilityStatus: "available" as const,
  },
  {
    specialization: "Emergency Medicine & Trauma",
    qualifications: ["MBBS", "DNB Emergency Medicine"],
    licenseNumber: "MCI-EMER-009",
    experienceYears: 6,
    consultationFee: 350,
    maxPatientsPerDay: 50,
    availabilityStatus: "available" as const,
  },
];

// Standard Mon-Fri working hours for all doctors
const STANDARD_WORKING_HOURS = [
  { day: "mon", startTime: "09:00", endTime: "17:00" },
  { day: "tue", startTime: "09:00", endTime: "17:00" },
  { day: "wed", startTime: "09:00", endTime: "17:00" },
  { day: "thu", startTime: "09:00", endTime: "17:00" },
  { day: "fri", startTime: "09:00", endTime: "17:00" },
  { day: "sat", startTime: "09:00", endTime: "13:00" },
];

// ─────────────────────────────────────────────────────────────────────────────
// 4. PATIENT USERS + PROFILES
// ─────────────────────────────────────────────────────────────────────────────
const PATIENT_SEED_DATA = [
  {
    user: {
      name: "Rajesh Krishnan",
      email: "rajesh.krishnan@gmail.com",
      phone: "9100000001",
    },
    profile: {
      dateOfBirth: new Date("1980-03-15"),
      gender: "male" as const,
      bloodGroup: "B+" as const,
      height: 172,
      weight: 78,
      allergies: ["Penicillin"],
      chronicConditions: ["Hypertension"],
      currentMedications: ["Amlodipine 5mg"],
      emergencyContact: {
        name: "Sudha Krishnan",
        relation: "Wife",
        phone: "9100000101",
      },
      address: {
        line1: "14, Anna Nagar, 3rd Street",
        city: "Chennai",
        state: "Tamil Nadu",
        pincode: "600040",
      },
    },
  },
  {
    user: {
      name: "Deepa Subramaniam",
      email: "deepa.s@yahoo.com",
      phone: "9100000002",
    },
    profile: {
      dateOfBirth: new Date("1995-07-22"),
      gender: "female" as const,
      bloodGroup: "O+" as const,
      height: 158,
      weight: 55,
      allergies: [],
      chronicConditions: [],
      currentMedications: [],
      emergencyContact: {
        name: "Ravi Subramaniam",
        relation: "Father",
        phone: "9100000102",
      },
      address: {
        line1: "27B, T. Nagar Main Road",
        city: "Chennai",
        state: "Tamil Nadu",
        pincode: "600017",
      },
    },
  },
  {
    user: {
      name: "Mohammed Faisal",
      email: "faisal.m@outlook.com",
      phone: "9100000003",
    },
    profile: {
      dateOfBirth: new Date("1972-11-08"),
      gender: "male" as const,
      bloodGroup: "A+" as const,
      height: 168,
      weight: 88,
      allergies: ["Sulfa drugs"],
      chronicConditions: ["Type 2 Diabetes", "Hyperlipidemia"],
      currentMedications: ["Metformin 500mg", "Atorvastatin 10mg"],
      emergencyContact: {
        name: "Ayesha Faisal",
        relation: "Wife",
        phone: "9100000103",
      },
      address: {
        line1: "5, Royapettah High Road, Flat 3A",
        city: "Chennai",
        state: "Tamil Nadu",
        pincode: "600014",
      },
    },
  },
  {
    user: {
      name: "Kavya Reddy",
      email: "kavya.reddy@gmail.com",
      phone: "9100000004",
    },
    profile: {
      dateOfBirth: new Date("2000-02-29"),
      gender: "female" as const,
      bloodGroup: "AB-" as const,
      height: 163,
      weight: 60,
      allergies: [],
      chronicConditions: ["Asthma"],
      currentMedications: ["Salbutamol inhaler"],
      emergencyContact: {
        name: "Venkat Reddy",
        relation: "Father",
        phone: "9100000104",
      },
      address: {
        line1: "8, Velachery Main Road",
        city: "Chennai",
        state: "Tamil Nadu",
        pincode: "600042",
      },
    },
  },
  {
    user: {
      name: "Arun Prakash",
      email: "arun.p@gmail.com",
      phone: "9100000005",
    },
    profile: {
      dateOfBirth: new Date("1965-05-12"),
      gender: "male" as const,
      bloodGroup: "O-" as const,
      height: 175,
      weight: 92,
      allergies: ["NSAIDs"],
      chronicConditions: ["Coronary Artery Disease", "Hypertension"],
      currentMedications: ["Aspirin 75mg", "Bisoprolol 5mg", "Ramipril 5mg"],
      emergencyContact: {
        name: "Lakshmi Prakash",
        relation: "Wife",
        phone: "9100000105",
      },
      address: {
        line1: "22, Adyar Flat 5C, 4th Main",
        city: "Chennai",
        state: "Tamil Nadu",
        pincode: "600020",
      },
    },
  },
  {
    user: {
      name: "Preethi Nambiar",
      email: "preethi.n@gmail.com",
      phone: "9100000006",
    },
    profile: {
      dateOfBirth: new Date("1988-09-03"),
      gender: "female" as const,
      bloodGroup: "B-" as const,
      height: 155,
      weight: 52,
      allergies: [],
      chronicConditions: [],
      currentMedications: [],
      emergencyContact: {
        name: "Suresh Nambiar",
        relation: "Husband",
        phone: "9100000106",
      },
      address: {
        line1: "31, Kilpauk Garden Road",
        city: "Chennai",
        state: "Tamil Nadu",
        pincode: "600010",
      },
    },
  },
  {
    user: {
      name: "Sathish Kumar",
      email: "sathish.k@gmail.com",
      phone: "9100000007",
    },
    profile: {
      dateOfBirth: new Date("1990-12-20"),
      gender: "male" as const,
      bloodGroup: "A-" as const,
      height: 170,
      weight: 75,
      allergies: [],
      chronicConditions: [],
      currentMedications: [],
      emergencyContact: {
        name: "Kamala Kumar",
        relation: "Mother",
        phone: "9100000107",
      },
      address: {
        line1: "3, Tambaram East, 2nd Cross",
        city: "Chennai",
        state: "Tamil Nadu",
        pincode: "600059",
      },
    },
  },
  {
    user: {
      name: "Nithya Mohan",
      email: "nithya.mohan@gmail.com",
      phone: "9100000008",
    },
    profile: {
      dateOfBirth: new Date("1983-04-17"),
      gender: "female" as const,
      bloodGroup: "AB+" as const,
      height: 160,
      weight: 65,
      allergies: ["Latex"],
      chronicConditions: ["Migraine"],
      currentMedications: ["Topiramate 25mg"],
      emergencyContact: {
        name: "Mohan Rajan",
        relation: "Husband",
        phone: "9100000108",
      },
      address: {
        line1: "11, Mylapore 1st Lane",
        city: "Chennai",
        state: "Tamil Nadu",
        pincode: "600004",
      },
    },
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// 5. BED DEFINITIONS  (keyed by department name)
// ─────────────────────────────────────────────────────────────────────────────
function buildBeds(deptMap: Map<string, mongoose.Types.ObjectId>) {
  const beds: any[] = [];

  // ── General Medicine ── Floor 1, Ward A
  for (let i = 1; i <= 6; i++) {
    beds.push({
      bedNumber: `GM-A-${String(i).padStart(2, "0")}`,
      ward: "Ward A",
      floor: 1,
      bedType: "general",
      status: i <= 4 ? "vacant" : i === 5 ? "cleaning" : "maintenance",
      department: deptMap.get("General Medicine"),
      pricePerDay: 1500,
      amenities: ["Call bell", "Side table", "TV"],
    });
  }

  // ── Cardiology ── Floor 2, Ward B
  for (let i = 1; i <= 5; i++) {
    beds.push({
      bedNumber: `CARD-B-${String(i).padStart(2, "0")}`,
      ward: "Ward B",
      floor: 2,
      bedType: i <= 2 ? "icu" : "general",
      status: "vacant",
      department: deptMap.get("Cardiology"),
      pricePerDay: i <= 2 ? 5000 : 2500,
      amenities:
        i <= 2
          ? ["Cardiac monitor", "Ventilator", "Crash cart"]
          : ["Call bell", "ECG port", "IV stand"],
    });
  }

  // ── Orthopedics ── Floor 2, Ward C
  for (let i = 1; i <= 4; i++) {
    beds.push({
      bedNumber: `ORTH-C-${String(i).padStart(2, "0")}`,
      ward: "Ward C",
      floor: 2,
      bedType: i === 1 ? "private" : "general",
      status: "vacant",
      department: deptMap.get("Orthopedics"),
      pricePerDay: i === 1 ? 3500 : 2000,
      amenities:
        i === 1
          ? ["Private room", "AC", "TV", "Attached bath"]
          : ["Call bell", "Traction equipment"],
    });
  }

  // ── Pediatrics ── Floor 3, Ward D
  for (let i = 1; i <= 5; i++) {
    beds.push({
      bedNumber: `PEDS-D-${String(i).padStart(2, "0")}`,
      ward: "Ward D",
      floor: 3,
      bedType: "pediatric",
      status: "vacant",
      department: deptMap.get("Pediatrics"),
      pricePerDay: 2000,
      amenities: ["Cot rails", "Playful decor", "Parent recliner"],
    });
  }

  // ── Gynecology ── Floor 3, Ward E (maternity)
  for (let i = 1; i <= 4; i++) {
    beds.push({
      bedNumber: `GYNE-E-${String(i).padStart(2, "0")}`,
      ward: "Ward E",
      floor: 3,
      bedType: "maternity",
      status: "vacant",
      department: deptMap.get("Gynecology"),
      pricePerDay: 2500,
      amenities: ["Birthing bed", "Baby cot", "Breastfeeding screen"],
    });
  }

  // ── Neurology ── Floor 4, Ward F
  for (let i = 1; i <= 3; i++) {
    beds.push({
      bedNumber: `NEUR-F-${String(i).padStart(2, "0")}`,
      ward: "Ward F",
      floor: 4,
      bedType: i === 1 ? "icu" : "general",
      status: "vacant",
      department: deptMap.get("Neurology"),
      pricePerDay: i === 1 ? 6000 : 2500,
      amenities: i === 1 ? ["EEG monitoring", "Ventilator"] : ["Call bell"],
    });
  }

  // ── Emergency ── Ground Floor, Ward G
  for (let i = 1; i <= 6; i++) {
    beds.push({
      bedNumber: `EMER-G-${String(i).padStart(2, "0")}`,
      ward: "Ward G",
      floor: 0,
      bedType: "emergency",
      status: "vacant",
      department: deptMap.get("Emergency"),
      pricePerDay: 3000,
      amenities: ["Defibrillator", "IV stand", "Oxygen port", "Monitor"],
    });
  }

  return beds;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SEED FUNCTION
// ─────────────────────────────────────────────────────────────────────────────
async function seed() {
  console.log("\n🌱  MediQueue AI — Seed Script");
  console.log("══════════════════════════════════════════════\n");

  // ── Connect ────────────────────────────────────────────────────────────────
  console.log(`📡  Connecting to MongoDB: ${MONGO_URI}`);
  await mongoose.connect(MONGO_URI);
  console.log("✅  Connected\n");

  // ── Wipe existing demo data ────────────────────────────────────────────────
  console.log("🗑   Clearing existing collections…");
  await Promise.all([
    User.deleteMany({}),
    Department.deleteMany({}),
    Doctor.deleteMany({}),
    Patient.deleteMany({}),
    Appointment.deleteMany({}),
    QueueEntry.deleteMany({}),
    Bed.deleteMany({}),
    BedAllocation.deleteMany({}),
    MedicalAssessment.deleteMany({}),
    Notification.deleteMany({}),
  ]);
  console.log("✅  Collections cleared\n");

  // ── Hash shared demo password once ────────────────────────────────────────
  const hashedPassword = await bcrypt.hash(DEMO_PASSWORD, 10);

  // ── 1. Departments ─────────────────────────────────────────────────────────
  console.log("🏥  Seeding departments…");
  const departments = await Department.insertMany(DEPARTMENTS);
  const deptMap = new Map<string, mongoose.Types.ObjectId>(
    departments.map((d) => [d.name, d._id as mongoose.Types.ObjectId])
  );
  console.log(`    ↳ ${departments.length} departments created\n`);

  // ── 2. Staff users ─────────────────────────────────────────────────────────
  console.log("👥  Seeding staff users…");
  const staffUsers = await User.insertMany(
    STAFF_USERS.map((u) => ({
      ...u,
      password: hashedPassword,
      isActive: true,
    }))
  );
  // Split out doctor users (index 4 onward in STAFF_USERS)
  const doctorUsers = staffUsers.slice(4);
  console.log(`    ↳ ${staffUsers.length} staff users created\n`);

  // ── 3. Doctor profiles ─────────────────────────────────────────────────────
  console.log("🩺  Seeding doctor profiles…");
  const doctorDocs = await Doctor.insertMany(
    DOCTOR_PROFILES.map((profile, idx) => ({
      user: doctorUsers[idx]._id,
      department: deptMap.get(DOCTOR_DEPT_MAP[idx])!,
      workingHours: STANDARD_WORKING_HOURS,
      ...profile,
    }))
  );

  // Update departments with headDoctor reference
  await Promise.all(
    doctorDocs.map((doc, idx) =>
      Department.findByIdAndUpdate(deptMap.get(DOCTOR_DEPT_MAP[idx])!, {
        headDoctor: doc._id,
      })
    )
  );
  console.log(`    ↳ ${doctorDocs.length} doctor profiles created\n`);

  // Create a lookup map: doctorId (Doctor._id) → Doctor doc
  const doctorByDept = new Map<string, (typeof doctorDocs)[0]>();
  doctorDocs.forEach((doc, idx) => {
    doctorByDept.set(DOCTOR_DEPT_MAP[idx], doc);
  });

  // ── 4. Patient users + profiles ────────────────────────────────────────────
  console.log("🤒  Seeding patients…");
  const patientUsers = await User.insertMany(
    PATIENT_SEED_DATA.map((p) => ({
      name: p.user.name,
      email: p.user.email,
      phone: p.user.phone,
      password: hashedPassword,
      role: "patient",
      isActive: true,
      isVerified: true,
    }))
  );

  const patients = await Patient.insertMany(
    PATIENT_SEED_DATA.map((p, idx) => ({
      user: patientUsers[idx]._id,
      ...p.profile,
    }))
  );
  console.log(`    ↳ ${patients.length} patients created\n`);

  // ── 5. Appointments ────────────────────────────────────────────────────────
  console.log("📅  Seeding appointments…");

  // Use reception user as createdBy for all seed appointments
  const receptionUser = staffUsers[1]; // Priya Menon

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const twoDaysAgo = new Date(today);
  twoDaysAgo.setDate(today.getDate() - 2);

  // Appointment seed data: [patientIdx, deptName, date, timeSlot, type, status, symptoms]
  type AppSeed = [
    number,
    string,
    Date,
    string,
    "scheduled" | "follow_up" | "walk_in" | "emergency",
    | "scheduled"
    | "confirmed"
    | "checked_in"
    | "in_progress"
    | "completed"
    | "cancelled"
    | "no_show",
    string[],
    string
  ];

  const appointmentSeeds: AppSeed[] = [
    // Today's live appointments
    [
      0,
      "Cardiology",
      today,
      "09:30",
      "scheduled",
      "confirmed",
      ["chest pain", "shortness of breath"],
      "Chest pain evaluation — follow-up on angiography",
    ],
    [
      4,
      "Cardiology",
      today,
      "10:00",
      "follow_up",
      "checked_in",
      ["palpitations", "dizziness"],
      "Follow-up for CAD medication review",
    ],
    [
      2,
      "General Medicine",
      today,
      "09:00",
      "scheduled",
      "in_progress",
      ["high fever", "cough"],
      "Persistent fever for 3 days with cough",
    ],
    [
      1,
      "Dermatology",
      today,
      "11:00",
      "walk_in",
      "confirmed",
      ["rash", "itching"],
      "Allergic rash on arms",
    ],
    [
      6,
      "Orthopedics",
      today,
      "10:30",
      "scheduled",
      "confirmed",
      ["knee pain", "swelling"],
      "Knee pain after sports injury",
    ],
    [
      3,
      "ENT",
      today,
      "12:00",
      "follow_up",
      "scheduled",
      ["ear pain", "hearing loss"],
      "Follow-up after ear infection",
    ],
    [
      7,
      "Neurology",
      today,
      "14:00",
      "scheduled",
      "scheduled",
      ["severe headache", "nausea"],
      "Recurring migraine episodes",
    ],
    // Yesterday's completed/no-show appointments
    [
      5,
      "Gynecology",
      yesterday,
      "10:00",
      "scheduled",
      "completed",
      ["irregular periods"],
      "Menstrual irregularity review",
    ],
    [
      0,
      "General Medicine",
      yesterday,
      "09:30",
      "follow_up",
      "completed",
      ["blood pressure check"],
      "Hypertension monitoring",
    ],
    [
      2,
      "Cardiology",
      twoDaysAgo,
      "11:00",
      "scheduled",
      "no_show",
      ["diabetes checkup"],
      "Quarterly diabetes and lipid panel review",
    ],
    // Future appointments
    [
      1,
      "Pediatrics",
      tomorrow,
      "09:00",
      "scheduled",
      "scheduled",
      ["routine checkup"],
      "Annual health checkup",
    ],
    [
      4,
      "General Medicine",
      tomorrow,
      "10:30",
      "follow_up",
      "scheduled",
      ["hypertension follow-up"],
      "BP and medication review",
    ],
    [
      3,
      "Dermatology",
      tomorrow,
      "11:30",
      "scheduled",
      "scheduled",
      ["acne", "skin lesion"],
      "Acne treatment follow-up",
    ],
    // Emergency
    [
      6,
      "Emergency",
      today,
      "08:00",
      "emergency",
      "completed",
      ["chest pain radiating", "severe"],
      "Acute chest pain — ruled out MI",
    ],
  ];

  const appointments = await Appointment.insertMany(
    appointmentSeeds.map(
      ([patIdx, deptName, date, slot, type, status, symptoms, reason]) => {
        const doctor = doctorByDept.get(deptName)!;
        return {
          patient: patients[patIdx]._id,
          doctor: doctor._id,
          department: deptMap.get(deptName)!,
          scheduledDate: date,
          scheduledTimeSlot: slot,
          appointmentType: type,
          status,
          symptoms,
          reasonForVisit: reason,
          createdBy: receptionUser._id,
          checkedInAt:
            status === "checked_in" ||
            status === "in_progress" ||
            status === "completed"
              ? new Date()
              : undefined,
          startedAt:
            status === "in_progress" || status === "completed"
              ? new Date()
              : undefined,
          completedAt: status === "completed" ? new Date() : undefined,
        };
      }
    )
  );
  console.log(`    ↳ ${appointments.length} appointments created\n`);

  // ── 6. Queue Entries (today's active queue) ────────────────────────────────
  console.log("🔢  Seeding queue entries…");

  const todayAppointments = appointments.filter(
    (a) =>
      a.scheduledDate.getTime() === today.getTime() &&
      ["confirmed", "checked_in", "in_progress", "scheduled"].includes(
        a.status
      )
  );

  // Group by doctor
  const queueByDoctor = new Map<string, typeof todayAppointments>();
  for (const appt of todayAppointments) {
    const key = String(appt.doctor);
    if (!queueByDoctor.has(key)) queueByDoctor.set(key, []);
    queueByDoctor.get(key)!.push(appt);
  }

  const queueEntries: any[] = [];
  for (const [doctorId, appts] of queueByDoctor.entries()) {
    // Find the doctor doc to get department
    const doctorDoc = doctorDocs.find((d) => String(d._id) === doctorId)!;

    let tokenNum = 1;
    for (const appt of appts) {
      const statusMap: Record<string, string> = {
        confirmed: "waiting",
        checked_in: "called",
        in_progress: "in_progress",
        scheduled: "waiting",
      };
      const qStatus = statusMap[appt.status] ?? "waiting";
      const priority =
        appt.appointmentType === "emergency"
          ? "emergency"
          : appt.appointmentType === "walk_in"
          ? "high"
          : "normal";

      queueEntries.push({
        tokenNumber: tokenNum++,
        patient: appt.patient,
        doctor: doctorDoc._id,
        department: appt.department,
        appointment: appt._id,
        status: qStatus,
        priority,
        estimatedWaitMinutes: (tokenNum - 1) * 15,
        queueDate: today,
        checkedInAt: new Date(),
        calledAt:
          qStatus === "called" || qStatus === "in_progress"
            ? new Date()
            : undefined,
        startedAt: qStatus === "in_progress" ? new Date() : undefined,
        positionInQueue: tokenNum - 1,
      });
    }
  }

  if (queueEntries.length > 0) {
    const insertedQueue = await QueueEntry.insertMany(queueEntries);

    // Back-link appointments to their queue entries
    await Promise.all(
      insertedQueue.map((q) =>
        Appointment.findByIdAndUpdate(q.appointment, { queueEntry: q._id })
      )
    );
    console.log(`    ↳ ${insertedQueue.length} queue entries created\n`);
  } else {
    console.log("    ↳ No today-queue entries needed\n");
  }

  // ── 7. Beds ────────────────────────────────────────────────────────────────
  console.log("🛏   Seeding beds…");
  const bedDefs = buildBeds(deptMap);
  const beds = await Bed.insertMany(bedDefs);
  console.log(`    ↳ ${beds.length} beds created\n`);

  // ── 8. Allocate one bed (occupied demo) ────────────────────────────────────
  //  Allocate CARD-B-03 (general cardiology bed) to patient Arun Prakash
  const cardBed = beds.find((b) => b.bedNumber === "CARD-B-03");
  const arunPatient = patients[4]; // Arun Prakash

  if (cardBed) {
    const allocatedAt = new Date(today);
    allocatedAt.setDate(allocatedAt.getDate() - 2);

    const expectedDischarge = new Date(today);
    expectedDischarge.setDate(expectedDischarge.getDate() + 3);

    await Bed.findByIdAndUpdate(cardBed._id, {
      status: "occupied",
      currentPatient: arunPatient._id,
      assignedAt: allocatedAt,
      expectedDischargeDate: expectedDischarge,
    });

    await BedAllocation.create({
      bed: cardBed._id,
      patient: arunPatient._id,
      department: deptMap.get("Cardiology"),
      allocatedBy: receptionUser._id,
      admissionReason:
        "Admitted for cardiac monitoring following episode of chest pain and elevated troponin",
      allocatedAt,
      expectedDischargeDate: expectedDischarge,
      status: "active",
    });
    console.log("🛏   1 bed allocation created (Arun Prakash → CARD-B-03)\n");
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log("══════════════════════════════════════════════");
  console.log("✅  SEED COMPLETE\n");
  console.log("📋  Demo Login Credentials (password: Demo@1234)");
  console.log("────────────────────────────────────────────────");
  console.log("  Role        │ Email");
  console.log("  ────────────┼──────────────────────────────");
  console.log("  Admin       │ admin@mediqueue.com");
  console.log("  Reception   │ reception@mediqueue.com");
  console.log("  Nurse       │ nurse1@mediqueue.com");
  console.log("  Doctor      │ dr.arjun@mediqueue.com  (Cardiology)");
  console.log("  Doctor      │ dr.sunita@mediqueue.com (General Medicine)");
  console.log("  Patient     │ rajesh.krishnan@gmail.com");
  console.log("  Patient     │ arun.p@gmail.com");
  console.log("══════════════════════════════════════════════\n");

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error("\n❌  Seed failed:", err);
  mongoose.disconnect().finally(() => process.exit(1));
});