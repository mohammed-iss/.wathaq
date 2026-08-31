import React, { useState, useEffect, useMemo, useRef, createContext, useContext, useReducer, useCallback } from "react";
import {
  Shield, LayoutDashboard, ListChecks, ClipboardCheck, FolderOpen,
  AlertTriangle, FileText, Settings, ChevronRight, ChevronLeft, Upload,
  CheckCircle2, TrendingUp, TrendingDown, ArrowRight, Building2,
  X, Check, Loader2, Bell, Search, LogOut, Radar as RadarIcon,
  Zap, Lock, GitMerge, Target, Download, Filter, Plus, MoreHorizontal,
  Circle, CheckCircle, XCircle, MinusCircle,
  Users, Mail, Cloud, ShieldAlert, ShieldCheck, Bug, Activity, Router,
  GitBranch, ClipboardList, Smartphone, Database, RefreshCw, Link2, Cpu,
  Info, RotateCcw, Trash2, UserPlus, ChevronDown, PlayCircle, WifiOff,
  FileCheck2, ArrowUpRight, Dot, AlertOctagon, FileSpreadsheet,
} from "lucide-react";
import {
  XAxis, YAxis, ResponsiveContainer, AreaChart, Area, Tooltip as RTooltip,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from "recharts";
import { exportDashboardExcel, exportDashboardPDF } from "./export.js";
import wathaqLogo from "./assets/wathaq-logo.png";
import interfaceHero from "./assets/interface-hero.jpg";
import founderCard from "./assets/founder-card.jpg";

/* ============================================================
   DESIGN TOKENS
   ============================================================ */
const C = {
  bg: "#0B0A10", bgSoft: "#0F0D15", surface: "#15131D", surface2: "#1C1926",
  surfaceHover: "#221E2E", border: "#2A2733", borderSoft: "#211E29",
  text: "#F4F2F8", textDim: "#C9C5D6", muted: "#948FA3", mutedDim: "#6C6779",
  accent: "#8C7CFA", accentSoft: "rgba(140,124,250,0.14)",
  accent2: "#F0B559", accent2Soft: "rgba(240,181,89,0.14)",
  success: "#34D399", successSoft: "rgba(52,211,153,0.13)",
  warning: "#FBBF24", warningSoft: "rgba(251,191,36,0.13)",
  critical: "#FB7185", criticalSoft: "rgba(251,113,133,0.14)",
  info: "#60A5FA", infoSoft: "rgba(96,165,250,0.13)",
};
const F = {
  display: "'Manrope', sans-serif",
  body: "'Inter', sans-serif",
  mono: "'IBM Plex Mono', monospace",
  displayAr: "'IBM Plex Sans Arabic', 'Manrope', sans-serif",
  bodyAr: "'IBM Plex Sans Arabic', 'Inter', sans-serif",
};

function useFonts() {
  useEffect(() => {
    if (document.getElementById("wathaq-fonts")) return;
    const link = document.createElement("link");
    link.id = "wathaq-fonts";
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Manrope:wght@500;600;700;800&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap";
    document.head.appendChild(link);
  }, []);
}

/* ============================================================
   HELPERS
   ============================================================ */
function timeAgo(ts) {
  const s = Math.max(1, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}
function scoreToLevel(score) {
  if (score >= 15) return "critical";
  if (score >= 9) return "high";
  if (score >= 4) return "medium";
  return "low";
}
let uid = 1000;
const nextId = (p = "id") => `${p}-${uid++}`;

const LEVEL_META = { critical: C.critical, high: C.accent2, medium: C.info, low: C.success };
const STATUS_META = {
  implemented: { label: "Implemented", color: C.success, bg: C.successSoft, Icon: CheckCircle },
  partial: { label: "Partial", color: C.warning, bg: C.warningSoft, Icon: MinusCircle },
  not_implemented: { label: "Not implemented", color: C.critical, bg: C.criticalSoft, Icon: XCircle },
  na: { label: "N/A", color: C.mutedDim, bg: "rgba(255,255,255,0.05)", Icon: Circle },
};
const STATUS_CYCLE = ["not_implemented", "partial", "implemented", "na"];
const STATUS_WEIGHT = { implemented: 1, partial: 0.5, not_implemented: 0, na: null };

// Control maturity model (replaces simple status for controls in the Controls page)
const MATURITY_META = {
  1: { label: "Level 1 · Initial", short: "Initial", color: C.critical, bg: C.criticalSoft, Icon: XCircle },
  2: { label: "Level 2 · Managed", short: "Managed", color: C.warning, bg: C.warningSoft, Icon: MinusCircle },
  3: { label: "Level 3 · Defined", short: "Defined", color: C.info, bg: C.infoSoft, Icon: Circle },
  4: { label: "Level 4 · Quantitatively Managed", short: "Quantitatively Managed", color: C.accent, bg: C.accentSoft, Icon: CheckCircle },
  5: { label: "Level 5 · Optimizing", short: "Optimizing", color: C.success, bg: C.successSoft, Icon: CheckCircle2 },
  na: { label: "N/A", short: "N/A", color: C.mutedDim, bg: "rgba(255,255,255,0.05)", Icon: Circle },
};
const MATURITY_CYCLE = [1, 2, 3, 4, 5, "na"];
const maturityWeight = (level) => (level === "na" ? null : level / 5);
const STATUS_TO_MATURITY = { implemented: 5, partial: 3, not_implemented: 1, na: "na" };

const FRAMEWORK_OVERVIEW = {
  ISO27001: {
    issuer: "International Organization for Standardization (ISO/IEC)",
    points: [
      "Internationally recognized information security management system (ISMS) standard",
      "93 Annex A controls grouped into 4 themes -- Organizational, People, Physical, Technological",
      "Commonly required in enterprise vendor security reviews worldwide",
      "Forms the basis for third-party ISO/IEC 27001 certification audits",
    ],
  },
  SAMA: {
    issuer: "Saudi Central Bank (SAMA)",
    points: [
      "Mandatory Cyber Security Framework for Saudi banks, insurers, and finance companies",
      "25 controls across 4 domains -- Leadership, Risk Management, Operations, Third Party",
      "Focused specifically on financial-sector cyber resilience",
      "Compliance is assessed through SAMA's own regulatory examination cycle",
    ],
  },
  NCAECC: {
    issuer: "National Cybersecurity Authority (Saudi Arabia)",
    points: [
      "Baseline Essential Cybersecurity Controls for Saudi government and critical-sector entities",
      "108 controls across 4 domains -- Governance, Defense, Resilience, Third Party",
      "Mandatory for regulated Saudi organizations",
      "Aligned with the Kingdom's national cybersecurity strategy",
    ],
  },
};

function FrameworkReadinessCard() {
  const { state } = useStore();
  const { perFramework } = useCompliance();
  const evidenceCount = useEvidenceCount();
  const [fw, setFw] = useState(FRAMEWORKS[0].code);
  const [openPoint, setOpenPoint] = useState(0);

  const meta = FRAMEWORKS.find((f) => f.code === fw);
  const score = perFramework.find((f) => f.code === fw)?.score ?? 0;
  const controlEntries = CONTROLS_SAMPLE[fw] || [];
  const total = controlEntries.length;
  const okCount = controlEntries.filter(([code]) => {
    const level = state.controls[fw]?.[code];
    return typeof level === "number" && level >= 4;
  }).length;
  const needsEvidence = total - okCount;
  const controlStatusPct = total ? Math.round((okCount / total) * 100) : 0;
  const overview = FRAMEWORK_OVERVIEW[fw];

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-1">
        <h3 style={{ fontFamily: F.display, fontWeight: 700, fontSize: 15 }}>Framework Readiness</h3>
        <div className="flex gap-1.5">
          {FRAMEWORKS.map((f) => (
            <button key={f.code} onClick={() => { setFw(f.code); setOpenPoint(0); }} className="px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: fw === f.code ? C.accentSoft : "transparent", color: fw === f.code ? C.accent : C.mutedDim, border: `1px solid ${fw === f.code ? C.accent : C.border}` }}>{f.code}</button>
          ))}
        </div>
      </div>
      <p style={{ fontSize: 12.5, color: C.muted, marginBottom: 20 }}>Real numbers from your live control and evidence data -- not a static scorecard.</p>

      <div className="grid md:grid-cols-[1fr_1fr_1fr_auto] gap-5 items-start">
        <div>
          <div style={{ fontFamily: F.mono, fontSize: 10.5, color: C.mutedDim, marginBottom: 6 }}>EVIDENCE COMPLETION</div>
          <div style={{ fontFamily: F.display, fontWeight: 800, fontSize: 26 }}>{score}%</div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>of {meta.name} controls scored</div>
          <div className="mt-3 space-y-2">
            <div>
              <div className="flex justify-between mb-1" style={{ fontSize: 10.5, color: C.mutedDim }}><span>Auto-collected</span><span>{evidenceCount.auto}</span></div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: C.border }}><div className="h-full rounded-full" style={{ width: `${evidenceCount.total ? (evidenceCount.auto / evidenceCount.total) * 100 : 0}%`, background: C.success }} /></div>
            </div>
            <div>
              <div className="flex justify-between mb-1" style={{ fontSize: 10.5, color: C.mutedDim }}><span>Manual documents</span><span>{evidenceCount.manual}</span></div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: C.border }}><div className="h-full rounded-full" style={{ width: `${evidenceCount.total ? (evidenceCount.manual / evidenceCount.total) * 100 : 0}%`, background: C.accent }} /></div>
            </div>
          </div>
        </div>

        <div>
          <div style={{ fontFamily: F.mono, fontSize: 10.5, color: C.mutedDim, marginBottom: 6 }}>CONTROL STATUS</div>
          <div style={{ fontFamily: F.display, fontWeight: 800, fontSize: 26 }}>{controlStatusPct}%</div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>of controls at Quantitatively Managed+</div>
          <div className="mt-3 space-y-1.5">
            <div className="flex items-center gap-1.5" style={{ fontSize: 12 }}><CheckCircle2 size={13} color={C.success} /><span style={{ color: C.textDim }}>{okCount} OK</span></div>
            <div className="flex items-center gap-1.5" style={{ fontSize: 12 }}><Circle size={13} color={C.mutedDim} /><span style={{ color: C.textDim }}>{needsEvidence} need evidence</span></div>
          </div>
        </div>

        <div>
          <div style={{ fontFamily: F.mono, fontSize: 10.5, color: C.mutedDim, marginBottom: 6 }}>CONTROL LIBRARY</div>
          <div style={{ fontFamily: F.display, fontWeight: 800, fontSize: 26 }}>{total}</div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>official {meta.code} controls tracked</div>
        </div>

        <div className="w-16 h-16 rounded-full flex items-center justify-center text-center shrink-0" style={{ border: `2px solid ${C.accent}`, background: C.accentSoft }}>
          <span style={{ fontFamily: F.mono, fontWeight: 700, fontSize: 11, color: C.accent, lineHeight: 1.15 }}>{meta.code}</span>
        </div>
      </div>

      <div className="mt-6 pt-5" style={{ borderTop: `1px solid ${C.borderSoft}` }}>
        <div style={{ fontSize: 11, color: C.mutedDim, marginBottom: 10 }}>{meta.name} program overview · issued by {overview.issuer}</div>
        <div className="space-y-1.5">
          {overview.points.map((p, i) => (
            <div key={i}>
              <button onClick={() => setOpenPoint(openPoint === i ? -1 : i)} className="w-full flex items-center justify-between py-2 text-left" style={{ borderBottom: `1px solid ${C.borderSoft}` }}>
                <span style={{ fontSize: 13, color: C.textDim }}>{p.split(" -- ")[0].split(",")[0].split(" across ")[0]}</span>
                <ChevronDown size={14} color={C.mutedDim} style={{ transform: openPoint === i ? "rotate(180deg)" : "none", transition: "transform .15s ease" }} />
              </button>
              {openPoint === i && <p className="pt-1.5 pb-2" style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.5 }}>{p}</p>}
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

/* ============================================================
   REALISTIC SEED DATA
   ============================================================ */
const ORG_SEED = { name: "Meridian Financial Group", size: "large", industry: "Financial Services" };

const PEOPLE = [
  { name: "Sarah Al-Mutairi", role: "CISO", dept: "IT Security" },
  { name: "Omar Haddad", role: "IT Manager", dept: "IT Security" },
  { name: "Layla Ibrahim", role: "Compliance Lead", dept: "Legal & Compliance" },
  { name: "David Chen", role: "Engineering Lead", dept: "Engineering" },
  { name: "Fatima Noor", role: "Risk Analyst", dept: "Legal & Compliance" },
];

const FRAMEWORKS = [
  { code: "ISO27001", name: "ISO/IEC 27001:2022", controls: 93 },
  { code: "SAMA", name: "SAMA CSF", controls: 25 },
  { code: "NCAECC", name: "NCA ECC-1:2024", controls: 108 },
];

const CONTROLS_SAMPLE = {
  ISO27001: [
    // 5. Organizational controls
    ["5.1", "Policies for information security", "implemented"],
    ["5.2", "Information security roles and responsibilities", "implemented"],
    ["5.3", "Segregation of duties", "partial"],
    ["5.4", "Management responsibilities", "implemented"],
    ["5.5", "Contact with authorities", "partial"],
    ["5.6", "Contact with special interest groups", "not_implemented"],
    ["5.7", "Threat intelligence", "not_implemented"],
    ["5.8", "Information security in project management", "partial"],
    ["5.9", "Inventory of information and other associated assets", "implemented"],
    ["5.10", "Acceptable use of information and other associated assets", "implemented"],
    ["5.11", "Return of assets", "implemented"],
    ["5.12", "Classification of information", "partial"],
    ["5.13", "Labelling of information", "partial"],
    ["5.14", "Information transfer", "partial"],
    ["5.15", "Access control", "partial"],
    ["5.16", "Identity management", "partial"],
    ["5.17", "Authentication information", "partial"],
    ["5.18", "Access rights", "partial"],
    ["5.19", "Information security in supplier relationships", "not_implemented"],
    ["5.20", "Addressing information security within supplier agreements", "not_implemented"],
    ["5.21", "Managing information security in the ICT supply chain", "not_implemented"],
    ["5.22", "Monitoring, review and change management of supplier services", "not_implemented"],
    ["5.23", "Information security for use of cloud services", "partial"],
    ["5.24", "Information security incident management planning and preparation", "not_implemented"],
    ["5.25", "Assessment and decision on information security events", "not_implemented"],
    ["5.26", "Response to information security incidents", "not_implemented"],
    ["5.27", "Learning from information security incidents", "not_implemented"],
    ["5.28", "Collection of evidence", "na"],
    ["5.29", "Information security during disruption", "not_implemented"],
    ["5.30", "ICT readiness for business continuity", "not_implemented"],
    ["5.31", "Legal, statutory, regulatory and contractual requirements", "implemented"],
    ["5.32", "Intellectual property rights", "implemented"],
    ["5.33", "Protection of records", "partial"],
    ["5.34", "Privacy and protection of PII", "partial"],
    ["5.35", "Independent review of information security", "not_implemented"],
    ["5.36", "Compliance with policies, rules and standards for information security", "partial"],
    ["5.37", "Documented operating procedures", "partial"],
    // 6. People controls
    ["6.1", "Screening", "implemented"],
    ["6.2", "Terms and conditions of employment", "implemented"],
    ["6.3", "Information security awareness, education and training", "implemented"],
    ["6.4", "Disciplinary process", "partial"],
    ["6.5", "Responsibilities after termination or change of employment", "implemented"],
    ["6.6", "Confidentiality or non-disclosure agreements", "implemented"],
    ["6.7", "Remote working", "partial"],
    ["6.8", "Information security event reporting", "partial"],
    // 7. Physical controls
    ["7.1", "Physical security perimeters", "implemented"],
    ["7.2", "Physical entry", "implemented"],
    ["7.3", "Securing offices, rooms and facilities", "implemented"],
    ["7.4", "Physical security monitoring", "partial"],
    ["7.5", "Protecting against physical and environmental threats", "implemented"],
    ["7.6", "Working in secure areas", "na"],
    ["7.7", "Clear desk and clear screen", "partial"],
    ["7.8", "Equipment siting and protection", "implemented"],
    ["7.9", "Security of assets off-premises", "partial"],
    ["7.10", "Storage media", "partial"],
    ["7.11", "Supporting utilities", "implemented"],
    ["7.12", "Cabling security", "implemented"],
    ["7.13", "Equipment maintenance", "implemented"],
    ["7.14", "Secure disposal or re-use of equipment", "partial"],
    // 8. Technological controls
    ["8.1", "User end point devices", "partial"],
    ["8.2", "Privileged access rights", "partial"],
    ["8.3", "Information access restriction", "partial"],
    ["8.4", "Access to source code", "partial"],
    ["8.5", "Secure authentication", "partial"],
    ["8.6", "Capacity management", "implemented"],
    ["8.7", "Protection against malware", "not_implemented"],
    ["8.8", "Management of technical vulnerabilities", "partial"],
    ["8.9", "Configuration management", "partial"],
    ["8.10", "Information deletion", "not_implemented"],
    ["8.11", "Data masking", "not_implemented"],
    ["8.12", "Data leakage prevention", "not_implemented"],
    ["8.13", "Information backup", "implemented"],
    ["8.14", "Redundancy of information processing facilities", "partial"],
    ["8.15", "Logging", "partial"],
    ["8.16", "Monitoring activities", "partial"],
    ["8.17", "Clock synchronization", "implemented"],
    ["8.18", "Use of privileged utility programs", "not_implemented"],
    ["8.19", "Installation of software on operational systems", "partial"],
    ["8.20", "Networks security", "partial"],
    ["8.21", "Security of network services", "partial"],
    ["8.22", "Segregation of networks", "not_implemented"],
    ["8.23", "Web filtering", "partial"],
    ["8.24", "Use of cryptography", "partial"],
    ["8.25", "Secure development life cycle", "not_implemented"],
    ["8.26", "Application security requirements", "not_implemented"],
    ["8.27", "Secure system architecture and engineering principles", "not_implemented"],
    ["8.28", "Secure coding", "partial"],
    ["8.29", "Security testing in development and acceptance", "not_implemented"],
    ["8.30", "Outsourced development", "na"],
    ["8.31", "Separation of development, test and production environments", "partial"],
    ["8.32", "Change management", "partial"],
    ["8.33", "Test information", "not_implemented"],
    ["8.34", "Protection of information systems during audit testing", "not_implemented"],
  ],
  SAMA: [
    // 1. Cybersecurity Governance
    ["1.1", "Cybersecurity Governance", "implemented"],
    ["1.2", "Cybersecurity Strategy", "implemented"],
    ["1.3", "Cybersecurity Policy and Standards", "partial"],
    ["1.4", "Cybersecurity Roles and Responsibilities", "implemented"],
    ["1.5", "Cybersecurity Risk Management", "partial"],
    ["1.6", "Cybersecurity in Project & Change Management", "partial"],
    ["1.7", "Cybersecurity Architecture and Engineering", "not_implemented"],
    ["1.8", "Cybersecurity Compliance and Audit", "partial"],
    // 2. Cybersecurity Defense
    ["2.1", "Asset Management", "implemented"],
    ["2.2", "Access Control and Identity Management", "partial"],
    ["2.3", "Physical and Environmental Security", "implemented"],
    ["2.4", "Network Security Management", "partial"],
    ["2.5", "Operating System and Server Security", "partial"],
    ["2.6", "Application Security", "not_implemented"],
    ["2.7", "Database Security", "partial"],
    ["2.8", "Mobile Device Security", "not_implemented"],
    ["2.9", "Payment Systems Security", "implemented"],
    ["2.10", "Cryptography and Key Management", "partial"],
    ["2.11", "Vulnerability Management and Penetration Testing", "partial"],
    ["2.12", "Cybersecurity Operations Center (SOC) & Monitoring", "not_implemented"],
    ["2.13", "Incident and Threat Management", "not_implemented"],
    // 3. Cybersecurity Resiliency
    ["3.1", "Business Continuity and Disaster Recovery Planning", "not_implemented"],
    ["3.2", "Cyber Resilience Strategy and Testing", "not_implemented"],
    // 4. Third-Party Cybersecurity
    ["4.1", "Third-Party / Vendor Risk Management", "not_implemented"],
    ["4.2", "Cloud Computing Security", "partial"],
  ],
  NCAECC: [
    // 1. Cybersecurity Governance
    ["1-1-1", "Cybersecurity strategy identified, documented and approved", "implemented"],
    ["1-1-2", "Action plan to execute the cybersecurity strategy", "implemented"],
    ["1-1-3", "Periodic review of the cybersecurity strategy", "partial"],
    ["1-2-1", "Independent cybersecurity department established", "implemented"],
    ["1-2-2", "Cybersecurity positions filled with qualified Saudi professionals", "partial"],
    ["1-2-3", "Cybersecurity supervisory committee established", "not_implemented"],
    ["1-3-1", "Cybersecurity policies and procedures identified and approved", "implemented"],
    ["1-3-2", "Cybersecurity policies and procedures implemented", "implemented"],
    ["1-3-3", "Policies supported by technical security standards", "partial"],
    ["1-3-4", "Periodic review and update of policies and procedures", "partial"],
    ["1-4-1", "Cybersecurity governance structure, roles and responsibilities approved", "implemented"],
    ["1-4-2", "Periodic review of cybersecurity roles and responsibilities", "partial"],
    ["1-5-1", "Cybersecurity risk management methodology identified and approved", "implemented"],
    ["1-5-2", "Risk management methodology implemented", "partial"],
    ["1-5-3", "Risk assessment performed at key project/change milestones", "partial"],
    ["1-5-4", "Periodic review of risk management methodology", "not_implemented"],
    ["1-6-1", "Cybersecurity requirements included in project/change management", "partial"],
    ["1-6-2", "Minimum cybersecurity requirements for project/change management", "partial"],
    ["1-6-3", "Minimum cybersecurity requirements for software development projects", "not_implemented"],
    ["1-6-4", "Periodic review of project management cybersecurity requirements", "not_implemented"],
    ["1-7-1", "Compliance with nationally approved cybersecurity agreements", "implemented"],
    ["1-8-1", "Periodic review of cybersecurity controls implementation", "partial"],
    ["1-8-2", "Independent audit and review of cybersecurity controls", "not_implemented"],
    ["1-8-3", "Documentation and reporting of audit/review results", "not_implemented"],
    ["1-9-1", "HR cybersecurity requirements identified and approved", "implemented"],
    ["1-9-2", "HR cybersecurity requirements implemented", "implemented"],
    ["1-9-3", "Minimum pre-employment cybersecurity requirements", "partial"],
    ["1-9-4", "Minimum during-employment cybersecurity requirements", "implemented"],
    ["1-9-5", "Access revoked immediately upon termination", "implemented"],
    ["1-9-6", "Periodic review of HR cybersecurity requirements", "partial"],
    ["1-10-1", "Cybersecurity awareness program developed and approved", "implemented"],
    ["1-10-2", "Awareness program implemented", "implemented"],
    ["1-10-3", "Awareness program covers key cyber risks (phishing, mobile, browsing, social media)", "partial"],
    ["1-10-4", "Specialized training for cybersecurity-related roles", "partial"],
    ["1-10-5", "Periodic review of awareness program", "not_implemented"],
    // 2. Cybersecurity Defense
    ["2-1-1", "Asset management requirements identified and approved", "implemented"],
    ["2-1-2", "Asset management requirements implemented", "implemented"],
    ["2-1-3", "Acceptable use policy identified and approved", "implemented"],
    ["2-1-4", "Acceptable use policy implemented", "partial"],
    ["2-1-5", "Assets classified, labeled and handled per regulations", "partial"],
    ["2-1-6", "Periodic review of asset management requirements", "not_implemented"],
    ["2-2-1", "Identity and access management requirements identified and approved", "implemented"],
    ["2-2-2", "Identity and access management requirements implemented", "partial"],
    ["2-2-3", "Minimum IAM requirements (MFA, least privilege, privileged access)", "partial"],
    ["2-2-4", "Periodic review of IAM implementation", "not_implemented"],
    ["2-3-1", "System/facility protection requirements identified and approved", "implemented"],
    ["2-3-2", "System/facility protection requirements implemented", "partial"],
    ["2-3-3", "Minimum protection requirements (anti-malware, removable media, patching)", "not_implemented"],
    ["2-3-4", "Periodic review of system/facility protection", "not_implemented"],
    ["2-4-1", "Email protection requirements identified and approved", "implemented"],
    ["2-4-2", "Email protection requirements implemented", "partial"],
    ["2-4-3", "Minimum email protection requirements (filtering, MFA, SPF/DKIM/DMARC)", "partial"],
    ["2-4-4", "Periodic review of email protection", "not_implemented"],
    ["2-5-1", "Network security requirements identified and approved", "implemented"],
    ["2-5-2", "Network security requirements implemented", "partial"],
    ["2-5-3", "Minimum network security requirements (segmentation, IPS, DDoS protection)", "partial"],
    ["2-5-4", "Periodic review of network security management", "not_implemented"],
    ["2-6-1", "Mobile/BYOD security requirements identified and approved", "partial"],
    ["2-6-2", "Mobile/BYOD security requirements implemented", "not_implemented"],
    ["2-6-3", "Minimum mobile/BYOD requirements (encryption, remote wipe)", "not_implemented"],
    ["2-6-4", "Periodic review of mobile/BYOD security", "not_implemented"],
    ["2-7-1", "Data protection requirements identified and approved", "implemented"],
    ["2-7-2", "Data protection requirements implemented based on classification", "partial"],
    ["2-7-3", "Periodic review of data protection requirements", "not_implemented"],
    ["2-8-1", "Cryptography requirements identified and approved", "implemented"],
    ["2-8-2", "Cryptography requirements implemented", "partial"],
    ["2-8-3", "Minimum cryptography requirements (National Cryptographic Standards)", "partial"],
    ["2-8-4", "Periodic review of cryptography requirements", "not_implemented"],
    ["2-9-1", "Backup and recovery requirements identified and approved", "implemented"],
    ["2-9-2", "Backup and recovery requirements implemented", "implemented"],
    ["2-9-3", "Minimum backup requirements (coverage, quick recovery, periodic testing)", "partial"],
    ["2-9-4", "Periodic review of backup and recovery management", "partial"],
    ["2-10-1", "Vulnerability management requirements identified and approved", "implemented"],
    ["2-10-2", "Vulnerability management requirements implemented", "partial"],
    ["2-10-3", "Minimum vulnerability management requirements (assessment, remediation, patching)", "partial"],
    ["2-10-4", "Periodic review of vulnerability management", "not_implemented"],
    ["2-11-1", "Penetration testing requirements identified and approved", "partial"],
    ["2-11-2", "Penetration testing requirements implemented", "not_implemented"],
    ["2-11-3", "Minimum penetration testing scope and frequency", "not_implemented"],
    ["2-11-4", "Periodic review of penetration testing", "not_implemented"],
    ["2-12-1", "Event logging and monitoring requirements identified and approved", "implemented"],
    ["2-12-2", "Event logging and monitoring requirements implemented", "partial"],
    ["2-12-3", "Minimum logging/monitoring requirements (SIEM, 12-month retention)", "partial"],
    ["2-12-4", "Periodic review of logging and monitoring", "not_implemented"],
    ["2-13-1", "Incident and threat management requirements identified and approved", "partial"],
    ["2-13-2", "Incident and threat management requirements implemented", "not_implemented"],
    ["2-13-3", "Minimum incident management requirements (response plans, NCA reporting)", "not_implemented"],
    ["2-13-4", "Periodic review of incident and threat management", "not_implemented"],
    ["2-14-1", "Physical security requirements identified and approved", "implemented"],
    ["2-14-2", "Physical security requirements implemented", "implemented"],
    ["2-14-3", "Minimum physical security requirements (access control, CCTV)", "partial"],
    ["2-14-4", "Periodic review of physical security requirements", "partial"],
    ["2-15-1", "Web application security requirements identified and approved", "implemented"],
    ["2-15-2", "Web application security requirements implemented", "partial"],
    ["2-15-3", "Minimum web app security requirements (WAF, HTTPS, authentication)", "partial"],
    ["2-15-4", "Periodic review of web application security", "not_implemented"],
    // 3. Cybersecurity Resilience
    ["3-1-1", "BCM cybersecurity requirements identified and approved", "partial"],
    ["3-1-2", "BCM cybersecurity requirements implemented", "not_implemented"],
    ["3-1-3", "Minimum BCM requirements (continuity, response plans, DR plans)", "not_implemented"],
    ["3-1-4", "Periodic review of BCM cybersecurity requirements", "not_implemented"],
    // 4. Third-Party and Cloud Computing Cybersecurity
    ["4-1-1", "Third-party cybersecurity contract requirements identified and approved", "partial"],
    ["4-1-2", "Minimum contract requirements (NDA, incident communication)", "not_implemented"],
    ["4-1-3", "Minimum requirements for outsourced/managed cybersecurity services", "not_implemented"],
    ["4-1-4", "Periodic review of third-party cybersecurity requirements", "not_implemented"],
    ["4-2-1", "Cloud/hosting cybersecurity requirements identified and approved", "partial"],
    ["4-2-2", "Cloud/hosting cybersecurity requirements implemented", "partial"],
    ["4-2-3", "Minimum cloud/hosting requirements (data protection, tenant isolation)", "not_implemented"],
    ["4-2-4", "Periodic review of cloud/hosting cybersecurity requirements", "not_implemented"],
  ],
};
const CONTROL_TITLE = {};
Object.entries(CONTROLS_SAMPLE).forEach(([fw, rows]) => rows.forEach(([code, title]) => { CONTROL_TITLE[`${fw}:${code}`] = title; }));

const RISK_SEED = [
  { code: "2-3-3", framework: "NCAECC", title: "Endpoint / malware protection", likelihood: 4, impact: 5, owner: "Omar Haddad", status: "Open" },
  { code: "8.7", framework: "ISO27001", title: "Protection against malware", likelihood: 4, impact: 4.5, owner: "Omar Haddad", status: "In progress" },
  { code: "2-13-2", framework: "NCAECC", title: "Incident response plan & NCA notification", likelihood: 3, impact: 5, owner: "Sarah Al-Mutairi", status: "Open" },
  { code: "8.24", framework: "ISO27001", title: "Use of cryptography", likelihood: 3, impact: 4.7, owner: "David Chen", status: "In progress" },
  { code: "5.15", framework: "ISO27001", title: "Access control", likelihood: 3, impact: 3, owner: "Omar Haddad", status: "Open" },
  { code: "2-10-2", framework: "NCAECC", title: "Vulnerability management", likelihood: 2, impact: 4, owner: "David Chen", status: "Open" },
].map((r) => ({ ...r, id: nextId("risk"), score: Math.round(r.likelihood * r.impact) }));

const CONNECTOR_CATEGORIES = ["All", "Identity", "Cloud", "Endpoint & Vuln", "SIEM & Network", "DevOps & ITSM", "Backup"];
const CONNECTORS_SEED = [
  { name: "Microsoft Entra ID", category: "Identity", Icon: Users, pulls: "Users, MFA status, admin accounts, password policy", connected: true, lastSync: Date.now() - 12 * 60000, evidence: 34 },
  { name: "Microsoft 365", category: "Identity", Icon: Mail, pulls: "Secure Score, Conditional Access, Defender status", connected: true, lastSync: Date.now() - 40 * 60000, evidence: 21 },
  { name: "AWS", category: "Cloud", Icon: Cloud, pulls: "Storage encryption, security groups, public IPs", connected: true, lastSync: Date.now() - 3 * 3600000, evidence: 18 },
  { name: "Microsoft Azure", category: "Cloud", Icon: Cloud, pulls: "Security Center config, VM encryption, NSGs", connected: false, lastSync: null, evidence: 0 },
  { name: "Microsoft Defender", category: "Endpoint & Vuln", Icon: ShieldAlert, pulls: "Exposure score, devices, alerts, recommendations", connected: true, lastSync: Date.now() - 38 * 60000, evidence: 15 },
  { name: "CrowdStrike", category: "Endpoint & Vuln", Icon: ShieldCheck, pulls: "Sensor status, endpoint health, detections", connected: false, lastSync: null, evidence: 0 },
  { name: "Nessus / Qualys", category: "Endpoint & Vuln", Icon: Bug, pulls: "Vulnerability reports, CVEs, CVSS, affected assets", connected: true, lastSync: Date.now() - 5 * 3600000, evidence: 9 },
  { name: "Microsoft Sentinel", category: "SIEM & Network", Icon: Activity, pulls: "Security incidents, failed logins, attack trends", connected: false, lastSync: null, evidence: 0 },
  { name: "Fortinet / Palo Alto", category: "SIEM & Network", Icon: Router, pulls: "Firewall rules, VPN config, firmware version", connected: false, lastSync: null, evidence: 0 },
  { name: "GitHub", category: "DevOps & ITSM", Icon: GitBranch, pulls: "Secret scanning, Dependabot alerts, branch protection", connected: true, lastSync: Date.now() - 5 * 60000, evidence: 12 },
  { name: "Jira", category: "DevOps & ITSM", Icon: ClipboardList, pulls: "Remediation tasks, owners, due dates, status", connected: false, lastSync: null, evidence: 0 },
  { name: "Intune", category: "DevOps & ITSM", Icon: Smartphone, pulls: "Device compliance, BitLocker, patch status", connected: false, lastSync: null, evidence: 0 },
  { name: "Veeam / Acronis", category: "Backup", Icon: Database, pulls: "Last backup, failed backups, restore test results", connected: true, lastSync: Date.now() - 6 * 3600000, evidence: 7 },
].map((c) => ({ ...c, status: c.connected ? "connected" : "not_connected", stageIndex: -1, error: false }));

const EVIDENCE_SEED = [
  { name: "Information_Security_Policy_v3.pdf", control: "ISO27001 5.1", size: "412 KB", uploaded: Date.now() - 2 * 86400000 },
  { name: "Access_Control_Matrix.xlsx", control: "ISO27001 5.15", size: "88 KB", uploaded: Date.now() - 5 * 86400000 },
  { name: "Backup_Test_Report_Q2.pdf", control: "ISO27001 8.13", size: "1.2 MB", uploaded: Date.now() - 7 * 86400000 },
  { name: "Vendor_DPA_CloudProvider.pdf", control: "NCAECC 4-1-2", size: "640 KB", uploaded: Date.now() - 14 * 86400000 },
  { name: "Pentest_Summary_2026H1.pdf", control: "NCAECC 2-11-2", size: "3.4 MB", uploaded: Date.now() - 21 * 86400000 },
].map((f) => ({ ...f, id: nextId("ev"), status: "done" }));

const ACTIVITY_SEED = [
  { type: "connector_ok", text: "Microsoft Entra ID synchronized — 34 items imported", ts: Date.now() - 12 * 60000 },
  { type: "evidence", text: "Fatima Noor uploaded Pentest_Summary_2026H1.pdf", ts: Date.now() - 21 * 86400000 },
  { type: "assessment", text: "Layla Ibrahim completed NCA ECC baseline assessment section 2", ts: Date.now() - 2 * 86400000 },
  { type: "user", text: "David Chen invited to Meridian Financial Group workspace", ts: Date.now() - 3 * 86400000 },
  { type: "connector_fail", text: "Microsoft Sentinel connector failed — token expired", ts: Date.now() - 4 * 86400000 },
  { type: "connector_ok", text: "Microsoft Sentinel connector recovered after re-authentication", ts: Date.now() - 4 * 86400000 + 1800000 },
  { type: "policy", text: "Sarah Al-Mutairi approved Information Security Policy v3", ts: Date.now() - 6 * 86400000 },
  { type: "incident", text: "Incident created: suspicious login pattern flagged by Defender", ts: Date.now() - 9 * 86400000 },
  { type: "evidence_expired", text: "Vendor_DPA_CloudProvider.pdf evidence expiring in 14 days", ts: Date.now() - 1 * 86400000 },
  { type: "framework", text: "SAMA CSF added to workspace frameworks", ts: Date.now() - 12 * 86400000 },
].map((a) => ({ ...a, id: nextId("act") })).sort((a, b) => b.ts - a.ts);

const ACTIVITY_META = {
  connector_ok: { Icon: RefreshCw, color: C.success },
  connector_fail: { Icon: WifiOff, color: C.critical },
  evidence: { Icon: FileCheck2, color: C.accent },
  evidence_expired: { Icon: AlertTriangle, color: C.warning },
  assessment: { Icon: ClipboardCheck, color: C.info },
  user: { Icon: UserPlus, color: C.accent2 },
  policy: { Icon: FileText, color: C.success },
  incident: { Icon: AlertOctagon, color: C.critical },
  risk: { Icon: AlertTriangle, color: C.critical },
  control: { Icon: GitMerge, color: C.accent },
  framework: { Icon: Shield, color: C.accent },
};

const REPORTS_META = [
  { key: "exec", name: "Executive Compliance Summary", desc: "Board-ready overview of unified score, trend, and top risks.", format: "TXT" },
  { key: "iso", name: "ISO/IEC 27001 Gap Assessment", desc: "Full control-by-control status against Annex A.", format: "CSV" },
  { key: "ncaecc", name: "NCA ECC Readiness Report", desc: "Applicability-aware status for NCA Essential Cybersecurity Controls.", format: "CSV" },
  { key: "risk", name: "Risk Register Export", desc: "All open risks with scores, owners, and treatment plans.", format: "CSV" },
];

const STAGES_CONNECTOR = ["Initializing…", "Authenticating…", "Checking permissions…", "Discovering assets…", "Importing data…", "Mapping controls…", "Sync completed"];
const STAGES_EVIDENCE = ["Uploading", "Virus scan", "OCR", "AI reading document", "Extracting metadata", "Finding related controls", "Calculating coverage", "Compliance updated", "Risk updated", "Completed"];
const STAGES_REPORT = ["Collecting data", "Calculating compliance", "Calculating risk", "Rendering charts", "Generating PDF", "Ready"];
const STAGES_AI = ["Analyzing controls…", "Calculating risks…", "Comparing frameworks…", "Building executive report…", "Thinking…", "Done"];

const IMPORT_KINDS = ["Assets", "Users", "Groups", "Policies", "Devices", "Alerts", "Compliance signals"];

/* ============================================================
   GLOBAL STORE (reducer + context)
   ============================================================ */
const initialState = {
  org: ORG_SEED,
  controls: {
    ISO27001: Object.fromEntries(CONTROLS_SAMPLE.ISO27001.map(([code, , status]) => [code, STATUS_TO_MATURITY[status] ?? 1])),
    SAMA: Object.fromEntries(CONTROLS_SAMPLE.SAMA.map(([code, , status]) => [code, STATUS_TO_MATURITY[status] ?? 1])),
    NCAECC: Object.fromEntries(CONTROLS_SAMPLE.NCAECC.map(([code, , status]) => [code, STATUS_TO_MATURITY[status] ?? 1])),
  },
  connectors: CONNECTORS_SEED,
  evidence: EVIDENCE_SEED,
  risks: RISK_SEED,
  activity: ACTIVITY_SEED,
  gapAnalysis: null,
  toasts: [],
};

function pushActivity(state, type, text) {
  return [{ id: nextId("act"), type, text, ts: Date.now() }, ...state].slice(0, 40);
}

function reducer(state, action) {
  switch (action.type) {
    case "INIT_ORG":
      return { ...state, org: action.org };

    case "SET_GAP_ANALYSIS":
      return { ...state, gapAnalysis: { ...action.data, generatedAt: Date.now() } };

    case "SET_CONTROL_STATUS": {
      const { framework, code, status } = action;
      const controls = { ...state.controls, [framework]: { ...state.controls[framework], [code]: status } };
      let risks = state.risks;
      let activity = state.activity;
      if (status === 5) {
        const idx = risks.findIndex((r) => r.code === code && r.framework === framework && r.status !== "Resolved");
        if (idx >= 0) {
          const r = risks[idx];
          const newScore = Math.max(1, Math.round(r.score * 0.25));
          risks = [...risks];
          risks[idx] = { ...r, _prevScore: r.score, _prevStatus: r.status, score: newScore, level: scoreToLevel(newScore), status: "Mitigated" };
          activity = pushActivity(activity, "risk", `Risk score changed — ${code} dropped to ${newScore}/25 after control update`);
        }
      }
      activity = pushActivity(activity, "control", `${framework} ${code} marked ${MATURITY_META[status].label}`);
      return { ...state, controls, risks, activity };
    }

    case "CONNECTOR_SYNC_START":
      return {
        ...state,
        connectors: state.connectors.map((c) => c.name === action.name ? { ...c, status: "syncing", stageIndex: 0, error: false } : c),
      };
    case "CONNECTOR_SYNC_STAGE":
      return {
        ...state,
        connectors: state.connectors.map((c) => c.name === action.name ? { ...c, stageIndex: action.stageIndex } : c),
      };
    case "CONNECTOR_SYNC_DONE": {
      const connectors = state.connectors.map((c) =>
        c.name === action.name
          ? { ...c, status: "connected", connected: true, stageIndex: STAGES_CONNECTOR.length - 1, lastSync: Date.now(), evidence: action.evidence, importBreakdown: action.breakdown }
          : c
      );
      const activity = pushActivity(state.activity, "connector_ok", `${action.name} synchronized — ${action.evidence} items imported`);
      return { ...state, connectors, activity };
    }
    case "CONNECTOR_DISCONNECT": {
      const connectors = state.connectors.map((c) =>
        c.name === action.name ? { ...c, status: "not_connected", connected: false, evidence: 0, lastSync: null, stageIndex: -1 } : c
      );
      const activity = pushActivity(state.activity, "connector_fail", `${action.name} disconnected`);
      return { ...state, connectors, activity };
    }

    case "EVIDENCE_UPLOAD_START": {
      const item = { id: action.id, name: action.name, size: action.size, control: "—", status: "processing", stageIndex: 0, uploaded: Date.now() };
      return { ...state, evidence: [item, ...state.evidence] };
    }
    case "EVIDENCE_STAGE":
      return { ...state, evidence: state.evidence.map((e) => e.id === action.id ? { ...e, stageIndex: action.stageIndex } : e) };
    case "EVIDENCE_DONE": {
      const evidence = state.evidence.map((e) => e.id === action.id ? { ...e, status: "done", control: action.control, stageIndex: STAGES_EVIDENCE.length - 1 } : e);
      let controls = state.controls;
      let activity = pushActivity(state.activity, "evidence", `${action.uploader} uploaded evidence linked to ${action.control}`);
      if (action.bump) {
        const { framework, code } = action.bump;
        const current = controls[framework]?.[code];
        if (current === 1) {
          controls = { ...controls, [framework]: { ...controls[framework], [code]: 3 } };
          activity = pushActivity(activity, "control", `${framework} ${code} maturity improved to Level 3 · Defined from new evidence`);
        }
      }
      return { ...state, evidence, controls, activity };
    }

    case "RESOLVE_RISK": {
      const risks = state.risks.map((r) => r.id === action.id
        ? { ...r, _prevScore: r.score, _prevStatus: r.status, status: "Resolved", score: 0, level: "low" }
        : r);
      const r = state.risks.find((x) => x.id === action.id);
      const activity = pushActivity(state.activity, "risk", `${r?.code} · ${r?.title} marked resolved by ${state.currentUser || "you"}`);
      return { ...state, risks, activity };
    }
    case "UNDO_RESOLVE_RISK": {
      const risks = state.risks.map((r) => r.id === action.id && r._prevStatus
        ? { ...r, status: r._prevStatus, score: r._prevScore, level: scoreToLevel(r._prevScore) }
        : r);
      return { ...state, risks };
    }
    case "DELETE_RISK": {
      const target = state.risks.find(r => r.id === action.id);
      return { ...state, risks: state.risks.filter((r) => r.id !== action.id), _lastDeleted: target };
    }
    case "RESTORE_RISK": {
      if (!state._lastDeleted) return state;
      return { ...state, risks: [state._lastDeleted, ...state.risks], _lastDeleted: null };
    }

    case "ADD_ACTIVITY":
      return { ...state, activity: pushActivity(state.activity, action.kind, action.text) };

    case "ADD_TOAST":
      return { ...state, toasts: [...state.toasts, action.toast] };
    case "REMOVE_TOAST":
      return { ...state, toasts: state.toasts.filter((t) => t.id !== action.id) };

    default:
      return state;
  }
}

const StoreContext = createContext(null);
function useStore() {
  return useContext(StoreContext);
}

function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const toast = useMemo(() => ({
    push: (message, opts = {}) => {
      const id = nextId("toast");
      dispatch({ type: "ADD_TOAST", toast: { id, message, type: opts.type || "info", action: opts.action } });
      if (!opts.sticky) setTimeout(() => dispatch({ type: "REMOVE_TOAST", id }), opts.duration || 5000);
      return id;
    },
    success: (m, opts) => toast.push(m, { ...opts, type: "success" }),
    error: (m, opts) => toast.push(m, { ...opts, type: "error" }),
    info: (m, opts) => toast.push(m, { ...opts, type: "info" }),
  }), []);
  toast.success = (m, opts) => toast.push(m, { ...opts, type: "success" });
  toast.error = (m, opts) => toast.push(m, { ...opts, type: "error" });
  toast.info = (m, opts) => toast.push(m, { ...opts, type: "info" });

  const actions = useMemo(() => ({
    setControlStatus: (framework, code, status) => dispatch({ type: "SET_CONTROL_STATUS", framework, code, status }),

    startConnectorSync: (name) => {
      dispatch({ type: "CONNECTOR_SYNC_START", name });
      STAGES_CONNECTOR.forEach((_, i) => {
        setTimeout(() => dispatch({ type: "CONNECTOR_SYNC_STAGE", name, stageIndex: i }), i * 550);
      });
      setTimeout(() => {
        const evidence = Math.floor(Math.random() * 22) + 6;
        const breakdown = IMPORT_KINDS.slice(0, 4 + Math.floor(Math.random() * 3)).map((k) => ({ kind: k, count: Math.floor(Math.random() * 40) + 3 }));
        dispatch({ type: "CONNECTOR_SYNC_DONE", name, evidence, breakdown });
        toast.success(`${name} connected — ${evidence} items imported`);
      }, STAGES_CONNECTOR.length * 550 + 250);
    },
    disconnectConnector: (name) => {
      dispatch({ type: "CONNECTOR_DISCONNECT", name });
      toast.info(`${name} disconnected`);
    },

    uploadEvidence: (name, size, linkTo, uploader = "You") => {
      const id = nextId("ev");
      dispatch({ type: "EVIDENCE_UPLOAD_START", id, name, size });
      STAGES_EVIDENCE.forEach((_, i) => {
        setTimeout(() => dispatch({ type: "EVIDENCE_STAGE", id, stageIndex: i }), i * 420);
      });
      setTimeout(() => {
        const control = linkTo ? `${linkTo.framework} ${linkTo.code}` : "Unmapped — review needed";
        dispatch({ type: "EVIDENCE_DONE", id, control, bump: linkTo, uploader });
        toast.success(`Evidence processed — mapped to ${control}`);
      }, STAGES_EVIDENCE.length * 420 + 300);
      return id;
    },

    resolveRisk: (id) => {
      dispatch({ type: "RESOLVE_RISK", id });
      toast.success("Risk marked resolved", {
        action: { label: "Undo", onClick: () => { dispatch({ type: "UNDO_RESOLVE_RISK", id }); toast.info("Resolution undone"); } },
        duration: 6000,
      });
    },
    deleteRisk: (id) => {
      dispatch({ type: "DELETE_RISK", id });
      toast.info("Risk removed", {
        action: { label: "Undo", onClick: () => dispatch({ type: "RESTORE_RISK" }) },
        duration: 6000,
      });
    },
    addActivity: (kind, text) => dispatch({ type: "ADD_ACTIVITY", kind, text }),
  }), [toast]);

  const value = useMemo(() => ({ state, dispatch, actions, toast }), [state, actions, toast]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

/* ============================================================
   SELECTORS
   ============================================================ */
function frameworkScore(controlsMap) {
  const entries = Object.values(controlsMap).filter((s) => s !== "na");
  if (entries.length === 0) return 0;
  const sum = entries.reduce((a, level) => a + maturityWeight(level), 0);
  return Math.round((sum / entries.length) * 100);
}
function useCompliance() {
  const { state } = useStore();
  return useMemo(() => {
    if (state.gapAnalysis) {
      const perFramework = state.gapAnalysis.frameworkCompliance.map((f) => {
        const meta = FRAMEWORKS.find((fw) => fw.code === f.code);
        return { code: f.code, name: meta?.name || f.code, controls: meta?.controls, score: f.percentage, summary: f.summary };
      });
      const unified = perFramework.length ? Math.round(perFramework.reduce((a, f) => a + f.score, 0) / perFramework.length) : 0;
      return { perFramework, unified };
    }
    const perFramework = FRAMEWORKS.map((f) => ({ ...f, score: frameworkScore(state.controls[f.code] || {}) }));
    const unified = Math.round(perFramework.reduce((a, f) => a + f.score, 0) / perFramework.length);
    return { perFramework, unified };
  }, [state.controls, state.gapAnalysis]);
}
function useRiskIndex() {
  const { state } = useStore();
  return useMemo(() => {
    if (state.gapAnalysis?.riskControlGaps?.length) {
      const avg = state.gapAnalysis.riskControlGaps.reduce((a, x) => a + x.riskScore, 0) / state.gapAnalysis.riskControlGaps.length;
      return Math.round(avg);
    }
    const open = state.risks.filter((r) => r.status === "Open" || r.status === "In progress");
    if (open.length === 0) return 6;
    const avg = open.reduce((a, r) => a + r.score, 0) / open.length;
    return Math.min(100, Math.round((avg / 25) * 100));
  }, [state.risks, state.gapAnalysis]);
}
function useEvidenceCount() {
  const { state } = useStore();
  return useMemo(() => {
    const manual = state.evidence.filter((e) => e.status === "done").length;
    const auto = state.connectors.filter((c) => c.status === "connected").reduce((a, c) => a + c.evidence, 0);
    return { manual, auto, total: manual + auto };
  }, [state.evidence, state.connectors]);
}

/* ============================================================
   SHARED UI PRIMITIVES
   ============================================================ */
function Logo({ height = 26 }) {
  return <img src={wathaqLogo} alt="WATHAQ" style={{ height, width: "auto", display: "block" }} />;
}

function Badge({ children, color, bg }) {
  return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium" style={{ color, background: bg, fontFamily: F.mono }}>{children}</span>;
}

function Card({ children, className = "", style = {}, hover = false }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      className={`rounded-2xl border ${className}`}
      style={{ background: `linear-gradient(180deg, ${C.surface}, ${C.bgSoft})`, borderColor: hover && hovered ? C.accent : C.border, transition: "all .2s ease", ...style }}
      onMouseEnter={() => hover && setHovered(true)}
      onMouseLeave={() => hover && setHovered(false)}
    >
      {children}
    </div>
  );
}

function ScoreRing({ value, size = 116, stroke = 10, color = C.accent }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => { const t = setTimeout(() => setDisplay(value), 60); return () => clearTimeout(t); }, [value]);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (display / 100) * c;
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke={C.border} strokeWidth={stroke} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={offset} style={{ transition: "stroke-dashoffset 1s cubic-bezier(.4,0,.2,1)" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
        <span style={{ fontFamily: F.display, fontWeight: 800, fontSize: size * 0.26, color: C.text, lineHeight: 1 }}>{display}</span>
        <span style={{ fontSize: 11, color: C.muted }}>/ 100</span>
      </div>
    </div>
  );
}

function PrimaryButton({ children, onClick, icon: Icon, full = false, disabled = false, style = {} }) {
  return (
    <button
      onClick={onClick} disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 font-semibold transition-transform ${full ? "w-full" : ""}`}
      style={{ background: disabled ? C.surface2 : `linear-gradient(135deg, ${C.accent}, #6D5CE8)`, color: disabled ? C.mutedDim : "#fff", fontFamily: F.display, fontSize: 14.5, boxShadow: disabled ? "none" : "0 8px 24px -8px rgba(140,124,250,.55)", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.6 : 1, ...style }}
      onMouseDown={(e) => !disabled && (e.currentTarget.style.transform = "scale(.97)")}
      onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
    >
      {children} {Icon && <Icon size={17} />}
    </button>
  );
}
function GhostButton({ children, onClick, icon: Icon, disabled = false, style = {} }) {
  return (
    <button onClick={onClick} disabled={disabled} className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 font-semibold"
      style={{ background: "transparent", color: disabled ? C.mutedDim : C.text, border: `1px solid ${C.border}`, fontFamily: F.display, fontSize: 14.5, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.6 : 1, ...style }}>
      {children} {Icon && <Icon size={17} />}
    </button>
  );
}

/* ---- Stage progress (shared by connectors / evidence / reports / AI) ---- */
function StageChecklist({ stages, currentIndex, compact = false }) {
  const pct = Math.max(4, Math.round(((currentIndex + 1) / stages.length) * 100));
  return (
    <div>
      <div className="h-1.5 rounded-full overflow-hidden mb-3" style={{ background: C.border }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${C.accent2}, ${C.accent})`, transition: "width .5s ease" }} />
      </div>
      {!compact && (
        <div className="space-y-1.5">
          {stages.map((s, i) => (
            <div key={s} className="flex items-center gap-2.5">
              {i < currentIndex ? <CheckCircle2 size={14} color={C.success} /> : i === currentIndex ? <Loader2 size={14} color={C.accent} className="animate-spin" /> : <Circle size={13} color={C.mutedDim} />}
              <span style={{ fontSize: 12.5, color: i <= currentIndex ? C.text : C.mutedDim }}>{s}</span>
            </div>
          ))}
        </div>
      )}
      {compact && <div style={{ fontSize: 11.5, color: C.muted, fontFamily: F.mono }}>{stages[currentIndex]} · {pct}%</div>}
    </div>
  );
}

function ConfirmDialog({ open, title, body, confirmLabel = "Confirm", danger = false, onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4" style={{ background: "rgba(6,5,10,.6)", backdropFilter: "blur(3px)" }} onClick={onCancel}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-2xl p-6" style={{ background: C.surface, border: `1px solid ${C.border}`, boxShadow: "0 30px 80px -20px rgba(0,0,0,.7)" }}>
        <div className="flex items-center gap-3 mb-3">
          <div className="rounded-full p-2" style={{ background: danger ? C.criticalSoft : C.accentSoft }}>
            <Info size={18} color={danger ? C.critical : C.accent} />
          </div>
          <h3 style={{ fontFamily: F.display, fontWeight: 700, fontSize: 16 }}>{title}</h3>
        </div>
        <p style={{ fontSize: 13.5, color: C.muted, lineHeight: 1.55, marginBottom: 22 }}>{body}</p>
        <div className="flex justify-end gap-3">
          <GhostButton onClick={onCancel} style={{ padding: "8px 16px", fontSize: 13 }}>Cancel</GhostButton>
          <PrimaryButton onClick={onConfirm} style={danger ? { background: C.critical, boxShadow: "none", padding: "8px 16px", fontSize: 13 } : { padding: "8px 16px", fontSize: 13 }}>{confirmLabel}</PrimaryButton>
        </div>
      </div>
    </div>
  );
}

function ToastContainer() {
  const { state, dispatch } = useStore();
  const ICONS = { success: CheckCircle2, error: XCircle, info: Info };
  const COLORS = { success: C.success, error: C.critical, info: C.accent };
  return (
    <div className="fixed bottom-6 right-6 z-[200] flex flex-col gap-2.5" style={{ maxWidth: 340 }}>
      {state.toasts.map((t) => {
        const Icon = ICONS[t.type] || Info;
        return (
          <div key={t.id} className="flex items-start gap-3 px-4 py-3.5 rounded-xl" style={{ background: C.surface2, border: `1px solid ${C.border}`, boxShadow: "0 12px 30px -10px rgba(0,0,0,.6)", animation: "wathaq-toast-in .25s ease" }}>
            <Icon size={17} color={COLORS[t.type] || C.accent} style={{ marginTop: 1, flexShrink: 0 }} />
            <div className="flex-1">
              <div style={{ fontSize: 13, color: C.text, lineHeight: 1.4 }}>{t.message}</div>
              {t.action && (
                <button onClick={() => { t.action.onClick(); dispatch({ type: "REMOVE_TOAST", id: t.id }); }} className="mt-1.5 flex items-center gap-1" style={{ color: C.accent, fontSize: 12, fontWeight: 600, fontFamily: F.display }}>
                  <RotateCcw size={12} /> {t.action.label}
                </button>
              )}
            </div>
            <button onClick={() => dispatch({ type: "REMOVE_TOAST", id: t.id })}><X size={14} color={C.mutedDim} /></button>
          </div>
        );
      })}
      <style>{`@keyframes wathaq-toast-in { from { opacity:0; transform:translateY(8px);} to {opacity:1; transform:translateY(0);} }`}</style>
    </div>
  );
}

function EmptyState({ Icon = Circle, title, body, actionLabel, onAction }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      <div className="rounded-full p-4 mb-4" style={{ background: C.surface2 }}><Icon size={26} color={C.mutedDim} /></div>
      <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 15, marginBottom: 6 }}>{title}</div>
      <p style={{ fontSize: 13, color: C.muted, maxWidth: 320, lineHeight: 1.55 }}>{body}</p>
      {actionLabel && <PrimaryButton onClick={onAction} style={{ marginTop: 18, padding: "9px 16px", fontSize: 13 }}>{actionLabel}</PrimaryButton>}
    </div>
  );
}

function Skeleton({ h = 14, w = "100%", r = 6, style = {} }) {
  return <div className="animate-pulse" style={{ height: h, width: w, borderRadius: r, background: C.surface2, ...style }} />;
}
function PageSkeleton({ variant = "cards" }) {
  if (variant === "table") {
    return (
      <div className="p-8">
        <Skeleton h={38} w={280} style={{ marginBottom: 20 }} />
        <Card className="p-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex gap-4 py-3" style={{ borderBottom: i < 5 ? `1px solid ${C.borderSoft}` : "none" }}>
              <Skeleton w={70} /><Skeleton w="35%" /><Skeleton w={90} /><Skeleton w={70} />
            </div>
          ))}
        </Card>
      </div>
    );
  }
  return (
    <div className="p-8">
      <div className="grid md:grid-cols-3 gap-6 mb-6">
        {[0, 1, 2].map((i) => <Card key={i} className="p-6"><Skeleton h={12} w={120} style={{ marginBottom: 14 }} /><Skeleton h={40} w={90} /></Card>)}
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        {[0, 1].map((i) => (
          <Card key={i} className="p-6">
            <Skeleton h={14} w={160} style={{ marginBottom: 18 }} />
            {[0, 1, 2].map((j) => <Skeleton key={j} h={10} style={{ marginBottom: 14 }} />)}
          </Card>
        ))}
      </div>
    </div>
  );
}
function usePageLoading(key, ms = 480) {
  const [loading, setLoading] = useState(true);
  useEffect(() => { setLoading(true); const t = setTimeout(() => setLoading(false), ms); return () => clearTimeout(t); }, [key]);
  return loading;
}

/* ============================================================
   LANDING PAGE
   ============================================================ */
function NavLink({ children, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ background: "transparent", border: "none", padding: 0, cursor: "pointer", fontFamily: F.body, fontSize: 14, color: hovered ? C.text : C.textDim, transition: "color .15s ease" }}
    >
      {children}
    </button>
  );
}

const LANDING_I18N = {
  en: {
    nav: { platform: "Platform", frameworks: "Frameworks", howItWorks: "How it works", security: "Security" },
    demo: "View live demo", gapAnalysis: "Gap Analysis",
    heroBadge: "AI-assisted multi-framework compliance",
    heroH1a: "One control.", heroH1b: "Every framework", heroH1c: "you're on the hook for.",
    heroBody: "WATHAQ maps ISO/IEC 27001, SAMA CSF, and NCA ECC-1:2024 into a single control graph, scores your real risk, and tells you exactly what to fix first -- with the math shown.",
    noCard: "No credit card required", setup15: "Setup in under 15 minutes",
    criticalRisks: "5 critical risks", rankedByImpact: "ranked by business impact",
    dashboardEyebrow: "THE DASHBOARD", dashboardH2: "Everything a board needs, on one screen.",
    dashboardBody: "Your unified compliance score, risk index, framework breakdown, and AI-ranked action plan -- live, from the moment you finish your first Gap Analysis.",
    execDashboard: "Executive Dashboard", live: "live",
    unifiedScore: "UNIFIED COMPLIANCE SCORE", riskScore: "RISK SCORE", connectorHealth: "CONNECTOR HEALTH",
    frameworkComparison: "Framework Comparison", topMissingControls: "Top Missing Controls",
    missingControls: [
      { title: "Endpoint / malware protection", meta: "NCAECC · 2-3-3", score: 20 },
      { title: "Incident response plan", meta: "NCAECC · 2-13-2", score: 15 },
      { title: "Use of cryptography", meta: "ISO27001 · 8.24", score: 14 },
    ],
    mappedTo: "NATIVELY MAPPED TO",
    whyEyebrow: "WHY WATHAQ", whyH2: "Built for teams accountable to more than one auditor.",
    features: [
      { Icon: GitMerge, title: "One control, mapped everywhere", body: "Implement a control once. WATHAQ propagates it across ISO 27001, SAMA CSF, and NCA ECC automatically." },
      { Icon: Target, title: "Risk-ranked, not alphabetical", body: "Every gap is scored by likelihood x business impact, so your team always works the highest-leverage item first." },
      { Icon: TrendingUp, title: "AI that shows its work", body: "Recommendations cite the exact compliance and risk delta they produce -- never a vague 'improve your posture.'" },
      { Icon: Zap, title: "Evidence that collects itself", body: "Connect Entra ID, M365, AWS, or your vulnerability scanner once -- WATHAQ pulls fresh evidence on a schedule." },
      { Icon: RadarIcon, title: "Incident-to-control tracing", body: "When something goes wrong, see exactly which missing control let it happen -- across all your frameworks at once." },
      { Icon: Lock, title: "Built for NCA-regulated entities", body: "Native NCA ECC-1:2024 support with correct large-entity / SME applicability, not a generic global template." },
    ],
    howEyebrow: "HOW IT WORKS", howH2: "From zero to a ranked action plan, same day.",
    steps: [
      { n: "01", title: "Connect your workspace", body: "Create your organization, tell us your size, and pick the frameworks you need." },
      { n: "02", title: "Feed it what you have", body: "Connect your identity provider and cloud, or upload existing policies -- AI pre-fills control status." },
      { n: "03", title: "Get a ranked action plan", body: "Land on a dashboard that already knows your score, your risk, and what to fix first." },
    ],
    securityEyebrow: "SECURITY", securityH2: "Your evidence deserves the same rigor you're auditing for.",
    securityItems: [
      { Icon: Lock, title: "Encrypted everywhere", body: "AES-256 at rest and TLS 1.2+ in transit for every piece of evidence and control data you store." },
      { Icon: ShieldCheck, title: "Role-based access control", body: "Every workspace member gets exactly the access their role needs -- nothing more." },
      { Icon: ClipboardList, title: "Full audit trail", body: "Every control change, upload, and connector sync is logged and attributable to a person." },
      { Icon: Database, title: "Isolated infrastructure", body: "Customer data is logically isolated per workspace on access-controlled infrastructure." },
    ],
    ctaH2a: "Stop maintaining three spreadsheets", ctaH2b: "for the same set of controls.",
    footerCopyright: "© 2026 WATHAQ · Cyber Compliance Intelligence",
    footerTagline: "One control. Multiple frameworks. Intelligent decisions.",
  },
  ar: {
    nav: { platform: "المنصة", frameworks: "الأطر", howItWorks: "كيف تعمل", security: "الأمان" },
    demo: "شاهد العرض المباشر", gapAnalysis: "تحليل الفجوات",
    heroBadge: "امتثال متعدد الأطر بمساعدة الذكاء الاصطناعي",
    heroH1a: "بسّط إدارة الأمن السيبراني", heroH1b: "والامتثال", heroH1c: "في مكان واحد.",
    heroBody: "اربط المخاطر بالضوابط والمتطلبات والأدلة، واحصل على رؤية واضحة لمستوى التزامك.",
    noCard: "لا حاجة لبطاقة ائتمان", setup15: "الإعداد في أقل من 15 دقيقة",
    criticalRisks: "5 مخاطر حرجة", rankedByImpact: "مرتبة حسب تأثيرها على الأعمال",
    dashboardEyebrow: "لوحة التحكم", dashboardH2: "كل ما يحتاجه مجلس الإدارة، في شاشة واحدة.",
    dashboardBody: "درجة الامتثال الموحدة، مؤشر المخاطر، تفصيل الأطر، وخطة عمل مرتبة بالذكاء الاصطناعي -- مباشرة، من لحظة إنهاء أول تحليل فجوات.",
    execDashboard: "اللوحة التنفيذية", live: "مباشر",
    unifiedScore: "درجة الامتثال الموحدة", riskScore: "درجة المخاطر", connectorHealth: "حالة الموصلات",
    frameworkComparison: "مقارنة الأطر", topMissingControls: "أبرز الضوابط الناقصة",
    missingControls: [
      { title: "الحماية من البرمجيات الخبيثة للأطراف", meta: "NCAECC · 2-3-3", score: 20 },
      { title: "خطة الاستجابة للحوادث", meta: "NCAECC · 2-13-2", score: 15 },
      { title: "استخدام التشفير", meta: "ISO27001 · 8.24", score: 14 },
    ],
    mappedTo: "مرتبطة أصليًا بـ",
    whyEyebrow: "لماذا وثاق", whyH2: "منصة واحدة للفرق المسؤولة أمام متطلبات متعددة.",
    features: [
      { Icon: GitMerge, title: "ضابط واحد، مرتبط بكل مكان", body: "نفّذ الضابط مرة واحدة. وثاق تنشره تلقائيًا عبر ISO 27001 وSAMA CSF وNCA ECC." },
      { Icon: Target, title: "مرتب حسب المخاطر، لا أبجديًا", body: "كل فجوة تُقيَّم حسب احتمالية الحدوث × تأثيرها على الأعمال، حتى يعمل فريقك دائمًا على الأهم أولًا." },
      { Icon: TrendingUp, title: "ذكاء اصطناعي يوضح عمله", body: "التوصيات تستشهد بالتغير الدقيق في الامتثال والمخاطر الذي تنتجه -- لا عبارات غامضة مثل 'حسّن وضعك الأمني'." },
      { Icon: Zap, title: "أدلة تجمع نفسها", body: "اربط Entra ID أو M365 أو AWS أو أداة فحص الثغرات مرة واحدة -- وثاق تسحب أدلة محدّثة بجدول زمني." },
      { Icon: RadarIcon, title: "تتبع الحادث إلى الضابط", body: "عندما يحدث خطأ، اعرف بالضبط أي ضابط ناقص سمح بحدوثه -- عبر كل أطرك في آن واحد." },
      { Icon: Lock, title: "مبنية للجهات الخاضعة لهيئة الأمن السيبراني", body: "دعم أصلي لـ NCA ECC-1:2024 مع التصنيف الصحيح للمنشآت الكبيرة والمتوسطة والصغيرة، وليس نموذجًا عامًا." },
    ],
    howEyebrow: "كيف تعمل", howH2: "من الصفر إلى خطة عمل مرتبة، في نفس اليوم.",
    steps: [
      { n: "01", title: "أنشئ مساحة عملك", body: "أنشئ مؤسستك، أخبرنا بحجمها، واختر الأطر التي تحتاجها." },
      { n: "02", title: "أطعمها بما لديك", body: "اربط مزوّد الهوية والسحابة، أو ارفع سياساتك الحالية -- الذكاء الاصطناعي يعبّئ حالة الضوابط مسبقًا." },
      { n: "03", title: "احصل على خطة عمل مرتبة", body: "تصل إلى لوحة تحكم تعرف مسبقًا درجتك ومخاطرك وما يجب إصلاحه أولًا." },
    ],
    securityEyebrow: "الأمان", securityH2: "حماية أدلتك وموثوقيتها في كل مرحلة.",
    securityItems: [
      { Icon: Lock, title: "مشفّرة في كل مكان", body: "تشفير AES-256 أثناء التخزين وTLS 1.2+ أثناء النقل لكل قطعة دليل وبيانات ضوابط تخزّنها." },
      { Icon: ShieldCheck, title: "تحكم بالوصول حسب الدور", body: "كل عضو في مساحة العمل يحصل بالضبط على الصلاحية التي يحتاجها دوره -- لا أكثر." },
      { Icon: ClipboardList, title: "سجل تدقيق كامل", body: "كل تغيير في ضابط، أو رفع ملف، أو مزامنة موصل يُسجَّل ويُنسب إلى شخص محدد." },
      { Icon: Database, title: "بنية تحتية معزولة", body: "بيانات العملاء معزولة منطقيًا لكل مساحة عمل على بنية تحتية محكومة الوصول." },
    ],
    ctaH2a: "توقف عن إدارة ثلاثة جداول بيانات", ctaH2b: "لنفس مجموعة الضوابط.",
    footerCopyright: "© 2026 وثاق · Cyber Compliance Intelligence",
    footerTagline: "ضابط واحد. أطر متعددة. قرارات ذكية.",
  },
};

function Landing({ onStart, onDemo }) {
  const [scrolled, setScrolled] = useState(false);
  const [lang, setLang] = useState("en");
  const t = LANDING_I18N[lang];
  const dir = lang === "ar" ? "rtl" : "ltr";
  useEffect(() => { const h = () => setScrolled(window.scrollY > 8); window.addEventListener("scroll", h); return () => window.removeEventListener("scroll", h); }, []);

  const scrollToSection = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div dir={dir} className={lang === "ar" ? "wathaq-ar-font" : ""} style={{ background: C.bg, color: C.text, fontFamily: F.body, minHeight: "100vh" }}>
      {lang === "ar" && (
        <style>{`.wathaq-ar-font, .wathaq-ar-font * { font-family: 'IBM Plex Sans Arabic', 'Inter', sans-serif !important; }`}</style>
      )}
      <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-12 py-4"
        style={{ background: scrolled ? "rgba(11,10,16,0.85)" : "transparent", backdropFilter: scrolled ? "blur(12px)" : "none", borderBottom: scrolled ? `1px solid ${C.border}` : "1px solid transparent", transition: "all .25s ease" }}>
        <div className="flex items-center gap-2.5">
          <Logo height={26} />
        </div>
        <div className="hidden md:flex items-center gap-8">
          <NavLink onClick={() => scrollToSection("platform")}>{t.nav.platform}</NavLink>
          <NavLink onClick={() => scrollToSection("frameworks")}>{t.nav.frameworks}</NavLink>
          <NavLink onClick={() => scrollToSection("how-it-works")}>{t.nav.howItWorks}</NavLink>
          <NavLink onClick={() => scrollToSection("security")}>{t.nav.security}</NavLink>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setLang((l) => (l === "en" ? "ar" : "en"))}
            className="px-2.5 py-1.5 rounded-lg"
            style={{ fontFamily: F.mono, fontSize: 12, fontWeight: 600, color: C.textDim, border: `1px solid ${C.border}` }}
          >
            {lang === "en" ? "AR" : "EN"}
          </button>
          <button onClick={onDemo} style={{ fontFamily: F.display, fontSize: 14, fontWeight: 600, color: C.textDim }}>{t.demo}</button>
          <PrimaryButton onClick={onStart} style={{ padding: "10px 18px", fontSize: 13.5 }}>{t.gapAnalysis}</PrimaryButton>
        </div>
      </div>

      <div className="relative overflow-hidden px-6 md:px-12 pt-40 pb-28" style={{ background: `radial-gradient(900px 500px at 20% -10%, ${C.accentSoft}, transparent 60%), radial-gradient(700px 400px at 90% 10%, ${C.accent2Soft}, transparent 55%)` }}>
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 mb-6 px-3 py-1.5 rounded-full" style={{ background: C.accentSoft, border: `1px solid rgba(140,124,250,.3)` }}>
              <span style={{ fontFamily: F.mono, fontSize: 12, color: C.accent }}>{t.heroBadge}</span>
            </div>
            <h1 style={{ fontFamily: F.display, fontWeight: 800, fontSize: "clamp(34px,4.6vw,58px)", lineHeight: lang === "ar" ? 1.5 : 1.06, letterSpacing: lang === "ar" ? "normal" : "-0.02em" }}>
              {t.heroH1a}<br /><span style={{ color: C.accent }}>{t.heroH1b}</span> <br />{t.heroH1c}
            </h1>
            <p style={{ fontSize: 17, color: C.muted, marginTop: 22, maxWidth: 460, lineHeight: 1.65 }}>
              {t.heroBody}
            </p>
            <div className="flex items-center gap-4 mt-9">
              <PrimaryButton onClick={onStart} icon={ArrowRight}>{t.gapAnalysis}</PrimaryButton>
              <GhostButton onClick={onDemo}>{t.demo}</GhostButton>
            </div>
            <div className="flex items-center gap-6 mt-10" style={{ color: C.mutedDim, fontSize: 12.5 }}>
              <span>{t.noCard}</span><span>·</span><span>{t.setup15}</span>
            </div>
          </div>

          <div className="relative">
            <div className="rounded-2xl overflow-hidden" style={{ boxShadow: "0 30px 80px -20px rgba(0,0,0,.6)", border: `1px solid ${C.border}` }}>
              <img src={interfaceHero} alt="WATHAQ platform" className="w-full h-auto block" />
            </div>
            <div className="absolute -bottom-6 -left-6 hidden md:block">
              <Card className="p-4 flex items-center gap-3" style={{ boxShadow: "0 20px 50px -15px rgba(0,0,0,.6)" }}>
                <div className="rounded-full p-2" style={{ background: C.criticalSoft }}><AlertTriangle size={16} color={C.critical} /></div>
                <div><div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 13 }}>{t.criticalRisks}</div><div style={{ fontSize: 11.5, color: C.muted }}>{t.rankedByImpact}</div></div>
              </Card>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 md:px-12 py-24 max-w-6xl mx-auto">
        <div className="max-w-xl mb-12">
          <span style={{ fontFamily: F.mono, fontSize: 12, color: C.accent2 }}>{t.dashboardEyebrow}</span>
          <h2 style={{ fontFamily: F.display, fontWeight: 800, fontSize: "clamp(26px,3vw,36px)", marginTop: 10, letterSpacing: "-0.01em" }}>{t.dashboardH2}</h2>
          <p style={{ fontSize: 15, color: C.muted, marginTop: 14, lineHeight: 1.65 }}>{t.dashboardBody}</p>
        </div>
        <Card className="p-5 md:p-7" style={{ boxShadow: "0 40px 100px -30px rgba(0,0,0,.7)" }}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2"><LayoutDashboard size={16} color={C.accent} /><span style={{ fontFamily: F.display, fontWeight: 700, fontSize: 15 }}>{t.execDashboard}</span></div>
            <Badge color={C.success} bg={C.successSoft}><TrendingUp size={11} />{t.live}</Badge>
          </div>
          <div className="grid md:grid-cols-3 gap-4 mb-4">
            <Card className="p-5" style={{ background: C.surface2 }}>
              <span style={{ fontFamily: F.mono, fontSize: 11, color: C.muted }}>{t.unifiedScore}</span>
              <div className="flex justify-center pt-2"><ScoreRing value={72} size={100} stroke={9} color={C.accent} /></div>
            </Card>
            <Card className="p-5" style={{ background: C.surface2 }}>
              <span style={{ fontFamily: F.mono, fontSize: 11, color: C.muted }}>{t.riskScore}</span>
              <div className="flex justify-center pt-2"><ScoreRing value={38} size={100} stroke={9} color={C.accent2} /></div>
            </Card>
            <Card className="p-5" style={{ background: C.surface2 }}>
              <span style={{ fontFamily: F.mono, fontSize: 11, color: C.muted }}>{t.connectorHealth}</span>
              <div className="flex items-center gap-3 mt-4">
                <div className="rounded-full p-3" style={{ background: C.successSoft }}><Cpu size={20} color={C.success} /></div>
                <div style={{ fontFamily: F.display, fontWeight: 800, fontSize: 24 }}>9<span style={{ fontSize: 14, color: C.mutedDim, fontWeight: 600 }}> / 13</span></div>
              </div>
            </Card>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="p-5" style={{ background: C.surface2 }}>
              <h3 style={{ fontFamily: F.display, fontWeight: 700, fontSize: 14, marginBottom: 14 }}>{t.frameworkComparison}</h3>
              {FRAMEWORKS.map((f, i) => (
                <div key={f.code} className="mb-3">
                  <div className="flex items-center justify-between mb-1.5"><span style={{ fontSize: 12.5, fontWeight: 600 }}>{f.name}</span><span style={{ fontFamily: F.mono, fontSize: 11.5, color: C.textDim }}>{[78, 61, 34, 52][i]}%</span></div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: C.border }}><div className="h-full rounded-full" style={{ width: `${[78, 61, 34, 52][i]}%`, background: `linear-gradient(90deg, ${C.accent2}, ${C.accent})` }} /></div>
                </div>
              ))}
            </Card>
            <Card className="p-5" style={{ background: C.surface2 }}>
              <h3 style={{ fontFamily: F.display, fontWeight: 700, fontSize: 14, marginBottom: 14 }}>{t.topMissingControls}</h3>
              {t.missingControls.map(({ title, meta, score }) => (
                <div key={title} className="flex items-center justify-between py-2 border-b" style={{ borderColor: C.borderSoft }}>
                  <div><div style={{ fontSize: 12.5, fontWeight: 500 }}>{title}</div><div style={{ fontSize: 10.5, color: C.mutedDim, fontFamily: F.mono }}>{meta}</div></div>
                  <span style={{ fontFamily: F.mono, fontSize: 12, color: C.critical, fontWeight: 600 }}>{score}</span>
                </div>
              ))}
            </Card>
          </div>
        </Card>
      </div>

      <div id="frameworks" className="px-6 md:px-12 py-10 border-y" style={{ borderColor: C.borderSoft, scrollMarginTop: 90 }}>
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-center gap-x-14 gap-y-4" style={{ color: C.mutedDim }}>
          <span style={{ fontFamily: F.mono, fontSize: 12 }}>{t.mappedTo}</span>
          {["ISO/IEC 27001:2022", "SAMA CSF", "NCA ECC-1:2024"].map((n) => <span key={n} style={{ fontFamily: F.display, fontWeight: 700, fontSize: 15, color: C.textDim }}>{n}</span>)}
        </div>
      </div>

      <div id="platform" className="px-6 md:px-12 py-28 max-w-6xl mx-auto" style={{ scrollMarginTop: 90 }}>
        <div className="max-w-xl mb-16">
          <span style={{ fontFamily: F.mono, fontSize: 12, color: C.accent }}>{t.whyEyebrow}</span>
          <h2 style={{ fontFamily: F.display, fontWeight: 800, fontSize: "clamp(26px,3vw,36px)", marginTop: 10, letterSpacing: "-0.01em" }}>{t.whyH2}</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {t.features.map(({ Icon, title, body }) => (
            <Card key={title} hover className="p-6">
              <div className="rounded-xl w-11 h-11 flex items-center justify-center mb-5" style={{ background: C.accentSoft }}><Icon size={20} color={C.accent} /></div>
              <h3 style={{ fontFamily: F.display, fontWeight: 700, fontSize: 16.5, marginBottom: 8 }}>{title}</h3>
              <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.6 }}>{body}</p>
            </Card>
          ))}
        </div>
      </div>

      <div id="how-it-works" className="px-6 md:px-12 py-28" style={{ background: C.bgSoft, borderTop: `1px solid ${C.borderSoft}`, borderBottom: `1px solid ${C.borderSoft}`, scrollMarginTop: 90 }}>
        <div className="max-w-5xl mx-auto">
          <img src={founderCard} alt="Mohammed Ali Al-Saqoor" className="w-full h-auto rounded-2xl" />
        </div>
      </div>

      <div id="security" className="px-6 md:px-12 py-28 max-w-6xl mx-auto" style={{ scrollMarginTop: 90 }}>
        <div className="max-w-xl mb-16">
          <span style={{ fontFamily: F.mono, fontSize: 12, color: C.accent }}>{t.securityEyebrow}</span>
          <h2 style={{ fontFamily: F.display, fontWeight: 800, fontSize: "clamp(26px,3vw,36px)", marginTop: 10, letterSpacing: "-0.01em" }}>{t.securityH2}</h2>
        </div>
        <div className="grid md:grid-cols-4 gap-6">
          {t.securityItems.map(({ Icon, title, body }) => (
            <Card key={title} hover className="p-6">
              <div className="rounded-xl w-11 h-11 flex items-center justify-center mb-5" style={{ background: C.accent2Soft }}><Icon size={20} color={C.accent2} /></div>
              <h3 style={{ fontFamily: F.display, fontWeight: 700, fontSize: 15.5, marginBottom: 8 }}>{title}</h3>
              <p style={{ fontSize: 13.5, color: C.muted, lineHeight: 1.6 }}>{body}</p>
            </Card>
          ))}
        </div>
      </div>

      <div className="px-6 md:px-12 py-28 text-center max-w-3xl mx-auto">
        <h2 style={{ fontFamily: F.display, fontWeight: 800, fontSize: "clamp(28px,4vw,42px)", letterSpacing: "-0.01em" }}>{t.ctaH2a}<br />{t.ctaH2b}</h2>
        <div className="flex items-center justify-center gap-4 mt-10">
          <PrimaryButton onClick={onStart} icon={ArrowRight}>{t.gapAnalysis}</PrimaryButton>
          <GhostButton onClick={onDemo}>{t.demo}</GhostButton>
        </div>
      </div>

      <div className="px-6 md:px-12 py-8 border-t flex items-center justify-between" style={{ borderColor: C.borderSoft, color: C.mutedDim, fontSize: 12.5 }}>
        <span>{t.footerCopyright}</span>
        <span style={{ fontFamily: F.mono }}>{t.footerTagline}</span>
      </div>
    </div>
  );
}

/* ============================================================
   ONBOARDING WIZARD — Gap Analysis
   ============================================================ */
const SCOPE_PART_OPTIONS = ["Entire Organization", "IT", "Cybersecurity", "Business Unit", "Specific System", "Other"];
const SCOPE_SYSTEM_OPTIONS = ["Cloud", "On-Premise", "Web Applications", "Databases", "Endpoints", "Network", "SaaS", "Other"];
const SCOPE_DATA_OPTIONS = ["Personal Data", "Customer Data", "Financial Data", "Confidential Data", "Sensitive Data", "Other"];

const SECURITY_QUESTIONS = [
  { id: "policies", text: "Does the organization have documented security policies?", options: ["Yes", "Partially", "No", "Unknown"] },
  { id: "riskMgmt", text: "Does the organization have a formal risk management process?", options: ["Yes", "Partially", "No", "Unknown"] },
  { id: "incidentProcess", text: "Does the organization have a formal incident response process?", options: ["Yes", "Partially", "No", "Unknown"] },
  { id: "audits", text: "Does the organization perform security audits or assessments?", options: ["Yes", "No", "Unknown"] },
  { id: "cloud", text: "Does the organization use cloud services?", options: ["Yes", "No"] },
  { id: "thirdParty", text: "Does the organization have third-party or supplier security requirements?", options: ["Yes", "Partially", "No", "Unknown"] },
  { id: "priorAssessment", text: "Has the organization previously been assessed against a security framework?", options: ["Yes", "No", "Unknown"] },
];

const DOCUMENT_TYPES = [
  "Information Security Policy",
  "Cybersecurity Policy",
  "Organization Chart & Security Roles",
  "Asset Inventory",
  "Risk Assessment",
  "Risk Register",
  "Access Control Policy",
  "User Access Review Report",
  "Vulnerability Assessment Report",
  "Incident Response Plan & Incident Reports",
  "Business Continuity Plan (BCP)",
  "Disaster Recovery Plan (DRP)",
  "Data Classification & Protection Policy",
  "Third-Party / Vendor Security Assessment",
  "Internal Audit / Previous Compliance Assessment Report",
];

const ANALYSIS_STEPS = ["Reading your uploaded documents", "Cross-referencing your questionnaire answers", "Mapping risks to controls", "Checking control status across ISO27001, SAMA & NCAECC", "Verifying evidence and scoring gaps"];

function FrameworkComplianceGrid({ frameworkCompliance }) {
  return (
    <div className="grid sm:grid-cols-3 gap-3">
      {frameworkCompliance.map((f) => (
        <Card key={f.code} className="p-4">
          <div style={{ fontFamily: F.mono, fontSize: 11.5, color: C.muted }}>{f.code}</div>
          <div style={{ fontFamily: F.display, fontWeight: 800, fontSize: 26, marginTop: 4 }}>{f.percentage}%</div>
          <div className="h-1.5 rounded-full mt-2 mb-3" style={{ background: C.border }}>
            <div className="h-full rounded-full" style={{ width: `${f.percentage}%`, background: `linear-gradient(90deg, ${C.accent2}, ${C.accent})` }} />
          </div>
          <p style={{ fontSize: 12, color: C.muted, lineHeight: 1.5 }}>{f.summary}</p>
        </Card>
      ))}
    </div>
  );
}

const FRAMEWORK_STATUS_KEY = { Implemented: "implemented", Partial: "partial", "Not Implemented": "not_implemented", "Not Applicable": "na" };
const EVIDENCE_COLOR = { Valid: "success", Partial: "warning", Missing: "critical" };

function RiskControlGapList({ items }) {
  return (
    <div className="space-y-3">
      {items.map((item, i) => {
        const levelColor = LEVEL_META[item.riskLevel?.toLowerCase()] || C.muted;
        const evColor = C[EVIDENCE_COLOR[item.evidenceStatus]] || C.muted;
        return (
          <Card key={i} className="p-4">
            <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <AlertTriangle size={14} color={levelColor} />
                <span style={{ fontFamily: F.display, fontWeight: 700, fontSize: 14.5 }}>{item.risk}</span>
              </div>
              <Badge color={levelColor} bg={`${levelColor}1E`}>{item.riskLevel} · {item.riskScore}</Badge>
            </div>

            <div className="flex items-start gap-2 mb-3">
              <GitMerge size={14} color={C.accent} style={{ marginTop: 2, flexShrink: 0 }} />
              <div>
                <span style={{ fontFamily: F.display, fontWeight: 600, fontSize: 13, color: C.textDim }}>{item.control}</span>
                <span style={{ fontSize: 12.5, color: C.muted }}> — {item.controlDescription}</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-3">
              {item.frameworkMapping.map((f) => {
                const meta = STATUS_META[FRAMEWORK_STATUS_KEY[f.status] || "na"];
                return (
                  <span key={f.code} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background: meta.bg, color: meta.color, fontFamily: F.mono, fontSize: 11 }}>
                    {f.code} {f.controlRef} · {f.status}
                  </span>
                );
              })}
            </div>

            <div className="flex items-start gap-1.5 mb-3">
              <FileCheck2 size={12} color={evColor} style={{ marginTop: 2, flexShrink: 0 }} />
              <div style={{ fontSize: 11.5, lineHeight: 1.5 }}>
                <span style={{ fontFamily: F.mono, color: evColor, fontWeight: 600 }}>EVIDENCE — {item.evidenceStatus}</span>
                <span style={{ color: C.mutedDim }}> · {item.evidenceNote}</span>
              </div>
            </div>

            <div className="p-3 rounded-lg mb-2" style={{ background: C.criticalSoft }}>
              <div style={{ fontSize: 10.5, color: C.critical, fontFamily: F.mono, marginBottom: 3, fontWeight: 600 }}>GAP</div>
              <p style={{ fontSize: 12.5, color: C.textDim, lineHeight: 1.5 }}>{item.gap}</p>
            </div>

            <div className="p-3 rounded-lg" style={{ background: C.successSoft }}>
              <div style={{ fontSize: 10.5, color: C.success, fontFamily: F.mono, marginBottom: 3, fontWeight: 600 }}>REMEDIATION</div>
              <p style={{ fontSize: 12.5, color: C.textDim, lineHeight: 1.5 }}>{item.remediation}</p>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function Onboarding({ onComplete, onExit }) {
  const { toast } = useStore();
  const [step, setStep] = useState(0);
  const [company, setCompany] = useState({ name: "", industry: "", employees: "", services: "" });
  const [frameworks, setFrameworks] = useState(["ISO27001", "NCAECC"]);
  const [scope, setScope] = useState({ part: "", partOther: "", systems: [], systemsOther: "", dataTypes: [], dataTypesOther: "" });
  const [security, setSecurity] = useState({});
  const [documents, setDocuments] = useState({});
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeStep, setAnalyzeStep] = useState(0);
  const [analysisError, setAnalysisError] = useState(null);
  const [result, setResult] = useState(null);
  const docInputRef = useRef(null);
  const pendingDocTypeRef = useRef(null);
  const STEP_NAMES = ["Company", "Scope", "Frameworks", "Security", "Documents", "AI Analysis"];

  const toggleFramework = (code) => setFrameworks((f) => (f.includes(code) ? f.filter((c) => c !== code) : [...f, code]));
  const toggleScopeValue = (key, opt) => setScope((s) => ({ ...s, [key]: s[key].includes(opt) ? s[key].filter((x) => x !== opt) : [...s[key], opt] }));

  const triggerDocUpload = (docType) => { pendingDocTypeRef.current = docType; docInputRef.current?.click(); };
  const removeDocument = (docType) => setDocuments((d) => { const next = { ...d }; delete next[docType]; return next; });
  const handleDocFileChange = (e) => {
    const file = e.target.files?.[0];
    const docType = pendingDocTypeRef.current;
    e.target.value = "";
    if (!file || !docType) return;
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) { toast.error("Please upload PDF files only."); return; }
    if (file.size > 15 * 1024 * 1024) { toast.error("File is larger than 15MB."); return; }
    const totalBytes = Object.values(documents).reduce((a, f) => a + f.size, 0) + file.size;
    if (totalBytes > 20 * 1024 * 1024) { toast.error("Combined document size exceeds 20MB — remove a file first."); return; }
    setDocuments((d) => ({ ...d, [docType]: file }));
  };

  const companyValid = company.name.trim() && company.industry.trim() && String(company.employees).trim() && company.services.trim();
  const scopeValid =
    scope.part && (scope.part !== "Other" || scope.partOther.trim()) &&
    scope.systems.length > 0 && (!scope.systems.includes("Other") || scope.systemsOther.trim()) &&
    scope.dataTypes.length > 0 && (!scope.dataTypes.includes("Other") || scope.dataTypesOther.trim());
  const securityValid = SECURITY_QUESTIONS.every((q) => security[q.id]);
  const documentsValid = Object.keys(documents).length > 0;
  const continueDisabled = (step === 0 && !companyValid) || (step === 1 && !scopeValid) || (step === 3 && !securityValid);

  const runAnalysis = async () => {
    setStep(5); setAnalyzing(true); setAnalyzeStep(0); setAnalysisError(null); setResult(null);
    const tick = setInterval(() => {
      setAnalyzeStep((i) => (i < ANALYSIS_STEPS.length - 2 ? i + 1 : i));
    }, 700);
    try {
      const documentsPayload = await Promise.all(
        Object.entries(documents).map(async ([type, file]) => ({
          type,
          fileName: file.name,
          fileMimeType: file.type || "application/pdf",
          fileBase64: await fileToBase64(file),
        }))
      );
      const res = await fetch("/api/gap-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company,
          scope: {
            part: scope.part === "Other" ? scope.partOther : scope.part,
            systems: scope.systems.map((s) => (s === "Other" ? scope.systemsOther : s)),
            dataTypes: scope.dataTypes.map((d) => (d === "Other" ? scope.dataTypesOther : d)),
          },
          frameworks: FRAMEWORKS.filter((f) => frameworks.includes(f.code)),
          security: SECURITY_QUESTIONS.map((q) => ({ question: q.text, answer: security[q.id] || "Unknown" })),
          documents: documentsPayload,
          documentTypesNotProvided: DOCUMENT_TYPES.filter((t) => !documents[t]),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed");
      clearInterval(tick);
      setAnalyzeStep(ANALYSIS_STEPS.length - 1);
      setResult(data);
    } catch (err) {
      clearInterval(tick);
      setAnalysisError(err.message || String(err));
      toast.error(`Gap analysis failed: ${err.message || err}`);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div style={{ background: C.bg, color: C.text, fontFamily: F.body, minHeight: "100vh" }} className="flex flex-col">
      <div className="flex items-center justify-between px-8 py-5 border-b" style={{ borderColor: C.borderSoft }}>
        <div className="flex items-center gap-2.5">
          <Logo height={22} />
        </div>
        <button onClick={onExit} style={{ color: C.muted, fontSize: 13.5 }}>Exit setup</button>
      </div>

      <div className="px-8 pt-8 max-w-2xl mx-auto w-full">
        <div className="flex items-center gap-2">
          {STEP_NAMES.map((name, i) => (
            <React.Fragment key={name}>
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center rounded-full" style={{ width: 26, height: 26, fontSize: 12, fontFamily: F.mono, fontWeight: 600, background: i <= step ? C.accent : C.surface2, color: i <= step ? "#0B0A10" : C.muted, border: i <= step ? "none" : `1px solid ${C.border}` }}>
                  {i < step ? <Check size={13} /> : i + 1}
                </div>
                <span style={{ fontSize: 13, color: i <= step ? C.text : C.muted }} className="hidden sm:inline">{name}</span>
              </div>
              {i < STEP_NAMES.length - 1 && <div className="flex-1 h-px" style={{ background: i < step ? C.accent : C.border }} />}
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="flex-1 flex items-start justify-center px-8 py-14">
        <div className="w-full max-w-2xl">
          {step === 0 && (
            <div>
              <h2 style={{ fontFamily: F.display, fontWeight: 800, fontSize: 28 }}>Company</h2>
              <p style={{ color: C.muted, marginTop: 8, marginBottom: 32 }}>Tell us about the company so the AI can ground its analysis in the right context.</p>
              <label style={{ fontSize: 13, color: C.textDim, fontFamily: F.display, fontWeight: 600 }}>What is the company name?</label>
              <input value={company.name} onChange={(e) => setCompany({ ...company, name: e.target.value })} placeholder="Meridian Financial Group" className="w-full mt-2 mb-6 px-4 py-3 rounded-xl outline-none" style={{ background: C.surface2, border: `1px solid ${C.border}`, color: C.text, fontSize: 14.5 }} />
              <label style={{ fontSize: 13, color: C.textDim, fontFamily: F.display, fontWeight: 600 }}>What industry does the company operate in?</label>
              <input value={company.industry} onChange={(e) => setCompany({ ...company, industry: e.target.value })} placeholder="e.g. Financial Services" className="w-full mt-2 mb-6 px-4 py-3 rounded-xl outline-none" style={{ background: C.surface2, border: `1px solid ${C.border}`, color: C.text, fontSize: 14.5 }} />
              <label style={{ fontSize: 13, color: C.textDim, fontFamily: F.display, fontWeight: 600 }}>How many employees does the company have?</label>
              <input type="number" min="1" value={company.employees} onChange={(e) => setCompany({ ...company, employees: e.target.value })} placeholder="e.g. 250" className="w-full mt-2 mb-6 px-4 py-3 rounded-xl outline-none" style={{ background: C.surface2, border: `1px solid ${C.border}`, color: C.text, fontSize: 14.5 }} />
              <label style={{ fontSize: 13, color: C.textDim, fontFamily: F.display, fontWeight: 600 }}>What are the company's main services?</label>
              <textarea value={company.services} onChange={(e) => setCompany({ ...company, services: e.target.value })} placeholder="Briefly describe what the company does" rows={3} className="w-full mt-2 px-4 py-3 rounded-xl outline-none resize-none" style={{ background: C.surface2, border: `1px solid ${C.border}`, color: C.text, fontSize: 14.5, fontFamily: F.body }} />
            </div>
          )}

          {step === 1 && (
            <div>
              <h2 style={{ fontFamily: F.display, fontWeight: 800, fontSize: 28 }}>Scope</h2>
              <p style={{ color: C.muted, marginTop: 8, marginBottom: 28 }}>Define what's actually being assessed — this keeps the analysis focused and accurate.</p>

              <label style={{ fontSize: 13, color: C.textDim, fontFamily: F.display, fontWeight: 600 }}>What part of the organization is being assessed?</label>
              <div className="flex flex-wrap gap-2 mt-3 mb-2">
                {SCOPE_PART_OPTIONS.map((opt) => (
                  <button key={opt} onClick={() => setScope((s) => ({ ...s, part: opt }))} className="px-3.5 py-2 rounded-lg text-xs font-semibold"
                    style={{ background: scope.part === opt ? C.accentSoft : C.surface2, color: scope.part === opt ? C.accent : C.muted, border: `1px solid ${scope.part === opt ? C.accent : C.border}` }}>
                    {opt}
                  </button>
                ))}
              </div>
              {scope.part === "Other" && (
                <input value={scope.partOther} onChange={(e) => setScope((s) => ({ ...s, partOther: e.target.value }))} placeholder="Please specify" className="w-full mt-1 mb-2 px-4 py-2.5 rounded-lg outline-none" style={{ background: C.surface2, border: `1px solid ${C.border}`, color: C.text, fontSize: 13.5 }} />
              )}

              <label style={{ fontSize: 13, color: C.textDim, fontFamily: F.display, fontWeight: 600, display: "block", marginTop: 24 }}>Which systems are included?</label>
              <div className="flex flex-wrap gap-2 mt-3 mb-2">
                {SCOPE_SYSTEM_OPTIONS.map((opt) => (
                  <button key={opt} onClick={() => toggleScopeValue("systems", opt)} className="px-3.5 py-2 rounded-lg text-xs font-semibold"
                    style={{ background: scope.systems.includes(opt) ? C.accentSoft : C.surface2, color: scope.systems.includes(opt) ? C.accent : C.muted, border: `1px solid ${scope.systems.includes(opt) ? C.accent : C.border}` }}>
                    {opt}
                  </button>
                ))}
              </div>
              {scope.systems.includes("Other") && (
                <input value={scope.systemsOther} onChange={(e) => setScope((s) => ({ ...s, systemsOther: e.target.value }))} placeholder="Please specify" className="w-full mt-1 mb-2 px-4 py-2.5 rounded-lg outline-none" style={{ background: C.surface2, border: `1px solid ${C.border}`, color: C.text, fontSize: 13.5 }} />
              )}

              <label style={{ fontSize: 13, color: C.textDim, fontFamily: F.display, fontWeight: 600, display: "block", marginTop: 24 }}>What types of data are handled?</label>
              <div className="flex flex-wrap gap-2 mt-3 mb-2">
                {SCOPE_DATA_OPTIONS.map((opt) => (
                  <button key={opt} onClick={() => toggleScopeValue("dataTypes", opt)} className="px-3.5 py-2 rounded-lg text-xs font-semibold"
                    style={{ background: scope.dataTypes.includes(opt) ? C.accentSoft : C.surface2, color: scope.dataTypes.includes(opt) ? C.accent : C.muted, border: `1px solid ${scope.dataTypes.includes(opt) ? C.accent : C.border}` }}>
                    {opt}
                  </button>
                ))}
              </div>
              {scope.dataTypes.includes("Other") && (
                <input value={scope.dataTypesOther} onChange={(e) => setScope((s) => ({ ...s, dataTypesOther: e.target.value }))} placeholder="Please specify" className="w-full mt-1 px-4 py-2.5 rounded-lg outline-none" style={{ background: C.surface2, border: `1px solid ${C.border}`, color: C.text, fontSize: 13.5 }} />
              )}
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 style={{ fontFamily: F.display, fontWeight: 800, fontSize: 28 }}>Select your frameworks</h2>
              <p style={{ color: C.muted, marginTop: 8, marginBottom: 32 }}>You can add more later. Controls that overlap will be mapped automatically.</p>
              <div className="space-y-3">
                {FRAMEWORKS.map((f) => (
                  <button key={f.code} onClick={() => toggleFramework(f.code)} className="w-full flex items-center justify-between p-5 rounded-xl text-left" style={{ background: frameworks.includes(f.code) ? C.accentSoft : C.surface2, border: `1px solid ${frameworks.includes(f.code) ? C.accent : C.border}` }}>
                    <div><div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 15 }}>{f.name}</div><div style={{ fontSize: 12.5, color: C.muted, marginTop: 3, fontFamily: F.mono }}>{f.controls} controls in catalog</div></div>
                    <div className="flex items-center justify-center rounded-full" style={{ width: 24, height: 24, background: frameworks.includes(f.code) ? C.accent : "transparent", border: `1.5px solid ${frameworks.includes(f.code) ? C.accent : C.border}` }}>
                      {frameworks.includes(f.code) && <Check size={14} color="#0B0A10" />}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 style={{ fontFamily: F.display, fontWeight: 800, fontSize: 28 }}>Existing security</h2>
              <p style={{ color: C.muted, marginTop: 8, marginBottom: 28 }}>Answer honestly — the AI grounds its gap analysis in these answers plus the documents you upload next.</p>
              <div className="space-y-3">
                {SECURITY_QUESTIONS.map((q) => (
                  <div key={q.id} className="p-4 rounded-xl" style={{ background: C.surface2, border: `1px solid ${C.border}` }}>
                    <div style={{ fontSize: 13.5, fontWeight: 500, marginBottom: 10, lineHeight: 1.5 }}>{q.text}</div>
                    <div className="flex gap-2 flex-wrap">
                      {q.options.map((opt) => (
                        <button
                          key={opt}
                          onClick={() => setSecurity((s) => ({ ...s, [q.id]: opt }))}
                          className="px-3.5 py-1.5 rounded-lg text-xs font-semibold"
                          style={{ background: security[q.id] === opt ? C.accentSoft : "transparent", color: security[q.id] === opt ? C.accent : C.muted, border: `1px solid ${security[q.id] === opt ? C.accent : C.border}` }}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <div>
              <h2 style={{ fontFamily: F.display, fontWeight: 800, fontSize: 28 }}>Documents</h2>
              <p style={{ color: C.muted, marginTop: 8, marginBottom: 12 }}>Upload whatever you have — PDF only. The AI reads each document directly, and treats anything missing as a potential gap. Upload at least one to continue.</p>
              <input ref={docInputRef} type="file" accept=".pdf,application/pdf" className="hidden" onChange={handleDocFileChange} />
              <div className="space-y-2">
                {DOCUMENT_TYPES.map((docType) => {
                  const file = documents[docType];
                  return (
                    <div key={docType} className="flex items-center justify-between px-4 py-3 rounded-lg" style={{ background: C.surface2, border: `1px solid ${file ? C.accent : C.border}` }}>
                      <div className="flex items-center gap-3 min-w-0">
                        {file ? <FileCheck2 size={16} color={C.success} /> : <FileText size={16} color={C.mutedDim} />}
                        <div className="min-w-0">
                          <div style={{ fontSize: 13, fontWeight: 500 }}>{docType}</div>
                          {file && <div style={{ fontSize: 11, color: C.mutedDim }}>{file.name} · {(file.size / (1024 * 1024)).toFixed(2)} MB</div>}
                        </div>
                      </div>
                      <div className="shrink-0">
                        {file ? (
                          <button onClick={() => removeDocument(docType)}><X size={16} color={C.mutedDim} /></button>
                        ) : (
                          <button onClick={() => triggerDocUpload(docType)} className="px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: "transparent", color: C.accent, border: `1px solid ${C.accent}` }}>
                            Upload
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="py-4">
              {analyzing ? (
                <div className="text-center py-10">
                  <div className="flex justify-center mb-8">
                    <div style={{ position: "relative", width: 88, height: 88 }}>
                      <Loader2 size={88} color={C.accent} className="animate-spin" style={{ opacity: 0.9 }} />
                    </div>
                  </div>
                  <h2 style={{ fontFamily: F.display, fontWeight: 800, fontSize: 24 }}>Analyzing your policy with AI…</h2>
                  <div className="mt-8 max-w-sm mx-auto space-y-3 text-left">
                    {ANALYSIS_STEPS.map((s, i) => (
                      <div key={s} className="flex items-center gap-3">
                        {i < analyzeStep ? <CheckCircle2 size={17} color={C.success} /> : i === analyzeStep ? <Loader2 size={17} color={C.accent} className="animate-spin" /> : <Circle size={17} color={C.mutedDim} />}
                        <span style={{ fontSize: 14, color: i <= analyzeStep ? C.text : C.mutedDim }}>{s}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : analysisError ? (
                <div className="text-center py-10">
                  <div className="flex justify-center mb-6"><div className="rounded-full p-4" style={{ background: C.criticalSoft }}><AlertOctagon size={40} color={C.critical} /></div></div>
                  <h2 style={{ fontFamily: F.display, fontWeight: 800, fontSize: 22 }}>Analysis failed</h2>
                  <p style={{ color: C.muted, marginTop: 8, maxWidth: 440, marginLeft: "auto", marginRight: "auto", lineHeight: 1.55 }}>{analysisError}</p>
                  <GhostButton onClick={() => setStep(4)} style={{ marginTop: 24 }}>Back to documents</GhostButton>
                </div>
              ) : result ? (
                <div>
                  <div className="flex justify-center mb-5"><div className="rounded-full p-4" style={{ background: C.successSoft }}><CheckCircle2 size={34} color={C.success} /></div></div>
                  <h2 style={{ fontFamily: F.display, fontWeight: 800, fontSize: 24, textAlign: "center" }}>Gap analysis complete</h2>
                  <p style={{ color: C.muted, marginTop: 10, textAlign: "center", maxWidth: 560, marginLeft: "auto", marginRight: "auto", lineHeight: 1.6 }}>{result.overallSummary}</p>

                  <div className="mt-9">
                    <div style={{ fontFamily: F.mono, fontSize: 11.5, color: C.muted, marginBottom: 10 }}>COMPLIANCE PER FRAMEWORK</div>
                    <FrameworkComplianceGrid frameworkCompliance={result.frameworkCompliance} />
                  </div>

                  <div className="mt-9">
                    <div style={{ fontFamily: F.mono, fontSize: 11.5, color: C.muted, marginBottom: 10 }}>RISK → CONTROL → FRAMEWORKS → GAP</div>
                    <RiskControlGapList items={result.riskControlGaps} />
                  </div>

                  <div className="flex justify-center mt-10">
                    <PrimaryButton
                      onClick={() => onComplete({ name: company.name, industry: company.industry, size: Number(company.employees) >= 250 ? "large" : "sme" }, result)}
                      icon={ArrowRight}
                    >
                      Enter dashboard
                    </PrimaryButton>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {step < 5 && (
        <div className="flex items-center justify-between px-8 py-6 border-t max-w-2xl mx-auto w-full" style={{ borderColor: C.borderSoft }}>
          <GhostButton onClick={() => setStep((s) => Math.max(0, s - 1))} icon={ChevronLeft} style={{ visibility: step === 0 ? "hidden" : "visible" }}>Back</GhostButton>
          {step === 4
            ? <PrimaryButton onClick={runAnalysis} disabled={!documentsValid}>Analyze with AI</PrimaryButton>
            : <PrimaryButton onClick={() => setStep((s) => s + 1)} disabled={continueDisabled} icon={ChevronRight}>Continue</PrimaryButton>}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   APP SHELL
   ============================================================ */
const NAV = [
  { id: "dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { id: "controls", label: "Controls", Icon: ListChecks },
  { id: "assessments", label: "Assessments", Icon: ClipboardCheck },
  { id: "evidence", label: "Evidence Sources", Icon: FolderOpen },
  { id: "risk", label: "Risk Register", Icon: AlertTriangle },
  { id: "reports", label: "Reports", Icon: FileText },
];

function Sidebar({ page, setPage, orgName }) {
  return (
    <div className="hidden md:flex flex-col justify-between w-64 shrink-0 border-r" style={{ background: C.bgSoft, borderColor: C.borderSoft }}>
      <div>
        <div className="flex items-center gap-2.5 px-6 py-6">
          <Logo height={24} />
        </div>
        <div className="px-4">
          {NAV.map(({ id, label, Icon }) => (
            <button key={id} onClick={() => setPage(id)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 text-left" style={{ background: page === id ? C.accentSoft : "transparent", color: page === id ? C.text : C.muted }}>
              <Icon size={17} color={page === id ? C.accent : C.muted} />
              <span style={{ fontSize: 14, fontWeight: page === id ? 600 : 500 }}>{label}</span>
              {page === id && <div className="ml-auto w-1 h-4 rounded-full" style={{ background: C.accent }} />}
            </button>
          ))}
        </div>
      </div>
      <div className="px-4 pb-6">
        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg" style={{ color: C.muted }}><Settings size={17} /><span style={{ fontSize: 14 }}>Settings</span></button>
        <div className="mt-3 p-3 rounded-xl flex items-center gap-3" style={{ background: C.surface2, border: `1px solid ${C.border}` }}>
          <div className="rounded-full flex items-center justify-center" style={{ width: 32, height: 32, background: C.accent, color: "#0B0A10", fontFamily: F.display, fontWeight: 700, fontSize: 13 }}>{orgName?.[0]?.toUpperCase() || "M"}</div>
          <div className="min-w-0">
            <div style={{ fontSize: 13, fontWeight: 600, color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{orgName}</div>
            <div style={{ fontSize: 11.5, color: C.mutedDim }}>Free trial</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function NotifDropdown({ onClose }) {
  const { state } = useStore();
  return (
    <div className="absolute right-0 top-10 w-80 rounded-xl overflow-hidden z-50" style={{ background: C.surface2, border: `1px solid ${C.border}`, boxShadow: "0 20px 50px -15px rgba(0,0,0,.7)" }}>
      <div className="px-4 py-3 border-b" style={{ borderColor: C.border }}><span style={{ fontFamily: F.display, fontWeight: 700, fontSize: 13 }}>Recent activity</span></div>
      <div style={{ maxHeight: 320, overflowY: "auto" }}>
        {state.activity.slice(0, 6).map((a) => {
          const meta = ACTIVITY_META[a.type] || { Icon: Info, color: C.muted };
          return (
            <div key={a.id} className="px-4 py-2.5 flex items-start gap-2.5 border-b" style={{ borderColor: C.borderSoft }}>
              <meta.Icon size={13} color={meta.color} style={{ marginTop: 2, flexShrink: 0 }} />
              <div><div style={{ fontSize: 12, color: C.textDim, lineHeight: 1.4 }}>{a.text}</div><div style={{ fontSize: 10.5, color: C.mutedDim, marginTop: 2 }}>{timeAgo(a.ts)}</div></div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Topbar({ title, subtitle, onExit }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex items-center justify-between px-8 py-5 border-b relative" style={{ borderColor: C.borderSoft }}>
      <div>
        <h1 style={{ fontFamily: F.display, fontWeight: 800, fontSize: 22 }}>{title}</h1>
        {subtitle && <p style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>{subtitle}</p>}
      </div>
      <div className="flex items-center gap-4">
        <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: C.surface2, border: `1px solid ${C.border}` }}>
          <Search size={14} color={C.mutedDim} /><span style={{ fontSize: 13, color: C.mutedDim }}>Search controls, risks…</span>
        </div>
        <div className="relative">
          <button className="relative" onClick={() => setOpen((o) => !o)}>
            <Bell size={19} color={C.muted} /><span className="absolute -top-1 -right-1 w-2 h-2 rounded-full" style={{ background: C.critical }} />
          </button>
          {open && <NotifDropdown onClose={() => setOpen(false)} />}
        </div>
        <button onClick={onExit} title="Exit to landing page"><LogOut size={18} color={C.muted} /></button>
      </div>
    </div>
  );
}

/* ============================================================
   DASHBOARD
   ============================================================ */
// Scoped to the executive dashboard only -- every other page keeps the existing
// C.* palette untouched. Values per the exec-dashboard color spec.
const DC = {
  bg: "#0B1220", surface: "#111827", border: "#1F2937",
  primary: "#14B8A6", positive: "#22C55E", warning: "#F59E0B", critical: "#EF4444", info: "#3B82F6",
  text: "#F1F5F9", textDim: "#94A3B8", textMuted: "#64748B",
};
const DC_LEVEL = { critical: DC.critical, high: DC.warning, medium: DC.info, low: DC.positive };

function DcCard({ children, style = {}, className = "" }) {
  return <div className={`rounded-2xl ${className}`} style={{ background: DC.surface, border: `1px solid ${DC.border}`, ...style }}>{children}</div>;
}
function DcLabel({ children, style = {} }) {
  return <div style={{ fontFamily: F.mono, fontSize: 10.5, letterSpacing: ".04em", color: DC.textMuted, textTransform: "uppercase", ...style }}>{children}</div>;
}
function DcKpi({ label, value, unit, sub, badge, badgeColor }) {
  return (
    <DcCard className="p-5">
      <div className="flex items-center justify-between mb-3">
        <DcLabel>{label}</DcLabel>
        {badge && <span className="flex items-center gap-1" style={{ fontSize: 10.5, color: badgeColor || DC.positive, fontFamily: F.mono }}><span className="w-1.5 h-1.5 rounded-full" style={{ background: badgeColor || DC.positive }} />{badge}</span>}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span style={{ fontFamily: F.display, fontWeight: 800, fontSize: 40, color: DC.text, lineHeight: 1 }}>{value}</span>
        {unit && <span style={{ fontFamily: F.display, fontWeight: 600, fontSize: 16, color: DC.textDim }}>{unit}</span>}
      </div>
      {sub && <div style={{ fontSize: 12, color: DC.textDim, marginTop: 8 }}>{sub}</div>}
    </DcCard>
  );
}
function DcImpactBar({ value, max, color, label }) {
  const pct = Math.max(2, Math.round((value / max) * 100));
  return (
    <div>
      {label && <div className="flex items-center justify-between mb-1" style={{ fontSize: 11, color: DC.textDim }}><span>{label}</span><span style={{ fontFamily: F.mono, color: DC.text, fontWeight: 700 }}>{value}</span></div>}
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: DC.border }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

function DashboardPage() {
  const { state, actions, toast } = useStore();
  const { perFramework, unified } = useCompliance();
  const riskIndex = useRiskIndex();
  const evidenceCount = useEvidenceCount();
  const openRisks = useMemo(() => [...state.risks].filter((r) => r.status !== "Resolved" && r.status !== "Mitigated").sort((a, b) => b.score - a.score), [state.risks]);
  const health = useMemo(() => ({ connected: state.connectors.filter((c) => c.status === "connected").length, total: state.connectors.length }), [state.connectors]);

  // --- real derived metrics for the executive layout below ---------------------
  const risksWithLevel = useMemo(() => state.risks.map((r) => ({ ...r, level: r.level || scoreToLevel(r.score) })), [state.risks]);
  const riskDist = useMemo(() => {
    const d = { critical: 0, high: 0, medium: 0, low: 0 };
    risksWithLevel.forEach((r) => { d[r.level] = (d[r.level] || 0) + 1; });
    return { ...d, total: risksWithLevel.length };
  }, [risksWithLevel]);
  const priorityActions = useMemo(() => [...risksWithLevel].sort((a, b) => b.score - a.score).slice(0, 5), [risksWithLevel]);

  const controlGaps = useMemo(() => {
    // "gap" = controls not yet at maturity 5 (Optimizing), per framework and total.
    const perFw = {};
    let total = 0, totalCount = 0;
    FRAMEWORKS.forEach((f) => {
      const map = state.controls[f.code] || {};
      const entries = Object.values(map).filter((v) => v !== "na");
      const gaps = entries.filter((v) => v !== 5).length;
      perFw[f.code] = gaps;
      total += gaps;
      totalCount += entries.length;
    });
    return { perFw, total, totalCount };
  }, [state.controls]);

  const evidenceByFramework = useMemo(() => {
    // % of a framework's controls that have >=1 uploaded evidence item referencing them.
    const out = {};
    FRAMEWORKS.forEach((f) => {
      const total = (CONTROLS_SAMPLE[f.code] || []).length;
      const covered = new Set(
        state.evidence.filter((e) => e.control && e.control.startsWith(f.code)).map((e) => e.control)
      ).size;
      out[f.code] = total ? Math.round((covered / total) * 100) : 0;
    });
    return out;
  }, [state.evidence]);

  const evidenceHealthPct = useMemo(() => {
    const connectorPart = health.total ? (health.connected / health.total) * 70 : 0;
    const manualDone = state.evidence.filter((e) => e.status === "done").length;
    const manualPart = state.evidence.length ? (manualDone / state.evidence.length) * 30 : 0;
    return Math.round(connectorPart + manualPart);
  }, [health, state.evidence]);

  const connectorHealth = useMemo(() => {
    const STALE_MS = 6 * 3600000;
    let healthy = 0, warning = 0, failed = 0;
    state.connectors.forEach((c) => {
      if (c.status !== "connected") failed += 1;
      else if (c.lastSync && Date.now() - c.lastSync > STALE_MS) warning += 1;
      else healthy += 1;
    });
    return { healthy, warning, failed, total: state.connectors.length };
  }, [state.connectors]);

  const TARGET_SCORE = 70;
  const radarData = useMemo(() => {
    const compliance = unified;
    const evidence = evidenceHealthPct;
    const riskPosture = 100 - riskIndex;
    const readiness = Math.round((compliance + evidence + riskPosture) / 3);
    return [
      { metric: "Compliance", value: compliance },
      { metric: "Evidence", value: evidence },
      { metric: "Risk Posture", value: riskPosture },
      { metric: "Readiness", value: readiness },
    ];
  }, [unified, evidenceHealthPct, riskIndex]);

  // Cross-framework example: use the real AI-generated chain if one exists, else a
  // clearly-labeled illustrative example (never claimed as this org's live data).
  const crossFwExample = state.gapAnalysis?.riskControlGaps?.[0] || null;

  const [aiOpen, setAiOpen] = useState(false);
  const [aiStage, setAiStage] = useState(-1);
  const [aiDone, setAiDone] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [aiRecommendations, setAiRecommendations] = useState(null);
  const generateAI = async () => {
    setAiOpen(true); setAiDone(false); setAiError(null); setAiStage(0);
    STAGES_AI.slice(0, -1).forEach((_, i) => setTimeout(() => setAiStage(i), i * 550));
    try {
      const res = await fetch("/api/ai-recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          org: state.org,
          frameworks: FRAMEWORKS,
          controls: state.controls,
          risks: state.risks,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "AI request failed");
      setAiStage(STAGES_AI.length - 1);
      setAiRecommendations(data.recommendations || []);
      setAiDone(true);
      actions.addActivity("framework", "AI recommendations regenerated");
    } catch (err) {
      setAiError(err.message || "Failed to generate recommendations");
      setAiOpen(false);
      toast.error(`AI analysis failed: ${err.message || err}`);
    }
  };

  const quickResolve = (framework, code) => {
    actions.setControlStatus(framework, code, 5);
  };

  const [exporting, setExporting] = useState(null);
  const buildExportData = () => ({
    org: state.org,
    generatedAt: Date.now(),
    unified,
    riskIndex,
    health,
    perFramework,
    openRisks,
    gapAnalysis: state.gapAnalysis,
    aiRecommendations,
  });
  const handleExportExcel = async () => {
    setExporting("excel");
    try {
      await exportDashboardExcel(buildExportData());
      toast.success("Excel export downloaded");
    } catch (err) {
      toast.error(`Excel export failed: ${err.message || err}`);
    } finally {
      setExporting(null);
    }
  };
  const handleExportPDF = () => {
    setExporting("pdf");
    try {
      exportDashboardPDF(buildExportData());
      toast.success("PDF export downloaded");
    } catch (err) {
      toast.error(`PDF export failed: ${err.message || err}`);
    } finally {
      setExporting(null);
    }
  };

  // proportional, internally-consistent split of the score-gap across the 3 real gap sources
  const gapToTarget = Math.max(0, TARGET_SCORE - unified);
  const highCritCount = riskDist.critical + riskDist.high;
  const avgEvidenceCoverage = Math.round((evidenceByFramework.ISO27001 + evidenceByFramework.SAMA + evidenceByFramework.NCAECC) / 3);
  const evidenceGapCount = Math.max(0, Math.round((100 - avgEvidenceCoverage) / 10));
  const impactWeights = [controlGaps.total, evidenceGapCount, highCritCount];
  const impactSum = impactWeights.reduce((a, b) => a + b, 0) || 1;
  const impactSplit = impactWeights.map((w) => Math.round((w / impactSum) * gapToTarget));

  const priorityDue = { critical: "7 days", high: "14 days", medium: "30 days", low: "60 days" };
  const priorityLabel = { critical: "CRITICAL", high: "HIGH", medium: "MEDIUM", low: "LOW" };

  const aiTotals = useMemo(() => {
    if (!aiRecommendations?.length) return null;
    const num = (s) => parseFloat(String(s).replace(/[^0-9.-]/g, "")) || 0;
    return {
      scoreGain: aiRecommendations.reduce((a, r) => a + num(r.complianceDelta), 0),
      riskReduction: aiRecommendations.reduce((a, r) => a + Math.abs(num(r.riskDelta)), 0),
      count: aiRecommendations.length,
      top: aiRecommendations[0]?.title,
    };
  }, [aiRecommendations]);

  return (
    <div className="p-8 space-y-5" style={{ background: DC.bg }}>
      <div className="flex items-center justify-end gap-3">
        <GhostButton onClick={handleExportExcel} icon={FileSpreadsheet} disabled={exporting === "excel"} style={{ padding: "8px 14px", fontSize: 13, borderColor: DC.border, color: DC.textDim }}>
          {exporting === "excel" ? "Exporting…" : "Export Excel"}
        </GhostButton>
        <GhostButton onClick={handleExportPDF} icon={Download} disabled={exporting === "pdf"} style={{ padding: "8px 14px", fontSize: 13, borderColor: DC.border, color: DC.textDim }}>
          {exporting === "pdf" ? "Exporting…" : "Export PDF"}
        </GhostButton>
      </div>

      {/* 1. EXECUTIVE KPI ROW */}
      <div className="grid md:grid-cols-4 gap-4">
        <DcKpi label="Unified Compliance Score" value={unified} unit="/ 100" badge="live" />
        <DcKpi label="Risk Exposure" value={riskIndex} unit="/ 100" badge="live" badgeColor={riskIndex < 40 ? DC.positive : DC.warning} />
        <DcKpi label="Evidence Health" value={evidenceHealthPct} unit="%" sub={`${evidenceCount.manual} manual · ${evidenceCount.auto} from connectors`} />
        <DcKpi label="Framework Coverage" value={FRAMEWORKS.length} unit={`/ ${FRAMEWORKS.length}`}
          sub={perFramework.map((f) => `${f.code.replace("27001", "")} ${f.score}%`).join(" · ")} />
      </div>

      {/* 6. FRAMEWORK COMPARISON -- placed near the top per request */}
      <div className="grid md:grid-cols-2 gap-5">
        <DcCard className="p-6">
          <DcLabel style={{ marginBottom: 14 }}>Framework Comparison</DcLabel>
          <table className="w-full" style={{ fontSize: 12.5 }}>
            <thead><tr style={{ color: DC.textMuted, fontSize: 10.5 }}>
              <th className="text-left pb-2">FRAMEWORK</th><th className="text-right pb-2">SCORE</th><th className="text-right pb-2">GAP</th><th className="text-right pb-2">EVIDENCE</th>
            </tr></thead>
            <tbody>
              {perFramework.map((f) => (
                <tr key={f.code} style={{ borderTop: `1px solid ${DC.border}` }}>
                  <td className="py-2.5" style={{ color: DC.text, fontWeight: 600 }}>{f.name}</td>
                  <td className="py-2.5 text-right" style={{ fontFamily: F.mono, color: DC.primary }}>{f.score}%</td>
                  <td className="py-2.5 text-right" style={{ fontFamily: F.mono, color: DC.textDim }}>{controlGaps.perFw[f.code]}</td>
                  <td className="py-2.5 text-right" style={{ fontFamily: F.mono, color: DC.textDim }}>{evidenceByFramework[f.code]}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </DcCard>
        <DcCard className="p-6">
          <DcLabel style={{ marginBottom: 4 }}>Posture Radar</DcLabel>
          <div style={{ width: "100%", height: 200 }}>
            <ResponsiveContainer>
              <RadarChart data={radarData} outerRadius="75%">
                <PolarGrid stroke={DC.border} />
                <PolarAngleAxis dataKey="metric" tick={{ fill: DC.textDim, fontSize: 11 }} />
                <PolarRadiusAxis tick={false} axisLine={false} domain={[0, 100]} />
                <Radar dataKey="value" stroke={DC.primary} fill={DC.primary} fillOpacity={0.35} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </DcCard>
      </div>

      {/* 2. DECISION IMPACT */}
      <DcCard className="p-6">
        <DcLabel style={{ marginBottom: 10 }}>Fastest Path to Target</DcLabel>
        <div className="flex items-center gap-4 mb-6 flex-wrap">
          <span style={{ fontFamily: F.display, fontWeight: 800, fontSize: 30, color: DC.text }}>{unified}</span>
          <div className="flex-1 min-w-[160px] h-2 rounded-full overflow-hidden" style={{ background: DC.border }}>
            <div className="h-full rounded-full" style={{ width: `${Math.min(100, (unified / TARGET_SCORE) * 100)}%`, background: DC.primary }} />
          </div>
          <span style={{ fontFamily: F.mono, fontSize: 13, color: DC.textDim }}>{TARGET_SCORE} TARGET</span>
          <Badge color={DC.warning} bg="rgba(245,158,11,.12)">gap {gapToTarget}</Badge>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl" style={{ background: DC.bg, border: `1px solid ${DC.border}` }}>
            <div style={{ fontFamily: F.display, fontWeight: 800, fontSize: 22, color: DC.text }}>{controlGaps.total} <span style={{ fontSize: 13, fontWeight: 600, color: DC.textDim }}>controls</span></div>
            <div style={{ fontSize: 11.5, color: DC.positive, marginTop: 4 }}>+{impactSplit[0]} potential score impact</div>
          </div>
          <div className="p-4 rounded-xl" style={{ background: DC.bg, border: `1px solid ${DC.border}` }}>
            <div style={{ fontFamily: F.display, fontWeight: 800, fontSize: 22, color: DC.text }}>{evidenceGapCount} <span style={{ fontSize: 13, fontWeight: 600, color: DC.textDim }}>evidence gaps</span></div>
            <div style={{ fontSize: 11.5, color: DC.positive, marginTop: 4 }}>+{impactSplit[1]} potential score impact</div>
          </div>
          <div className="p-4 rounded-xl" style={{ background: DC.bg, border: `1px solid ${DC.border}` }}>
            <div style={{ fontFamily: F.display, fontWeight: 800, fontSize: 22, color: DC.text }}>{highCritCount} <span style={{ fontSize: 13, fontWeight: 600, color: DC.textDim }}>high/critical risks</span></div>
            <div style={{ fontSize: 11.5, color: DC.critical, marginTop: 4 }}>+{impactSplit[2]} potential score impact</div>
          </div>
        </div>
      </DcCard>

      {/* 3. PRIORITY ACTIONS */}
      <DcCard className="p-6">
        <DcLabel style={{ marginBottom: 14 }}>Priority Actions</DcLabel>
        <div className="space-y-3">
          {priorityActions.map((r, i) => (
            <div key={r.id} className="p-4 rounded-xl" style={{ background: DC.bg, border: `1px solid ${DC.border}` }}>
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <span style={{ fontFamily: F.mono, fontSize: 11, color: DC.textMuted }}>{String(i + 1).padStart(2, "0")}</span>
                  <span style={{ fontFamily: F.display, fontWeight: 700, fontSize: 14, color: DC.text }}>{r.title}</span>
                  <Badge color={DC_LEVEL[r.level]} bg={`${DC_LEVEL[r.level]}22`}>{priorityLabel[r.level]}</Badge>
                </div>
                <button onClick={() => toast.info(`${r.title} — full impact breakdown coming soon`)} style={{ fontSize: 12, color: DC.primary, fontFamily: F.mono }}>VIEW IMPACT →</button>
              </div>
              <div className="grid md:grid-cols-3 gap-4 mb-3">
                <DcImpactBar label="Compliance Impact" value={Math.round(r.score / 2)} max={20} color={DC.positive} />
                <DcImpactBar label="Risk Impact" value={r.score} max={25} color={DC.critical} />
                <div style={{ fontSize: 11.5, color: DC.textDim }}>
                  <div><span style={{ color: DC.textMuted }}>Framework:</span> {r.framework} · {r.code}</div>
                  <div><span style={{ color: DC.textMuted }}>Owner:</span> {r.owner}</div>
                  <div><span style={{ color: DC.textMuted }}>Suggested:</span> {priorityDue[r.level]}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </DcCard>

      {/* 4. CROSS-FRAMEWORK IMPACT */}
      <DcCard className="p-6">
        <div className="flex items-center justify-between mb-1">
          <DcLabel>Cross-Framework Impact</DcLabel>
          {!crossFwExample && <span style={{ fontSize: 10.5, color: DC.textMuted, fontFamily: F.mono }}>EXAMPLE · run Gap Analysis for your own data</span>}
        </div>
        {(() => {
          const ex = crossFwExample || {
            control: "Multi-Factor Authentication", frameworkMapping: [
              { code: "ISO27001", controlRef: "5.15", status: "Not Implemented" },
              { code: "NCAECC", controlRef: "2-4-1", status: "Partial" },
              { code: "SAMA", controlRef: "AC-3", status: "Not Implemented" },
            ],
          };
          return (
            <div className="grid md:grid-cols-2 gap-6 items-center mt-4">
              <div className="flex flex-col items-center gap-2 py-4">
                <div className="px-4 py-2 rounded-lg" style={{ background: `${DC.primary}22`, color: DC.primary, fontFamily: F.mono, fontSize: 12 }}>1 CONTROL — {ex.control}</div>
                <div style={{ color: DC.textMuted }}>↓</div>
                <div className="px-4 py-2 rounded-lg" style={{ background: DC.bg, border: `1px solid ${DC.border}`, fontFamily: F.mono, fontSize: 12, color: DC.textDim }}>{ex.frameworkMapping.length} REQUIREMENTS</div>
                <div style={{ color: DC.textMuted }}>↓</div>
                <div className="px-4 py-2 rounded-lg" style={{ background: DC.bg, border: `1px solid ${DC.border}`, fontFamily: F.mono, fontSize: 12, color: DC.textDim }}>{ex.frameworkMapping.length} FRAMEWORKS</div>
                <div style={{ color: DC.textMuted }}>↓</div>
                <div className="px-4 py-2 rounded-lg" style={{ background: `${DC.positive}22`, color: DC.positive, fontFamily: F.mono, fontSize: 12 }}>+{Math.round((ex.riskScore || 12) / 2) || 12} COMPLIANCE IMPACT</div>
              </div>
              <div className="grid gap-2">
                {ex.frameworkMapping.map((m) => {
                  const meta = FRAMEWORKS.find((f) => f.code === m.code);
                  const statusColor = m.status === "Implemented" ? DC.positive : m.status === "Partial" ? DC.warning : DC.critical;
                  return (
                    <div key={m.code} className="flex items-center justify-between p-3 rounded-lg" style={{ background: DC.bg, border: `1px solid ${DC.border}` }}>
                      <div><div style={{ fontSize: 12.5, fontWeight: 600, color: DC.text }}>{meta?.name || m.code}</div><div style={{ fontFamily: F.mono, fontSize: 11, color: DC.textMuted }}>{m.controlRef}</div></div>
                      <Badge color={statusColor} bg={`${statusColor}22`}>{m.status}</Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}
      </DcCard>

      <div className="grid md:grid-cols-2 gap-5">
        {/* 5. EVIDENCE INTELLIGENCE */}
        <DcCard className="p-6">
          <DcLabel style={{ marginBottom: 14 }}>Evidence Intelligence</DcLabel>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div><div style={{ fontFamily: F.display, fontWeight: 800, fontSize: 26, color: DC.text }}>{evidenceCount.total}</div><div style={{ fontSize: 10.5, color: DC.textMuted }}>TOTAL EVIDENCE</div></div>
            <div><div style={{ fontFamily: F.display, fontWeight: 800, fontSize: 26, color: DC.text }}>{evidenceCount.manual}</div><div style={{ fontSize: 10.5, color: DC.textMuted }}>MANUAL</div></div>
            <div><div style={{ fontFamily: F.display, fontWeight: 800, fontSize: 26, color: DC.text }}>{evidenceCount.auto}</div><div style={{ fontSize: 10.5, color: DC.textMuted }}>FROM CONNECTORS</div></div>
          </div>
          <div className="space-y-2">
            {FRAMEWORKS.map((f) => (
              <DcImpactBar key={f.code} label={`${f.name} evidence coverage`} value={evidenceByFramework[f.code]} max={100} color={DC.primary} />
            ))}
          </div>
        </DcCard>

        {/* 8. RISK DISTRIBUTION */}
        <DcCard className="p-6">
          <div className="flex items-center justify-between mb-4"><DcLabel>Risk Distribution</DcLabel><span style={{ fontFamily: F.mono, fontSize: 11, color: DC.textDim }}>Total: {riskDist.total}</span></div>
          <div className="h-3 rounded-full overflow-hidden flex mb-4" style={{ background: DC.border }}>
            {["critical", "high", "medium", "low"].map((lvl) => riskDist[lvl] > 0 && (
              <div key={lvl} style={{ width: `${(riskDist[lvl] / (riskDist.total || 1)) * 100}%`, background: DC_LEVEL[lvl] }} />
            ))}
          </div>
          <div className="grid grid-cols-4 gap-2 text-center">
            {["critical", "high", "medium", "low"].map((lvl) => (
              <div key={lvl}>
                <div style={{ fontFamily: F.display, fontWeight: 800, fontSize: 20, color: DC_LEVEL[lvl] }}>{riskDist[lvl]}</div>
                <div style={{ fontSize: 10, color: DC.textMuted, textTransform: "uppercase" }}>{lvl}</div>
              </div>
            ))}
          </div>
        </DcCard>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        {/* 7. EXECUTIVE ATTENTION */}
        <DcCard className="p-6">
          <DcLabel style={{ marginBottom: 14 }}>Executive Attention</DcLabel>
          <div className="grid grid-cols-2 gap-4">
            {[
              { n: riskDist.critical, label: "CRITICAL RISK", color: DC.critical },
              { n: controlGaps.total, label: "OPEN CONTROLS", color: DC.warning },
              { n: connectorHealth.warning, label: "STALE CONNECTORS", color: DC.warning },
              { n: connectorHealth.failed, label: "CONNECTOR ISSUES", color: DC.critical },
            ].map((x) => (
              <div key={x.label} className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: x.color }} />
                <div><div style={{ fontFamily: F.display, fontWeight: 800, fontSize: 22, color: DC.text }}>{x.n}</div><div style={{ fontSize: 10, color: DC.textMuted }}>{x.label}</div></div>
              </div>
            ))}
          </div>
        </DcCard>

        {/* 10. CONNECTOR HEALTH */}
        <DcCard className="p-6">
          <div className="flex items-center justify-between mb-4"><DcLabel>Connectors</DcLabel><span style={{ fontFamily: F.mono, fontSize: 13, color: DC.text }}>{health.connected} / {health.total}</span></div>
          <div className="grid grid-cols-3 gap-3 mb-4 text-center">
            <div><div style={{ fontFamily: F.display, fontWeight: 800, fontSize: 20, color: DC.positive }}>{connectorHealth.healthy}</div><div style={{ fontSize: 10, color: DC.textMuted }}>HEALTHY</div></div>
            <div><div style={{ fontFamily: F.display, fontWeight: 800, fontSize: 20, color: DC.warning }}>{connectorHealth.warning}</div><div style={{ fontSize: 10, color: DC.textMuted }}>WARNING</div></div>
            <div><div style={{ fontFamily: F.display, fontWeight: 800, fontSize: 20, color: DC.critical }}>{connectorHealth.failed}</div><div style={{ fontSize: 10, color: DC.textMuted }}>FAILED</div></div>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {state.connectors.map((c) => {
              const stale = c.status === "connected" && c.lastSync && Date.now() - c.lastSync > 6 * 3600000;
              const color = c.status !== "connected" ? DC.critical : stale ? DC.warning : DC.positive;
              return <div key={c.name} title={c.name} className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />;
            })}
          </div>
        </DcCard>
      </div>

      {/* 9. AI ACTION PLAN */}
      <DcCard className="p-6">
        <div className="flex items-center justify-between mb-4">
          <DcLabel>AI Action Plan</DcLabel>
          {aiDone && <button onClick={generateAI} title="Regenerate" style={{ color: DC.textMuted }}><RefreshCw size={14} /></button>}
        </div>
        {!aiOpen && !aiDone && (
          <div className="flex items-center justify-between flex-wrap gap-4">
            <p style={{ fontSize: 12.5, color: DC.textDim, maxWidth: 420 }}>Run the AI analysis to get a ranked action plan with real compliance and risk impact for each fix.</p>
            <PrimaryButton onClick={generateAI}>Generate Action Plan</PrimaryButton>
          </div>
        )}
        {aiOpen && !aiDone && (
          <div className="py-6">
            <div className="flex justify-center mb-5"><Loader2 size={30} color={DC.primary} className="animate-spin" /></div>
            <StageChecklist stages={STAGES_AI} currentIndex={aiStage} />
          </div>
        )}
        {aiDone && aiTotals && (
          <div>
            <div className="grid grid-cols-4 gap-4 mb-5 pb-5" style={{ borderBottom: `1px solid ${DC.border}` }}>
              <div><div style={{ fontFamily: F.display, fontWeight: 800, fontSize: 22, color: DC.positive }}>+{Math.round(aiTotals.scoreGain)}</div><div style={{ fontSize: 10, color: DC.textMuted }}>POTENTIAL SCORE GAIN</div></div>
              <div><div style={{ fontFamily: F.display, fontWeight: 800, fontSize: 22, color: DC.critical }}>−{Math.round(aiTotals.riskReduction)}%</div><div style={{ fontSize: 10, color: DC.textMuted }}>RISK REDUCTION</div></div>
              <div><div style={{ fontFamily: F.display, fontWeight: 800, fontSize: 22, color: DC.text }}>{aiTotals.count}</div><div style={{ fontSize: 10, color: DC.textMuted }}>ESTIMATED ACTIONS</div></div>
              <div><div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 13, color: DC.text, marginTop: 4 }}>{aiTotals.top}</div><div style={{ fontSize: 10, color: DC.textMuted }}>TOP PRIORITY</div></div>
            </div>
            <div className="space-y-2">
              {aiRecommendations.slice(0, 5).map((r, i) => (
                <div key={r.title} className="flex items-center justify-between p-3 rounded-lg" style={{ background: DC.bg, border: `1px solid ${DC.border}` }}>
                  <div className="flex items-center gap-3"><span style={{ fontFamily: F.mono, fontSize: 11, color: DC.textMuted }}>{String(i + 1).padStart(2, "0")}</span><span style={{ fontSize: 13, fontWeight: 600, color: DC.text }}>{r.title}</span></div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span style={{ fontFamily: F.mono, fontSize: 12, color: DC.positive }}>{r.complianceDelta} SCORE</span>
                    <span style={{ fontFamily: F.mono, fontSize: 12, color: DC.critical }}>{r.riskDelta} RISK</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </DcCard>

      {/* Recent Activity — small sidebar, latest 5 only */}
      <DcCard className="p-6">
        <DcLabel style={{ marginBottom: 12 }}>Recent Activity</DcLabel>
        <div className="space-y-2.5">
          {state.activity.slice(0, 5).map((a) => {
            const meta = ACTIVITY_META[a.type] || { Icon: Info, color: DC.textDim };
            return (
              <div key={a.id} className="flex items-start gap-2.5">
                <div className="rounded-full p-1.5 mt-0.5" style={{ background: `${meta.color}1E` }}><meta.Icon size={11} color={meta.color} /></div>
                <div className="flex-1 min-w-0"><div style={{ fontSize: 12, color: DC.textDim, lineHeight: 1.4 }}>{a.text}</div><div style={{ fontSize: 10, color: DC.textMuted, marginTop: 1 }}>{timeAgo(a.ts)}</div></div>
              </div>
            );
          })}
        </div>
      </DcCard>

      {state.gapAnalysis && (
        <DcCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2"><ShieldAlert size={16} color={DC.primary} /><h3 style={{ fontFamily: F.display, fontWeight: 700, fontSize: 15, color: DC.text }}>Risk → Control → Frameworks → Gap</h3></div>
            <span style={{ fontFamily: F.mono, fontSize: 10.5, color: DC.textMuted }}>from your Gap Analysis · {timeAgo(state.gapAnalysis.generatedAt)}</span>
          </div>
          <RiskControlGapList items={state.gapAnalysis.riskControlGaps} />
        </DcCard>
      )}
    </div>
  );
}

/* ============================================================
   CONTROLS PAGE
   ============================================================ */
function ControlsPage() {
  const { state, actions, toast } = useStore();
  const [fw, setFw] = useState("ISO27001");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const rows = useMemo(() => {
    const base = CONTROLS_SAMPLE[fw] || [];
    return base
      .map(([code, title]) => ({ code, title, status: state.controls[fw]?.[code] ?? 1 }))
      .filter((r) => (statusFilter === "all" ? true : String(r.status) === statusFilter))
      .filter((r) => (search ? (r.title + r.code).toLowerCase().includes(search.toLowerCase()) : true));
  }, [fw, state.controls, search, statusFilter]);

  const cycleStatus = (code, current) => {
    const next = MATURITY_CYCLE[(MATURITY_CYCLE.indexOf(current) + 1) % MATURITY_CYCLE.length];
    actions.setControlStatus(fw, code, next);
    toast.success(`${fw} ${code} → ${MATURITY_META[next].label}`);
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex gap-2">
          {FRAMEWORKS.map((f) => (
            <button key={f.code} onClick={() => setFw(f.code)} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ background: fw === f.code ? C.accentSoft : C.surface2, color: fw === f.code ? C.accent : C.muted, border: `1px solid ${fw === f.code ? C.accent : C.border}` }}>{f.code}</button>
          ))}
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search controls…" className="px-3 py-2 rounded-lg outline-none" style={{ background: C.surface2, border: `1px solid ${C.border}`, color: C.text, fontSize: 13 }} />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 rounded-lg outline-none" style={{ background: C.surface2, border: `1px solid ${C.border}`, color: C.text, fontSize: 13 }}>
            <option value="all">All maturity levels</option>
            {Object.entries(MATURITY_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <GhostButton icon={Download} style={{ padding: "8px 14px", fontSize: 13 }}>Export</GhostButton>
        </div>
      </div>

      {rows.length === 0 ? (
        <Card><EmptyState Icon={Filter} title="No controls match your filters" body="Try clearing the search box or switching the status filter." /></Card>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full" style={{ fontSize: 13.5 }}>
            <thead><tr style={{ borderBottom: `1px solid ${C.border}` }}>{["Code", "Control", "Maturity", ""].map((h) => <th key={h} className="text-left px-5 py-3" style={{ fontSize: 11, color: C.mutedDim, textTransform: "uppercase", letterSpacing: ".04em" }}>{h}</th>)}</tr></thead>
            <tbody>
              {rows.map(({ code, title, status }) => {
                const meta = MATURITY_META[status];
                return (
                  <tr key={code} style={{ borderBottom: `1px solid ${C.borderSoft}` }}>
                    <td className="px-5 py-3.5" style={{ fontFamily: F.mono, color: C.accent }}>{code}</td>
                    <td className="px-5 py-3.5">{title}</td>
                    <td className="px-5 py-3.5"><button onClick={() => cycleStatus(code, status)}><Badge color={meta.color} bg={meta.bg}><meta.Icon size={12} />{meta.label}</Badge></button></td>
                    <td className="px-5 py-3.5" style={{ color: C.mutedDim, fontSize: 11.5 }}>click to advance maturity</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

/* ============================================================
   ASSESSMENTS PAGE
   ============================================================ */
function AssessmentsPage() {
  const { state, actions } = useStore();
  const [active, setActive] = useState("ISO27001");
  const [saveState, setSaveState] = useState("saved"); // saved | saving
  const saveTimer = useRef(null);

  const rows = CONTROLS_SAMPLE[active] || [];
  const controlsMap = state.controls[active] || {};
  const answered = rows.filter(([code]) => controlsMap[code] && controlsMap[code] !== 1).length;
  const progress = rows.length ? Math.round((answered / rows.length) * 100) : 0;
  const score = frameworkScore(controlsMap);

  const answer = (code, status) => {
    actions.setControlStatus(active, code, status);
    setSaveState("saving");
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => setSaveState("saved"), 700);
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex gap-2">
          {FRAMEWORKS.map((f) => (
            <button key={f.code} onClick={() => setActive(f.code)} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ background: active === f.code ? C.accentSoft : C.surface2, color: active === f.code ? C.accent : C.muted, border: `1px solid ${active === f.code ? C.accent : C.border}` }}>{f.code}</button>
          ))}
        </div>
        <div className="flex items-center gap-2" style={{ fontSize: 12, color: C.mutedDim }}>
          {saveState === "saving" ? <><Loader2 size={13} className="animate-spin" /> Saving…</> : <><CheckCircle2 size={13} color={C.success} /> All changes saved</>}
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-5 mb-6">
        <Card className="p-5"><div style={{ fontFamily: F.mono, fontSize: 11, color: C.muted }}>PROGRESS</div><div style={{ fontFamily: F.display, fontWeight: 800, fontSize: 26, marginTop: 4 }}>{progress}%</div></Card>
        <Card className="p-5"><div style={{ fontFamily: F.mono, fontSize: 11, color: C.muted }}>COMPLIANCE</div><div style={{ fontFamily: F.display, fontWeight: 800, fontSize: 26, marginTop: 4, color: C.accent }}>{score}%</div></Card>
        <Card className="p-5"><div style={{ fontFamily: F.mono, fontSize: 11, color: C.muted }}>COVERAGE</div><div style={{ fontFamily: F.display, fontWeight: 800, fontSize: 26, marginTop: 4 }}>{answered}/{rows.length}</div></Card>
        <Card className="p-5"><div style={{ fontFamily: F.mono, fontSize: 11, color: C.muted }}>RISK LINKED</div><div style={{ fontFamily: F.display, fontWeight: 800, fontSize: 26, marginTop: 4, color: C.critical }}>{state.risks.filter((r) => r.framework === active && r.status !== "Resolved" && r.status !== "Mitigated").length}</div></Card>
      </div>

      <Card className="p-2">
        {rows.map(([code, title], i) => {
          const status = controlsMap[code] ?? 1;
          return (
            <div key={code} className="p-4 flex items-center justify-between gap-4 flex-wrap" style={{ borderBottom: i < rows.length - 1 ? `1px solid ${C.borderSoft}` : "none" }}>
              <div className="min-w-0">
                <div style={{ fontFamily: F.mono, fontSize: 11.5, color: C.accent, marginBottom: 2 }}>{code}</div>
                <div style={{ fontSize: 14 }}>{title}</div>
              </div>
              <div className="flex gap-1.5">
                {MATURITY_CYCLE.map((s) => {
                  const meta = MATURITY_META[s];
                  const isActive = status === s;
                  return (
                    <button key={s} onClick={() => answer(code, s)} className="px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5" style={{ background: isActive ? meta.bg : "transparent", color: isActive ? meta.color : C.mutedDim, border: `1px solid ${isActive ? meta.color : C.border}` }}>
                      <meta.Icon size={12} />{meta.short}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </Card>

      {progress === 100 && (
        <div className="mt-5 flex items-center gap-2.5 p-4 rounded-xl" style={{ background: C.successSoft, border: `1px solid rgba(52,211,153,.3)` }}>
          <CheckCircle2 size={17} color={C.success} /><span style={{ fontSize: 13.5, color: C.text }}>Assessment fully answered. Compliance score for {active} is now {score}%.</span>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   EVIDENCE (SOURCES) PAGE
   ============================================================ */
function ConnectorCard({ c, onConnect, onDisconnect }) {
  const { Icon } = c;
  const syncing = c.status === "syncing";
  return (
    <Card hover className="p-5 flex flex-col">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="rounded-xl flex items-center justify-center shrink-0" style={{ width: 40, height: 40, background: c.status === "connected" ? C.accentSoft : C.surface2, border: `1px solid ${c.status === "connected" ? "rgba(140,124,250,.35)" : C.border}` }}>
            <Icon size={18} color={c.status === "connected" ? C.accent : C.muted} />
          </div>
          <div><div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 14 }}>{c.name}</div><div style={{ fontSize: 11, color: C.mutedDim, fontFamily: F.mono, marginTop: 1 }}>{c.category}</div></div>
        </div>
        {c.status === "connected" && <span className="flex items-center gap-1.5 shrink-0" style={{ fontSize: 11, color: C.success }}><span className="w-1.5 h-1.5 rounded-full" style={{ background: C.success }} /> Connected</span>}
        {c.status === "not_connected" && <span className="flex items-center gap-1.5 shrink-0" style={{ fontSize: 11, color: C.mutedDim }}><span className="w-1.5 h-1.5 rounded-full" style={{ background: C.mutedDim }} /> Not connected</span>}
        {syncing && <span className="flex items-center gap-1.5 shrink-0" style={{ fontSize: 11, color: C.accent2 }}><span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: C.accent2 }} /> Syncing</span>}
      </div>

      <p style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.55, marginBottom: 16, flex: 1 }}>{c.pulls}</p>

      {syncing ? (
        <StageChecklist stages={STAGES_CONNECTOR} currentIndex={c.stageIndex} compact />
      ) : c.status === "connected" ? (
        <div className="flex items-center justify-between">
          <div style={{ fontSize: 11.5, color: C.mutedDim }}><span style={{ color: C.textDim, fontFamily: F.mono }}>{c.evidence}</span> evidence items · synced {timeAgo(c.lastSync)}</div>
          <button onClick={() => onDisconnect(c.name)} title="Disconnect" style={{ color: C.mutedDim }}><RefreshCw size={15} /></button>
        </div>
      ) : (
        <GhostButton onClick={() => onConnect(c.name)} icon={Link2} style={{ padding: "8px 14px", fontSize: 12.5, width: "100%" }}>Connect</GhostButton>
      )}
    </Card>
  );
}

function RealGithubConnector() {
  const [token, setToken] = useState("");
  const [owner, setOwner] = useState("");
  const [repo, setRepo] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const connect = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/github-connector", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, owner, repo }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Connection failed");
      setResult(data);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6 mb-12" style={{ borderColor: C.accent }}>
      <div className="flex items-center gap-2 mb-1"><GitBranch size={16} color={C.accent} /><h3 style={{ fontFamily: F.display, fontWeight: 700, fontSize: 16 }}>Connect a Real System — GitHub</h3></div>
      <p style={{ fontSize: 12.5, color: C.muted, marginBottom: 18 }}>
        Every other card above is a simulated demo. This one is a real, live connection to the GitHub REST API --
        it reads your token, your repo's actual branch protection rule, and its actual Dependabot status. Nothing here is faked.
      </p>

      <form onSubmit={connect} className="grid md:grid-cols-4 gap-3 items-end">
        <div>
          <label style={{ fontSize: 11, color: C.mutedDim, display: "block", marginBottom: 4 }}>Personal Access Token</label>
          <input type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="ghp_…" required className="w-full px-3 py-2 rounded-lg outline-none" style={{ background: C.surface2, border: `1px solid ${C.border}`, color: C.text, fontSize: 13 }} />
        </div>
        <div>
          <label style={{ fontSize: 11, color: C.mutedDim, display: "block", marginBottom: 4 }}>Owner / org</label>
          <input value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="e.g. octocat" required className="w-full px-3 py-2 rounded-lg outline-none" style={{ background: C.surface2, border: `1px solid ${C.border}`, color: C.text, fontSize: 13 }} />
        </div>
        <div>
          <label style={{ fontSize: 11, color: C.mutedDim, display: "block", marginBottom: 4 }}>Repository</label>
          <input value={repo} onChange={(e) => setRepo(e.target.value)} placeholder="e.g. hello-world" required className="w-full px-3 py-2 rounded-lg outline-none" style={{ background: C.surface2, border: `1px solid ${C.border}`, color: C.text, fontSize: 13 }} />
        </div>
        <PrimaryButton type="submit" disabled={loading} style={{ padding: "9px 16px", fontSize: 13 }}>{loading ? "Checking…" : "Connect & check"}</PrimaryButton>
      </form>
      <p style={{ fontSize: 10.5, color: C.mutedDim, marginTop: 8 }}>Your token is sent once to check these two items, then discarded -- it's never saved anywhere.</p>

      {error && (
        <div className="mt-4 flex items-center gap-2 p-3 rounded-lg" style={{ background: C.criticalSoft, color: C.critical, fontSize: 13 }}>
          <AlertTriangle size={15} />{error}
        </div>
      )}

      {result && (
        <div className="mt-5 p-4 rounded-xl" style={{ background: C.surface2, border: `1px solid ${C.border}` }}>
          <div className="flex items-center justify-between mb-3" style={{ fontSize: 12, color: C.mutedDim, fontFamily: F.mono }}>
            <span>{result.repo} · {result.visibility} · default branch "{result.defaultBranch}"</span>
            <span>authenticated as {result.connectedAs}</span>
          </div>
          <div className="space-y-2">
            {result.checks.map((c) => (
              <div key={c.name} className="flex items-center gap-2.5">
                {c.enabled === true ? <CheckCircle2 size={16} color={C.success} /> : c.enabled === false ? <XCircle size={16} color={C.critical} /> : <MinusCircle size={16} color={C.warning} />}
                <div><span style={{ fontSize: 13, fontWeight: 600 }}>{c.name}</span><span style={{ fontSize: 12.5, color: C.muted, marginLeft: 8 }}>{c.detail}</span></div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

const CONTROL_RESULT_META = {
  pass: { label: "PASS", color: C.success, bg: C.successSoft, Icon: CheckCircle2 },
  fail: { label: "FAIL", color: C.critical, bg: C.criticalSoft, Icon: XCircle },
  partial: { label: "PARTIAL", color: C.warning, bg: C.warningSoft, Icon: MinusCircle },
  requires_review: { label: "NEEDS REVIEW", color: C.warning, bg: C.warningSoft, Icon: AlertTriangle },
  not_assessed: { label: "NOT ASSESSED", color: C.mutedDim, bg: C.surface2, Icon: Circle },
};

function EvidencePage() {
  const { state, actions } = useStore();
  const [category, setCategory] = useState("All");
  const fileInputRef = useRef(null);
  const extractInputRef = useRef(null);
  const [extracting, setExtracting] = useState(false);
  const [extractResult, setExtractResult] = useState(null);
  const [extractError, setExtractError] = useState(null);

  const handleRealExtraction = async (file) => {
    if (!file) return;
    setExtracting(true);
    setExtractError(null);
    setExtractResult(null);
    try {
      const fileBase64 = await fileToBase64(file);
      const res = await fetch("/api/evidence-extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name, fileMimeType: file.type, fileBase64 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Extraction failed");
      setExtractResult(data);
    } catch (err) {
      setExtractError(err.message || String(err));
    } finally {
      setExtracting(false);
    }
  };

  const connectedCount = state.connectors.filter((c) => c.status === "connected").length;
  const autoEvidence = state.connectors.reduce((sum, c) => sum + c.evidence, 0);
  const manualEvidence = state.evidence.filter((e) => e.status === "done").length;
  const filtered = category === "All" ? state.connectors : state.connectors.filter((c) => c.category === category);

  const linkCandidates = useMemo(() => {
    const out = [];
    Object.entries(state.controls).forEach(([fw, controls]) => {
      Object.entries(controls).forEach(([code, status]) => { if (status === 1) out.push({ framework: fw, code }); });
    });
    return out;
  }, [state.controls]);

  const handleFiles = (fileList) => {
    const files = Array.from(fileList || []);
    if (files.length === 0) {
      // simulated pick when no real file dialog result (still a real interaction)
      const name = ["Third_Party_Risk_Assessment.pdf", "Encryption_Standard_v2.docx", "Change_Management_Procedure.pdf"][Math.floor(Math.random() * 3)];
      const link = linkCandidates[Math.floor(Math.random() * linkCandidates.length)];
      actions.uploadEvidence(name, `${(Math.random() * 2 + 0.2).toFixed(1)} MB`, link, PEOPLE[Math.floor(Math.random() * PEOPLE.length)].name);
      return;
    }
    files.forEach((f) => {
      const link = linkCandidates[Math.floor(Math.random() * linkCandidates.length)];
      actions.uploadEvidence(f.name, `${(f.size / 1024).toFixed(0)} KB`, link, PEOPLE[Math.floor(Math.random() * PEOPLE.length)].name);
    });
  };

  return (
    <div className="p-8">
      <div className="grid md:grid-cols-3 gap-5 mb-8">
        <Card className="p-5"><div style={{ fontFamily: F.mono, fontSize: 11, color: C.muted }}>SOURCES CONNECTED</div><div style={{ fontFamily: F.display, fontWeight: 800, fontSize: 28, marginTop: 4 }}>{connectedCount} <span style={{ fontSize: 15, color: C.mutedDim, fontWeight: 600 }}>/ {state.connectors.length}</span></div></Card>
        <Card className="p-5"><div style={{ fontFamily: F.mono, fontSize: 11, color: C.muted }}>AUTO-COLLECTED EVIDENCE</div><div style={{ fontFamily: F.display, fontWeight: 800, fontSize: 28, marginTop: 4, color: C.success }}>{autoEvidence}</div></Card>
        <Card className="p-5"><div style={{ fontFamily: F.mono, fontSize: 11, color: C.muted }}>MANUAL FILES</div><div style={{ fontFamily: F.display, fontWeight: 800, fontSize: 28, marginTop: 4 }}>{manualEvidence}</div></Card>
      </div>

      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2"><Cpu size={16} color={C.accent} /><h3 style={{ fontFamily: F.display, fontWeight: 700, fontSize: 16 }}>Automatic Sources</h3></div>
          <p style={{ fontSize: 12.5, color: C.muted, marginTop: 3 }}>Connect once. WATHAQ pulls fresh evidence on a schedule -- no re-uploading, ever.</p>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {CONNECTOR_CATEGORIES.map((cat) => (
            <button key={cat} onClick={() => setCategory(cat)} className="px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: category === cat ? C.accentSoft : "transparent", color: category === cat ? C.accent : C.mutedDim, border: `1px solid ${category === cat ? C.accent : C.border}` }}>{cat}</button>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4 mb-12">
        {filtered.map((c) => <ConnectorCard key={c.name} c={c} onConnect={actions.startConnectorSync} onDisconnect={actions.disconnectConnector} />)}
      </div>

      <RealGithubConnector />

      <div className="mb-4">
        <div className="flex items-center gap-2"><FolderOpen size={16} color={C.accent2} /><h3 style={{ fontFamily: F.display, fontWeight: 700, fontSize: 16 }}>Manual Sources</h3></div>
        <p style={{ fontSize: 12.5, color: C.muted, marginTop: 3 }}>For anything without a connector -- policies, contracts, sign-off records. AI reads and links each file to the controls it satisfies.</p>
      </div>

      <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }} />
      <button onClick={() => fileInputRef.current?.click()} className="w-full flex flex-col items-center justify-center gap-2.5 py-10 rounded-xl mb-5" style={{ border: `1.5px dashed ${C.border}`, background: C.surface2 }}>
        <Upload size={22} color={C.accent2} />
        <div style={{ fontFamily: F.display, fontWeight: 600, fontSize: 13.5 }}>Click to upload, or drag files here</div>
        <div style={{ fontSize: 11.5, color: C.mutedDim }}>PDF, DOCX, XLSX, CSV, screenshots -- up to 25MB</div>
      </button>

      {state.evidence.length === 0 ? (
        <Card><EmptyState Icon={FolderOpen} title="No evidence yet" body="Upload your first policy or artifact to get started." /></Card>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full" style={{ fontSize: 13.5 }}>
            <thead><tr style={{ borderBottom: `1px solid ${C.border}` }}>{["File", "Linked control", "Size", "Uploaded", ""].map((h) => <th key={h} className="text-left px-5 py-3" style={{ fontSize: 11, color: C.mutedDim, textTransform: "uppercase", letterSpacing: ".04em" }}>{h}</th>)}</tr></thead>
            <tbody>
              {state.evidence.map((f) => (
                <tr key={f.id} style={{ borderBottom: `1px solid ${C.borderSoft}` }}>
                  <td className="px-5 py-3.5"><div className="flex items-center gap-2.5"><FileText size={15} color={C.muted} /><span>{f.name}</span></div></td>
                  <td className="px-5 py-4">
                    {f.status === "processing" ? <StageChecklist stages={STAGES_EVIDENCE} currentIndex={f.stageIndex} compact /> : <span style={{ fontFamily: F.mono, color: C.accent, fontSize: 12.5 }}>{f.control}</span>}
                  </td>
                  <td className="px-5 py-3.5" style={{ color: C.muted }}>{f.size}</td>
                  <td className="px-5 py-3.5" style={{ color: C.muted }}>{f.status === "processing" ? "uploading…" : timeAgo(f.uploaded)}</td>
                  <td className="px-5 py-3.5">{f.status === "done" && <MoreHorizontal size={16} color={C.mutedDim} />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <div className="mt-12 mb-4">
        <div className="flex items-center gap-2"><Cpu size={16} color={C.accent} /><h3 style={{ fontFamily: F.display, fontWeight: 700, fontSize: 16 }}>Real-Time Evidence Extraction</h3></div>
        <p style={{ fontSize: 12.5, color: C.muted, marginTop: 3 }}>Upload a real PDF or DOCX policy. AI extracts individual, source-cited statements -- a deterministic rules engine, not the AI, decides PASS/FAIL against the control library below.</p>
      </div>

      <input ref={extractInputRef} type="file" accept=".pdf,.docx" className="hidden" onChange={(e) => { handleRealExtraction(e.target.files?.[0]); e.target.value = ""; }} />
      <button onClick={() => extractInputRef.current?.click()} disabled={extracting} className="w-full flex flex-col items-center justify-center gap-2.5 py-10 rounded-xl mb-5" style={{ border: `1.5px dashed ${C.accent}`, background: C.accentSoft, opacity: extracting ? 0.7 : 1 }}>
        {extracting ? <Loader2 size={22} color={C.accent} className="animate-spin" /> : <Upload size={22} color={C.accent} />}
        <div style={{ fontFamily: F.display, fontWeight: 600, fontSize: 13.5 }}>{extracting ? "Reading document, extracting evidence…" : "Click to upload a real PDF or DOCX"}</div>
        <div style={{ fontSize: 11.5, color: C.mutedDim }}>Runs the actual extraction + rules engine, live</div>
      </button>

      {extractError && (
        <Card className="p-5 mb-5" style={{ borderColor: C.critical }}>
          <div className="flex items-center gap-2" style={{ color: C.critical, fontSize: 13 }}><AlertTriangle size={16} />{extractError}</div>
        </Card>
      )}

      {extractResult && (
        <>
          <Card className="overflow-hidden mb-5">
            <div className="px-5 py-3.5" style={{ borderBottom: `1px solid ${C.border}`, fontSize: 12, color: C.mutedDim, fontFamily: F.mono }}>
              {extractResult.fileName} — {extractResult.evidenceCount} evidence object{extractResult.evidenceCount === 1 ? "" : "s"} extracted
            </div>
            <table className="w-full" style={{ fontSize: 13 }}>
              <thead><tr style={{ borderBottom: `1px solid ${C.border}` }}>{["Source", "Subject.Attribute", "Extracted → Normalized"].map((h) => <th key={h} className="text-left px-5 py-2.5" style={{ fontSize: 10.5, color: C.mutedDim, textTransform: "uppercase", letterSpacing: ".04em" }}>{h}</th>)}</tr></thead>
              <tbody>
                {extractResult.evidence.map((e, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${C.borderSoft}` }}>
                    <td className="px-5 py-2.5" style={{ fontFamily: F.mono, color: C.accent, fontSize: 12 }}>{e.source_location}</td>
                    <td className="px-5 py-2.5" style={{ fontFamily: F.mono, fontSize: 12 }}>{e.subject}.{e.attribute}</td>
                    <td className="px-5 py-2.5" style={{ color: C.muted }}>"{e.extracted_value}" → {e.requiresReview ? <span style={{ color: C.warning }}>needs review</span> : e.normalized_value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <Card className="overflow-hidden">
            <div className="px-5 py-3.5" style={{ borderBottom: `1px solid ${C.border}`, fontSize: 12, color: C.mutedDim, fontFamily: F.mono }}>RULES ENGINE VERDICT (deterministic)</div>
            <table className="w-full" style={{ fontSize: 13 }}>
              <thead><tr style={{ borderBottom: `1px solid ${C.border}` }}>{["Control", "Result", "Reasoning"].map((h) => <th key={h} className="text-left px-5 py-2.5" style={{ fontSize: 10.5, color: C.mutedDim, textTransform: "uppercase", letterSpacing: ".04em" }}>{h}</th>)}</tr></thead>
              <tbody>
                {extractResult.controlResults.map((c) => {
                  const meta = CONTROL_RESULT_META[c.overall] || CONTROL_RESULT_META.not_assessed;
                  return (
                    <tr key={c.name} style={{ borderBottom: `1px solid ${C.borderSoft}` }}>
                      <td className="px-5 py-3">{c.name}</td>
                      <td className="px-5 py-3"><Badge color={meta.color} bg={meta.bg}><meta.Icon size={12} />{meta.label}</Badge></td>
                      <td className="px-5 py-3" style={{ color: C.muted, fontSize: 12.5 }}>{c.verdicts.map((v) => v.reasoning).join(" ")}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </div>
  );
}

/* ============================================================
   RISK REGISTER PAGE
   ============================================================ */
function RiskRegisterPage() {
  const { state, actions } = useStore();
  const [tab, setTab] = useState("open");
  const [confirmId, setConfirmId] = useState(null);

  const rows = useMemo(() => {
    if (tab === "all") return state.risks;
    if (tab === "open") return state.risks.filter((r) => r.status === "Open" || r.status === "In progress");
    if (tab === "resolved") return state.risks.filter((r) => r.status === "Resolved" || r.status === "Mitigated");
    return state.risks;
  }, [state.risks, tab]);

  const target = state.risks.find((r) => r.id === confirmId);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex gap-2">
          {[["open", "Open"], ["resolved", "Resolved"], ["all", "All"]].map(([k, label]) => (
            <button key={k} onClick={() => setTab(k)} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ background: tab === k ? C.accentSoft : C.surface2, color: tab === k ? C.accent : C.muted, border: `1px solid ${tab === k ? C.accent : C.border}` }}>{label}</button>
          ))}
        </div>
        <PrimaryButton icon={Plus} style={{ padding: "10px 16px", fontSize: 13.5 }}>Add risk</PrimaryButton>
      </div>

      {rows.length === 0 ? (
        <Card><EmptyState Icon={ShieldCheck} title={tab === "resolved" ? "Nothing resolved yet" : "No risks in this view"} body="Risks appear here as they're identified from missing controls, incidents, or manual entries." /></Card>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full" style={{ fontSize: 13.5 }}>
            <thead><tr style={{ borderBottom: `1px solid ${C.border}` }}>{["Control", "Framework", "Likelihood", "Impact", "Score", "Owner", "Status", ""].map((h) => <th key={h} className="text-left px-5 py-3" style={{ fontSize: 11, color: C.mutedDim, textTransform: "uppercase", letterSpacing: ".04em" }}>{h}</th>)}</tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} style={{ borderBottom: `1px solid ${C.borderSoft}` }}>
                  <td className="px-5 py-3.5">{r.title}<div style={{ fontFamily: F.mono, fontSize: 11, color: C.mutedDim }}>{r.code}</div></td>
                  <td className="px-5 py-3.5" style={{ fontFamily: F.mono, color: C.muted, fontSize: 12.5 }}>{r.framework}</td>
                  <td className="px-5 py-3.5" style={{ color: C.muted }}>{r.likelihood}/5</td>
                  <td className="px-5 py-3.5" style={{ color: C.muted }}>{r.impact}/5</td>
                  <td className="px-5 py-3.5"><Badge color={LEVEL_META[r.level]} bg={`${LEVEL_META[r.level]}22`}>{r.score}</Badge></td>
                  <td className="px-5 py-3.5" style={{ color: C.muted }}>{r.owner}</td>
                  <td className="px-5 py-3.5" style={{ color: C.muted }}>{r.status}</td>
                  <td className="px-5 py-3.5">
                    {r.status !== "Resolved" && (
                      <div className="flex items-center gap-3">
                        <button onClick={() => setConfirmId(r.id)} title="Resolve" style={{ color: C.success }}><CheckCircle2 size={16} /></button>
                        <button onClick={() => actions.deleteRisk(r.id)} title="Remove" style={{ color: C.mutedDim }}><Trash2 size={15} /></button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <ConfirmDialog
        open={!!confirmId}
        title="Resolve this risk?"
        body={target ? `Mark "${target.title}" (${target.code}) as resolved. You can undo this from the confirmation toast.` : ""}
        confirmLabel="Mark resolved"
        onConfirm={() => { actions.resolveRisk(confirmId); setConfirmId(null); }}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  );
}

/* ============================================================
   REPORTS PAGE
   ============================================================ */
function ReportCard({ report }) {
  const { state } = useStore();
  const { perFramework, unified } = useCompliance();
  const riskIndex = useRiskIndex();
  const [running, setRunning] = useState(false);
  const [stage, setStage] = useState(-1);
  const [ready, setReady] = useState(false);

  const generate = () => {
    setRunning(true); setReady(false); setStage(0);
    STAGES_REPORT.forEach((_, i) => setTimeout(() => setStage(i), i * 450));
    setTimeout(() => { setRunning(false); setReady(true); }, STAGES_REPORT.length * 450 + 200);
  };

  const download = () => {
    let content = "";
    if (report.key === "exec") {
      content = `EXECUTIVE COMPLIANCE SUMMARY\n${state.org.name}\nGenerated ${new Date().toLocaleString()}\n\nUnified Compliance Score: ${unified}%\nRisk Score: ${riskIndex}/100\n\nPer framework:\n${perFramework.map((f) => `- ${f.name}: ${f.score}%`).join("\n")}\n\nOpen risks: ${state.risks.filter((r) => r.status === "Open" || r.status === "In progress").length}\n`;
    } else if (report.key === "risk") {
      content = "Control,Framework,Likelihood,Impact,Score,Owner,Status\n" + state.risks.map((r) => `${r.code},${r.framework},${r.likelihood},${r.impact},${r.score},${r.owner},${r.status}`).join("\n");
    } else {
      const fwCode = report.key === "iso" ? "ISO27001" : "NCAECC";
      content = "Code,Title,Maturity\n" + (CONTROLS_SAMPLE[fwCode] || []).map(([code, title]) => `${code},"${title}",${MATURITY_META[state.controls[fwCode]?.[code] ?? 1].short}`).join("\n");
    }
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${report.name.replace(/\s+/g, "_")}.${report.format.toLowerCase()}`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <Card hover className="p-6 flex flex-col justify-between">
      <div>
        <div className="flex items-center gap-2 mb-2"><FileText size={16} color={C.accent} /><span style={{ fontFamily: F.display, fontWeight: 700, fontSize: 15 }}>{report.name}</span></div>
        <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.55, maxWidth: 340, marginBottom: 10 }}>{report.desc}</p>
        <Badge color={C.muted} bg="rgba(255,255,255,.05)">{report.format}</Badge>
      </div>
      <div className="mt-5">
        {running && <StageChecklist stages={STAGES_REPORT} currentIndex={stage} />}
        {!running && !ready && <GhostButton onClick={generate} icon={PlayCircle} style={{ padding: "8px 14px", fontSize: 12.5 }}>Generate</GhostButton>}
        {!running && ready && (
          <div className="flex items-center gap-3">
            <PrimaryButton onClick={download} icon={Download} style={{ padding: "8px 14px", fontSize: 12.5 }}>Download</PrimaryButton>
            <button onClick={generate} style={{ color: C.mutedDim, fontSize: 12 }}>Regenerate</button>
          </div>
        )}
      </div>
    </Card>
  );
}
function ReportsPage() {
  return (
    <div className="p-8 grid md:grid-cols-2 gap-5">
      {REPORTS_META.map((r) => <ReportCard key={r.key} report={r} />)}
    </div>
  );
}

/* ============================================================
   ROOT APP
   ============================================================ */
function AppShell() {
  const { state } = useStore();
  const [page, setPage] = useState("dashboard");
  const loading = usePageLoading(page);

  const PAGES = {
    dashboard: { comp: DashboardPage, title: "Executive Dashboard", sub: "Everything a board needs to know about your compliance & risk posture.", skeleton: "cards" },
    controls: { comp: ControlsPage, title: "Controls", sub: "Full control catalog across every framework you've enabled.", skeleton: "table" },
    assessments: { comp: AssessmentsPage, title: "Assessments", sub: "Answer once, watch compliance and risk move immediately.", skeleton: "table" },
    evidence: { comp: EvidencePage, title: "Evidence Sources", sub: "Automatic connectors first, manual uploads for everything else.", skeleton: "cards" },
    risk: { comp: RiskRegisterPage, title: "Risk Register", sub: "Every open risk, ranked and owned.", skeleton: "table" },
    reports: { comp: ReportsPage, title: "Reports", sub: "Board-ready and audit-ready exports.", skeleton: "cards" },
  };
  const Active = PAGES[page].comp;

  return (
    <div className="flex" style={{ background: C.bg, color: C.text, fontFamily: F.body, minHeight: "100vh" }}>
      <Sidebar page={page} setPage={setPage} orgName={state.org.name} />
      <div className="flex-1 min-w-0">
        <Topbar title={PAGES[page].title} subtitle={PAGES[page].sub} onExit={() => window.location.reload()} />
        {loading ? <PageSkeleton variant={PAGES[page].skeleton} /> : <Active />}
      </div>
      <ToastContainer />
    </div>
  );
}

export default function App() {
  useFonts();
  const [stage, setStage] = useState("landing");
  return (
    <StoreProvider>
      <InnerApp stage={stage} setStage={setStage} />
    </StoreProvider>
  );
}

function InnerApp({ stage, setStage }) {
  const { dispatch } = useStore();
  if (stage === "landing") return <Landing onStart={() => setStage("onboarding")} onDemo={() => setStage("app")} />;
  if (stage === "onboarding") {
    return (
      <Onboarding
        onExit={() => setStage("landing")}
        onComplete={(org, gapAnalysisResult) => {
          dispatch({ type: "INIT_ORG", org: { name: org.name || "Meridian Financial Group", size: org.size, industry: org.industry } });
          if (gapAnalysisResult) dispatch({ type: "SET_GAP_ANALYSIS", data: gapAnalysisResult });
          setStage("app");
        }}
      />
    );
  }
  return <AppShell />;
}
