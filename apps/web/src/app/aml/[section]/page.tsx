import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AmlTabId, AmlWorkspace } from "@/components/aml/AmlWorkspace";

const sectionTabs: Record<string, { tab: AmlTabId; title: string; description: string }> = {
  transactions: {
    tab: "transactions",
    title: "Transaction Monitoring",
    description: "Search, filter, evaluate, and review AML transaction evidence.",
  },
  microtransactions: {
    tab: "microtransactions",
    title: "Microtransaction Intelligence",
    description: "Investigate structuring, fan-in, fan-out, rapid pass-through, and mobile-money consolidation clusters.",
  },
  kyc: {
    tab: "kyc",
    title: "Customer KYC",
    description: "Review customer risk, due-diligence checks, and enhanced due-diligence controls.",
  },
  kyb: {
    tab: "kyb",
    title: "Business KYB",
    description: "Review business ownership, UBO evidence, and KYB risk indicators.",
  },
  screening: {
    tab: "screening",
    title: "Screening",
    description: "Review sanctions, PEP, adverse-media, identity, company, and provider-independent screening results.",
  },
  rules: {
    tab: "rules",
    title: "Rules and Scenarios",
    description: "Create, test, approve, activate, and govern AML rules and scenario versions.",
  },
  alerts: {
    tab: "alerts",
    title: "AML Alerts",
    description: "Assign, escalate, close, and convert AML alerts into investigations.",
  },
  investigations: {
    tab: "investigations",
    title: "AML Investigations",
    description: "Review case hypotheses, evidence, source-of-funds analysis, and MLRO review state.",
  },
  sar: {
    tab: "sar",
    title: "SAR Workspace",
    description: "Prepare and review SAR drafts with human approval and tipping-off controls.",
  },
  audit: {
    tab: "audit",
    title: "Audit and Governance",
    description: "Inspect immutable AML audit actions, rule approvals, overrides, and evidence access.",
  },
  training: {
    tab: "training",
    title: "Regulatory Training",
    description: "Review FINRA course catalog mappings to African Guard AML and governance controls.",
  },
  research: {
    tab: "research",
    title: "Research Lab",
    description: "Review fraud-detection research, implemented controls, model limitations, and external repository mappings.",
  },
};

type SectionPageProps = {
  params: Promise<{ section: string }>;
};

export function generateStaticParams() {
  return Object.keys(sectionTabs).map((section) => ({ section }));
}

export async function generateMetadata({ params }: SectionPageProps): Promise<Metadata> {
  const { section } = await params;
  const item = sectionTabs[section];
  if (!item) return { title: "AML | African Guard" };
  return {
    title: `${item.title} | African Guard AML`,
    description: item.description,
  };
}

export default async function AmlSectionPage({ params }: SectionPageProps) {
  const { section } = await params;
  const item = sectionTabs[section];
  if (!item) notFound();
  return <AmlWorkspace initialTab={item.tab} />;
}
