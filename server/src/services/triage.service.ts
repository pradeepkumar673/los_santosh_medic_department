import { IVitals, ITriageRuleFired, TriageSeverity } from "../models/MedicalAssessment.model";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface TriageInput {
  vitals?: IVitals;
  symptoms: string[];
  chiefComplaint: string;
  age?: number; // years — optional; elevates score for elderly / paediatric
}

export interface TriageResult {
  score: number;              // 0–100
  severity: TriageSeverity;
  breakdown: ITriageRuleFired[];
  suggestedAppointmentType: "emergency" | "walk_in" | "scheduled";
  suggestedPriority: "emergency" | "high" | "normal" | "low";
}

// ─────────────────────────────────────────────────────────────────────────────
// Symptom keyword lists
// ─────────────────────────────────────────────────────────────────────────────

const CRITICAL_KEYWORDS = [
  "cardiac arrest", "heart attack", "stroke", "unconscious", "unresponsive",
  "not breathing", "respiratory arrest", "severe bleeding", "hemorrhage",
  "anaphylaxis", "anaphylactic", "seizure", "convulsion", "coma",
  "chest pain radiating", "aortic", "pulmonary embolism",
];

const URGENT_KEYWORDS = [
  "chest pain", "difficulty breathing", "shortness of breath",
  "severe abdominal pain", "high fever", "fever above 39", "vomiting blood",
  "coughing blood", "altered consciousness", "confusion", "dizziness severe",
  "head injury", "fracture", "suspected fracture", "severe burn",
  "sudden vision loss", "sudden weakness", "paralysis", "overdose",
  "allergic reaction", "severe headache", "sudden severe",
];

const MODERATE_KEYWORDS = [
  "abdominal pain", "vomiting", "diarrhea", "moderate pain",
  "urinary pain", "back pain", "joint pain", "sprain", "cut",
  "laceration", "mild fever", "fever", "cough", "headache",
  "nausea", "rash", "swelling", "ear pain", "eye pain",
];

// ─────────────────────────────────────────────────────────────────────────────
// Individual scoring rules  (each returns points + rule name or null)
// ─────────────────────────────────────────────────────────────────────────────

type RuleResult = { rule: string; points: number } | null;

function ruleOxygenSaturation(v: IVitals): RuleResult {
  if (v.oxygenSaturation === undefined) return null;
  if (v.oxygenSaturation < 90) return { rule: "SpO₂ critically low (<90%)", points: 35 };
  if (v.oxygenSaturation < 94) return { rule: "SpO₂ low (90–93%)", points: 20 };
  if (v.oxygenSaturation < 96) return { rule: "SpO₂ mildly reduced (94–95%)", points: 8 };
  return null;
}

function ruleHeartRate(v: IVitals): RuleResult {
  if (v.heartRate === undefined) return null;
  if (v.heartRate > 150 || v.heartRate < 40)
    return { rule: "Heart rate critically abnormal (>150 or <40 bpm)", points: 30 };
  if (v.heartRate > 120 || v.heartRate < 50)
    return { rule: "Heart rate significantly abnormal (>120 or <50 bpm)", points: 18 };
  if (v.heartRate > 100 || v.heartRate < 60)
    return { rule: "Heart rate mildly abnormal", points: 6 };
  return null;
}

function ruleBloodPressure(v: IVitals): RuleResult {
  const sys = v.bloodPressureSystolic;
  const dia = v.bloodPressureDiastolic;
  if (sys === undefined && dia === undefined) return null;

  // Hypertensive crisis
  if ((sys !== undefined && sys > 180) || (dia !== undefined && dia > 120))
    return { rule: "Hypertensive crisis (SBP>180 or DBP>120)", points: 30 };

  // Hypotensive shock
  if (sys !== undefined && sys < 80)
    return { rule: "Severe hypotension (SBP<80)", points: 30 };

  if (sys !== undefined && sys < 90)
    return { rule: "Hypotension (SBP 80–89)", points: 18 };

  // Stage 2 hypertension
  if (sys !== undefined && sys > 160)
    return { rule: "Stage 2 hypertension (SBP 160–180)", points: 12 };

  // Stage 1 hypertension
  if (sys !== undefined && sys > 140)
    return { rule: "Stage 1 hypertension (SBP 140–160)", points: 5 };

  return null;
}

function ruleTemperature(v: IVitals): RuleResult {
  if (v.temperature === undefined) return null;
  if (v.temperature > 40.5) return { rule: "Hyperpyrexia (>40.5°C)", points: 25 };
  if (v.temperature < 35)   return { rule: "Hypothermia (<35°C)", points: 25 };
  if (v.temperature > 39)   return { rule: "High fever (>39°C)", points: 12 };
  if (v.temperature > 38)   return { rule: "Moderate fever (38–39°C)", points: 5 };
  return null;
}

function ruleRespiratoryRate(v: IVitals): RuleResult {
  if (v.respiratoryRate === undefined) return null;
  if (v.respiratoryRate > 30 || v.respiratoryRate < 8)
    return { rule: "Respiratory rate critically abnormal (>30 or <8)", points: 28 };
  if (v.respiratoryRate > 24)
    return { rule: "Tachypnoea (>24 breaths/min)", points: 14 };
  return null;
}

function ruleBloodSugar(v: IVitals): RuleResult {
  if (v.bloodSugar === undefined) return null;
  if (v.bloodSugar < 54)  return { rule: "Severe hypoglycaemia (<54 mg/dL)", points: 28 };
  if (v.bloodSugar > 500) return { rule: "Hyperglycaemic crisis (>500 mg/dL)", points: 25 };
  if (v.bloodSugar < 70)  return { rule: "Hypoglycaemia (54–69 mg/dL)", points: 14 };
  if (v.bloodSugar > 300) return { rule: "Severe hyperglycaemia (300–500 mg/dL)", points: 12 };
  return null;
}

function ruleSymptomKeywords(
  symptoms: string[],
  chiefComplaint: string
): RuleResult[] {
  const text = [...symptoms, chiefComplaint]
    .join(" ")
    .toLowerCase();

  const results: RuleResult[] = [];

  for (const kw of CRITICAL_KEYWORDS) {
    if (text.includes(kw)) {
      results.push({ rule: `Critical keyword: "${kw}"`, points: 40 });
      break; // one critical keyword is enough to cap the score
    }
  }

  if (results.length === 0) {
    for (const kw of URGENT_KEYWORDS) {
      if (text.includes(kw)) {
        results.push({ rule: `Urgent keyword: "${kw}"`, points: 22 });
        break;
      }
    }
  }

  if (results.length === 0) {
    for (const kw of MODERATE_KEYWORDS) {
      if (text.includes(kw)) {
        results.push({ rule: `Moderate keyword: "${kw}"`, points: 8 });
        break;
      }
    }
  }

  return results;
}

function ruleSymptomCount(symptoms: string[]): RuleResult {
  const n = symptoms.length;
  if (n >= 6) return { rule: "Many symptoms reported (≥6)", points: 10 };
  if (n >= 3) return { rule: "Multiple symptoms reported (3–5)", points: 5 };
  return null;
}

function ruleAge(age?: number): RuleResult {
  if (age === undefined) return null;
  if (age >= 80) return { rule: "Elderly patient (≥80 years)", points: 8 };
  if (age >= 65) return { rule: "Senior patient (65–79 years)", points: 4 };
  if (age < 2)   return { rule: "Infant (<2 years)", points: 8 };
  if (age < 12)  return { rule: "Paediatric patient (<12 years)", points: 3 };
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Score → Severity mapping
// ─────────────────────────────────────────────────────────────────────────────

function scoreToSeverity(score: number): TriageSeverity {
  if (score >= 60) return "critical";
  if (score >= 35) return "urgent";
  if (score >= 15) return "moderate";
  return "low";
}

const SEVERITY_TO_APPOINTMENT_TYPE: Record<
  TriageSeverity,
  "emergency" | "walk_in" | "scheduled"
> = {
  critical: "emergency",
  urgent:   "walk_in",
  moderate: "walk_in",
  low:      "scheduled",
};

const SEVERITY_TO_QUEUE_PRIORITY: Record<
  TriageSeverity,
  "emergency" | "high" | "normal" | "low"
> = {
  critical: "emergency",
  urgent:   "high",
  moderate: "normal",
  low:      "low",
};

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Run the full triage rule engine against the assessment input.
 * Returns a deterministic, auditable result — no side effects.
 */
export function runTriageEngine(input: TriageInput): TriageResult {
  const vitals = input.vitals ?? {};
  const fired: ITriageRuleFired[] = [];

  // Run all rules and collect non-null results
  const candidateRules: RuleResult[] = [
    ruleOxygenSaturation(vitals),
    ruleHeartRate(vitals),
    ruleBloodPressure(vitals),
    ruleTemperature(vitals),
    ruleRespiratoryRate(vitals),
    ruleBloodSugar(vitals),
    ...ruleSymptomKeywords(input.symptoms, input.chiefComplaint),
    ruleSymptomCount(input.symptoms),
    ruleAge(input.age),
  ];

  for (const r of candidateRules) {
    if (r !== null) fired.push(r);
  }

  // Sum points, hard-cap at 100
  const rawScore = fired.reduce((sum, r) => sum + r.points, 0);
  const score = Math.min(100, rawScore);

  const severity = scoreToSeverity(score);

  return {
    score,
    severity,
    breakdown: fired,
    suggestedAppointmentType: SEVERITY_TO_APPOINTMENT_TYPE[severity],
    suggestedPriority:        SEVERITY_TO_QUEUE_PRIORITY[severity],
  };
}

/**
 * Utility: given an explicit override severity, return the same suggestion
 * shape — used when a clinician overrides the computed result.
 */
export function buildOverrideResult(
  severity: TriageSeverity,
  existingScore: number
): Pick<TriageResult, "suggestedAppointmentType" | "suggestedPriority"> {
  return {
    suggestedAppointmentType: SEVERITY_TO_APPOINTMENT_TYPE[severity],
    suggestedPriority:        SEVERITY_TO_QUEUE_PRIORITY[severity],
  };
}
