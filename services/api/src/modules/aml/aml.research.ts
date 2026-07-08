import {
  FinraCourse,
  RepositoryIntegrationReview,
  ResearchImplementationModule,
  ResearchPaperReview,
} from "./aml.types";

const categorySummary: Record<string, string> = {
  AML: "AML control training mapped to suspicious-activity escalation, customer due diligence, sanctions, SAR confidentiality, and financial-crime red flags.",
  Supervision: "Supervisory obligations mapped to alert review, escalation, documented oversight, and four-eyes control evidence.",
  Product: "Product-risk course mapped to suitability, new-product controls, product abuse red flags, and investor-protection monitoring.",
  "Firm Operations": "Firm operations course mapped to books and records, data protection, cybersecurity, and evidence-retention controls.",
  "Compliance and Ethics": "Conduct and ethics course mapped to conflicts, complaints, outside activity, gifts, escalation, and written rationale controls.",
  "Market Integrity": "Market-integrity course mapped to trading red flags, pricing abuse, manipulation indicators, and surveillance escalation.",
  "Business Conduct": "Business-conduct course mapped to communications review, Reg BI, privacy, off-channel evidence, and customer-treatment controls.",
  Senior: "Senior and vulnerable-adult course mapped to exploitation red flags, trusted-contact controls, and hold/escalation workflows.",
  Institutional: "Institutional course mapped to due-diligence evidence, private-placement risks, and institutional suspicious-activity review.",
  "Annual Reviews": "Annual review course mapped to recurring compliance attestations, AML trends, supervisory priorities, and governance reporting.",
  "Securities Regulations": "Regulatory fundamentals course mapped to policy provenance, regulatory accountability, and audit-ready evidence.",
  "Prohibited Practices and Fraud": "Fraud course mapped to insider trading, cybercrime, account abuse, manipulation, and suspicious-activity escalation.",
};

const categoryFrom = (category: string) => {
  if (category.includes("AML")) return "AML";
  if (category.includes("Supervision")) return "Supervision";
  if (category.includes("Product")) return "Product";
  if (category.includes("Firm Operations")) return "Firm Operations";
  if (category.includes("Compliance")) return "Compliance and Ethics";
  if (category.includes("Business Conduct")) return "Business Conduct";
  if (category.includes("Senior")) return "Senior";
  if (category.includes("Annual Reviews")) return "Annual Reviews";
  if (category.includes("Prohibited")) return "Prohibited Practices and Fraud";
  return category;
};

const controlMappingsFor = (category: string, title: string) => {
  const normalized = `${category} ${title}`.toLowerCase();
  const mappings = new Set<string>();
  if (normalized.includes("aml") || normalized.includes("money laundering") || normalized.includes("sar")) {
    mappings.add("AML alert triage");
    mappings.add("CDD/KYC evidence");
    mappings.add("SAR draft governance");
  }
  if (normalized.includes("sanction") || normalized.includes("anti-bribery") || normalized.includes("fcpa")) {
    mappings.add("Sanctions and anti-bribery screening");
  }
  if (normalized.includes("books") || normalized.includes("record") || normalized.includes("communications")) {
    mappings.add("Audit and records retention");
  }
  if (normalized.includes("supervis")) mappings.add("Four-eyes supervisory review");
  if (normalized.includes("cyber") || normalized.includes("identity") || normalized.includes("privacy")) {
    mappings.add("Customer data protection");
    mappings.add("Account testing signals");
  }
  if (normalized.includes("senior") || normalized.includes("vulnerable")) mappings.add("Vulnerable-customer escalation");
  if (normalized.includes("fraud") || normalized.includes("insider") || normalized.includes("market manipulation")) {
    mappings.add("Fraud-event scoring");
    mappings.add("Investigation case evidence");
  }
  if (normalized.includes("reg bi") || normalized.includes("suitability")) mappings.add("Conduct-risk governance");
  if (mappings.size === 0) mappings.add("Compliance training governance");
  return [...mappings];
};

const course = (
  no: number,
  title: string,
  courseId: string,
  category: string,
  durationMinutes: number,
  ceCategory: string,
  ceCredit: number,
  cfpProgramId: string,
): FinraCourse => {
  const normalizedCategory = categoryFrom(category);
  return {
    no,
    title,
    courseId,
    contentType: "WBT",
    category,
    durationMinutes,
    ceCategory,
    ceCredit,
    cfpProgramId,
    active: true,
    controlMappings: controlMappingsFor(category, title),
    summary: categorySummary[normalizedCategory] ?? "Compliance course mapped to African Guard policy, evidence, and audit controls.",
  };
};

export const finraCourses: FinraCourse[] = [
  course(1, "Foreign Corrupt Practices Act: Avoiding Improper Payments", "ELC110", "AML", 30, "CFP CE", 0.5, "338610"),
  course(2, "Supervision: Obligations for Broker-Dealers with Institutional Customers", "ELC116", "Supervision", 60, "None", 0, "N/A"),
  course(3, "Fixed Income Suitability: Retail Sales Practices", "ELC125", "Product", 60, "CFP CE", 1, "237226"),
  course(4, "Retail Branch Office Supervision: Understanding Supervisory Responsibilities", "ELC127", "Supervision", 75, "None", 0, "N/A"),
  course(5, "Books and Records", "ELC131", "Firm Operations", 60, "CFP CE", 1, "237211"),
  course(6, "Outside Business Activities and Private Securities Transactions", "ELC132", "Compliance and Ethics", 60, "CFP CE", 1, "237235"),
  course(7, "Debt Mark-ups and Disclosure Requirements", "ELC143", "Market Integrity", 30, "CFP CE", 0.5, "237221"),
  course(8, "Customer Information Protection for Registered Representatives", "ELC155", "Firm Operations", 60, "CFP CE", 1, "237218"),
  course(9, "Customer Information Protection for Supervisors", "ELC156", "Firm Operations", 60, "None", 0, "N/A"),
  course(10, "Insider Trading", "ELC157", "Prohibited Practices and Fraud", 60, "CFP CE", 1, "237232"),
  course(11, "Gifts: Registered Representative Responsibilities", "ELC165", "Compliance and Ethics", 30, "CFP CE", 0.5, "237229"),
  course(12, "Gifts: Understanding Supervisory Responsibilities", "ELC166", "Compliance and Ethics", 30, "None", 0, "N/A"),
  course(13, "Understanding Retail Structured Products", "ELC174", "Product", 30, "CFP CE", 0.5, "237246"),
  course(14, "Exchange-Traded Products Understanding Leveraged and Inverse ETPs", "ELC179", "Product", 30, "CFP CE", 0.5, "237225"),
  course(15, "Understanding Commodity Futures-Linked Securities", "ELC181", "Product", 30, "CFP CE", 0.5, "237245"),
  course(16, "Outside Business Activities and Private Securities Transactions for Wholesalers", "ELC184", "Compliance and Ethics", 60, "None", 0, "N/A"),
  course(17, "Outside Business Activities and Private Securities Transactions for Independent Registered Representatives", "ELC185", "Compliance and Ethics", 75, "CFP CE", 1.5, "237236"),
  course(18, "Private Placements Conducting Reasonable Investigations for Regulation D Offerings", "ELC186", "Institutional", 30, "CFP CE", 1, "237238"),
  course(19, "Privacy Considerations: Conducting Business with Institutional Clients", "ELC198", "Firm Operations", 30, "None", 0, "N/A"),
  course(20, "Supervision: Obligations When Monitoring Sales and Trading", "ELC202", "Supervision", 30, "None", 0, "N/A"),
  course(21, "Communications With the Public: What Retail Staff Need to Know", "ELC210", "Business Conduct", 30, "CFP CE", 0.5, "237214"),
  course(22, "Communications With the Public: Compliance Issues for Wholesalers", "ELC211", "Business Conduct", 30, "None", 0, "N/A"),
  course(23, "Communications With the Public: Compliance Issues for Independent Registered Representatives", "ELC212", "Business Conduct", 30, "CFP CE", 0.5, "237213"),
  course(24, "Electronic Communications: What Retail Staff Need to Know", "ELC213", "Business Conduct", 30, "CFP CE", 0.5, "237223"),
  course(25, "Electronic Communications: What Supervisors Need to Know", "ELC214", "Business Conduct", 30, "None", 0, "N/A"),
  course(26, "Electronic Communications: What Wholesalers Need to Know", "ELC215", "Business Conduct", 30, "None", 0, "N/A"),
  course(27, "Electronic Communications: What Independent Registered Representatives Need to Know", "ELC216", "Business Conduct", 30, "CFP CE", 0.5, "237222"),
  course(28, "Understanding Social Media for Retail Registered Representatives", "ELC217", "Business Conduct", 30, "CFP CE", 0.5, "237247"),
  course(29, "Corporate and Government Bonds: Regulatory Considerations", "ELC226", "Product", 60, "CFP CE", 1, "237217"),
  course(30, "Municipal Bonds: Regulatory Considerations", "ELC231", "Product", 60, "CFP CE", 1, "237234"),
  course(31, "Real Estate Investment Trusts (REITs): Regulatory Considerations", "ELC234", "Product", 60, "CFP CE", 1, "237240"),
  course(32, "Cybersecurity: Understanding Your Role", "ELC238", "Firm Operations", 30, "CFP CE", 0.5, "340840"),
  course(33, "Conflicts of Interest", "ELC242", "Compliance and Ethics", 30, "CFP CE", 0.5, "237215"),
  course(34, "Senior Investor Issues: Financial Exploitation", "ELC247", "Senior", 60, "CFP CE", 1, "237242"),
  course(35, "Insider Trading: Understanding Your Responsibilities", "ELC248", "Prohibited Practices and Fraud", 60, "CFP CE", 1, "237233"),
  course(36, "Books and Records for Operations Professionals", "ELC256", "Firm Operations", 30, "CFP CE", 0.5, "250701"),
  course(37, "529 Savings Plans and ABLE Programs", "ELC258", "Product", 30, "CFP CE", 1, "254420"),
  course(38, "Financial Exploitation of Senior and Vulnerable Adults", "ELC261", "Senior", 60, "CFP CE", 1, "268336"),
  course(39, "Regulation BI Compliance for Registered Representatives and Their Supervisors", "ELC263", "Business Conduct", 60, "CFP CE", 1, "275751"),
  course(40, "Regulation BI Compliance for Registered Representatives and Their Supervisors - Chinese Language", "ELC263C", "Business Conduct, Language", 60, "CFP CE", 1, "275751"),
  course(41, "Regulation BI Compliance for Registered Representatives and Their Supervisors - Spanish Language", "ELC263S", "Business Conduct, Language", 60, "CFP CE", 1, "275751"),
  course(42, "Information Barriers: Protecting MNPI and Preventing Insider Trading", "ELC264", "Supervision", 30, "CFP CE", 0.5, "278279"),
  course(43, "Fixed Income ETFs", "ELC265", "Product", 30, "CFP CE", 0.5, "293897"),
  course(44, "Compliance Reminders for Supervisors", "ELC266", "Annual Reviews", 30, "None", 0, "N/A"),
  course(45, "Treasury Securities", "ELC267", "Product", 30, "CFP CE", 0.5, "313096"),
  course(46, "Form U4: A Tool for Transparency", "ELC268", "Firm Operations", 30, "CFP CE", 0.5, "316771"),
  course(47, "Identifying and Escalating Customer Complaints", "ELC269", "Compliance and Ethics", 30, "CFP CE", 0.5, "316772"),
  course(48, "Ethical Decision Making", "ELC270", "Compliance and Ethics", 30, "None", 0, "N/A"),
  course(49, "Prohibited Conduct in Customer Relationships", "ELC272", "Prohibited Practices and Fraud", 30, "CFP CE", 0.5, "318199"),
  course(50, "Written Supervisory Procedures", "ELC276", "Supervision", 30, "None", 0, "N/A"),
  course(51, "Supervisory Systems", "ELC277", "Supervision", 30, "None", 0, "N/A"),
  course(52, "Regulatory Considerations for New Products", "ELC278", "Product", 30, "None", 0, "N/A"),
  course(53, "Returning to the Industry: Hybrid Work Environments", "ELC279", "Firm Operations", 30, "None", 0, "N/A"),
  course(54, "2024 Annual Compliance Review", "ELC280", "Annual Reviews", 30, "CFP CE", 0.5, "324237"),
  course(55, "2024 Annual Industry Priorities Review", "ELC281", "Annual Reviews", 30, "None", 0, "N/A"),
  course(56, "2024 Annual AML Review", "ELC282", "Annual Reviews", 30, "CFP CE", 0.5, "326180"),
  course(57, "2024 Supervisory Trends Review", "ELC283", "Annual Reviews", 30, "None", 0, "N/A"),
  course(58, "Securities Regulation Fundamentals", "ELC284", "Securities Regulations", 30, "None", 0, "N/A"),
  course(59, "AML Overview: Understanding the Supervisor's Role", "ELC286", "AML", 60, "None", 0, "N/A"),
  course(60, "AML Compliance: Suspicious Activity Reporting", "ELC287", "AML", 30, "CFP CE", 0.5, "333728"),
  course(61, "AML Compliance: Account Monitoring", "ELC288", "AML", 30, "CFP CE", 0.5, "335341"),
  course(62, "Regulatory Concerns for New Product", "ELC289", "Product", 30, "CFP CE", 0.5, "335534"),
  course(63, "Analyzing Investor Growth", "ELC290", "Business Conduct", 30, "CFP CE", 0.5, "335733"),
  course(64, "Annual 2025 AML Review", "ELC291", "Annual Reviews", 30, "CFP CE", 0.5, "335346"),
  course(65, "2025 Annual Industry Priorities Review", "ELC292", "Annual Reviews", 30, "CFP CE", 0.5, "335734"),
  course(66, "Investor Trends: Exploring the Changing Investor Landscape", "ELC293", "Business Conduct", 30, "CFP CE", 0.5, "335348"),
  course(67, "2025 Supervisory Trends", "ELC294", "Supervision", 30, "None", 0, "N/A"),
  course(68, "2025 Annual Compliance Review", "ELC295", "Annual Reviews", 30, "CFP CE", 0.5, "335350"),
  course(69, "Detecting Financial Crimes: Money Laundering", "ELC296", "Prohibited Practices and Fraud", 30, "CFP CE", 0.5, "340841"),
  course(70, "Detecting Financial Crimes: Insider Trading and Market Manipulation", "ELC297", "Prohibited Practices and Fraud", 30, "CFP CE", 0.5, "340842"),
  course(71, "Detecting Financial Crimes: Cybercrimes", "ELC298", "Prohibited Practices and Fraud", 30, "CFP CE", 0.5, "340842"),
  course(72, "2026 Supervisory Trends Review", "ELC299", "Supervision", 30, "None", 0, "N/A"),
  course(73, "Red Flags of Money Laundering for Registered Representatives", "ELC300", "AML", 30, "CFP CE", 0.5, "TBD"),
  course(74, "Red Flags of Money Laundering for Operations Professionals", "ELC301", "AML", 30, "None", 0, "N/A"),
  course(75, "Red Flags of Money Laundering for Institutional Sales Representatives", "ELC302", "AML", 30, "None", 0, "N/A"),
  course(76, "2026 Annual Industry Priorities Review", "ELC303", "Annual Reviews", 30, "CFP CE", 0.5, "347395"),
  course(77, "2026 Annual AML Review", "ELC304", "Annual Reviews", 30, "CFP CE", 0.5, "347396"),
  course(78, "2026 Annual Compliance Review", "ELC305", "Annual Reviews", 30, "CFP CE", 0.5, "347397"),
];

const reviewText: Record<ResearchPaperReview["theme"], string> = {
  attribute_graph_patterns: "Reviewed for binning numeric attributes before graph association so additive feature fusion does not hide fraud patterns.",
  limited_labels: "Reviewed for label scarcity controls, semi-supervised review queues, and confidence-aware analyst feedback loops.",
  unsupervised_heterophily: "Reviewed for low-label and heterophily cases where risky nodes connect to normal-looking neighborhoods.",
  test_time_retrieval: "Reviewed for concept-drift handling through nearest recent events at inference time without retraining the base model.",
  dynamic_graph_contrastive: "Reviewed for evolving neighborhood and temporal-subgraph contrastive signals in fast-moving fraud rings.",
  adversarial_robustness: "Reviewed for graph-injection, camouflage, and robustness controls around shared devices, IPs, and synthetic edges.",
  llm_explainability: "Reviewed for explainable LLM-assisted website and narrative triage with human validation requirements.",
  federated_learning: "Reviewed for consortium and cross-bank learning patterns where raw customer data cannot be centralized.",
  pretraining_prompting: "Reviewed for behavior and graph pretraining patterns that improve cold-start and low-label risk scoring.",
  multimodal_behavior: "Reviewed for combining behavioral, device, temporal, and operational signals in non-payment fraud contexts.",
  rules_optimization: "Reviewed for cost-sensitive rule governance, backtesting, false-positive control, and Pareto tradeoffs.",
  temporal_sequence: "Reviewed for transaction-sequence, event-sequence, and concept-drift controls.",
  graph_aml: "Reviewed for money-flow, group-aware AML, circularity, pass-through, and linked-entity detection.",
  classic_fraud_mining: "Reviewed as historical foundation for graph/tensor anomaly mining, cost-sensitive fraud scoring, and rare-event handling.",
};

const paper = (
  id: string,
  year: number,
  venue: string,
  title: string,
  authors: string,
  theme: ResearchPaperReview["theme"],
  implementationStatus: ResearchPaperReview["implementationStatus"] = "reviewed",
  implementedAs = "Mapped to model-governance registry and explainable control design.",
): ResearchPaperReview => ({
  id,
  year,
  venue,
  title,
  authors,
  theme,
  implementationStatus,
  implementedAs,
  appSurface: implementationStatus === "active_control" ? ["Transaction Monitoring", "Microtransaction Intelligence", "Research Lab"] : ["Research Lab"],
  review: reviewText[theme],
  limitations: implementationStatus === "active_control"
    ? "Implemented as deterministic, auditable production controls. Full neural training requires institution-specific labels, model validation, and MLOps approval."
    : "Reviewed and represented in the governance registry. It is not claimed as a trained live model.",
});

export const researchPaperReviews: ResearchPaperReview[] = [
  paper("gaap-2025", 2025, "AAAI", "Global Attribute-Association Pattern Aggregation for Graph Fraud Detection", "Mingjiang Duan, Da He, Tongya Zheng, Lingxiang Jia, Mingli Song, Xinyu Wang, Zunlei Feng", "attribute_graph_patterns", "active_control", "Dynamic attribute bins plus association-pattern risk signals in the AML scoring service."),
  paper("tre-2025", 2025, "AAAI", "Online Fraud Detection via Test-Time Retrieval-Based Representation Enrichment", "Yiran Qiao, Ningtao Wang, Yuncong Gao, Yang Yang, Xing Fu, Weiqiang Wang, Xiang Ao", "test_time_retrieval", "active_control", "Nearest recent-transaction enrichment and drift uplift in AML scoring."),
  paper("cagnn-2025", 2025, "AAAI", "Context-aware Graph Neural Network for Graph-based Fraud Detection with Extremely Limited Labels", "Pengbo Li, Hang Yu, Xiangfeng Luo", "limited_labels"),
  paper("hgad-2025", 2025, "AAAI", "A Label-free Heterophily-guided Approach for Unsupervised Graph Fraud Detection", "Junjun Pan, Yixin Liu, Xin Zheng, Yizhen Zheng, Alan Wee-Chung Liew, Fuyi Li, Shirui Pan", "unsupervised_heterophily", "shadow_mode"),
  paper("dnm-2025", 2025, "AAAI", "Dynamic Neighborhood Modeling via Node-Subgraph Contrastive Learning for Graph-Based Fraud Detection", "Zhizhi Yu, Chundong Liang, Xinglong Chang, Dongxiao He, Di Jin, Jianguo Wei", "dynamic_graph_contrastive", "shadow_mode"),
  paper("graph-injection-2025", 2025, "AAAI", "Unveiling the Threat of Fraud Gangs to Graph Neural Networks", "Jinhyeok Choi, Heehyeon Kim, Joyce Jiyoung Whang", "adversarial_robustness", "active_control", "Graph-injection and sudden-edge-growth signals for identity graph review."),
  paper("scamnet-2025", 2025, "AAAI", "ScamNet: Toward Explainable Large Language Model-Based Fraudulent Shopping Website Detection", "Marzieh Bitaab, Alireza Karimi, Zhuoer Lyu, Ahmadreza Mosallanezhad, Adam Oest, Ruoyu Wang, Tiffany Bao, Yan Shoshitaishvili, Adam Doupe", "llm_explainability"),
  paper("fedgb-2025", 2025, "CIKM", "Federated Gradient Boosting for Financial Fraud Detection", "Dae-Young Park, In-Young Ko, Taek-Ho Lee, Junghye Lee", "federated_learning"),
  paper("ngppl-2025", 2025, "CIKM", "Neighbor-enhanced Graph Pre-training and Prompt Learning Framework for Fraud Detection", "Ziyang Cheng, Jie Yang, Yixin Song, Dawei Cheng, Guang Yang, Bo Wang", "pretraining_prompting"),
  paper("delivery-2025", 2025, "CIKM", "Fraudulent Delivery Detection with Multimodal Courier Behavior Data in Last-Mile Delivery", "Shanshan Wang, Sijing Duan, Shuxin Zhong, Zhiqing Hong, Zhiyuan Zhou, Hongyu Lin, Weijian Zuo, Desheng Zhang, Yi Ding", "multimodal_behavior"),
  paper("revenue-division-2025", 2025, "ICML", "Fraud-Proof Revenue Division on Subscription Platforms", "Abheek Ghosh, Tzeh Yuan Neoh, Nicholas Teh, Giannis Tyrovolas", "rules_optimization"),
  paper("dual-view-2025", 2025, "IJCAI", "Mitigating Message Imbalance in Fraud Detection with Dual-View Graph Representation Learning", "Yudan Song, Yuecen Wei, Yuhang Lu, Qingyun Sun, Minglai Shao, Li-E Wang, Chunming Hu, Xianxian Li, Xingcheng Fu", "adversarial_robustness", "shadow_mode"),
  paper("acrf-2025", 2025, "IJCAI", "Attention-based Conditional Random Field for Financial Fraud Detection", "Xiaoguang Wang, Chenxu Wang, Luyue Zhang, Xiaole Wang, Mengqin Wang, Huanlong Liu, Tao Qin", "temporal_sequence"),
  paper("mutationguard-2025", 2025, "IJCAI", "MutationGuard: A Graph and Temporal-Spatial Neural Method for Detecting Mutation Telecommunication Fraud", "Haitao Bai, Pinghui Wang, Ruofei Zhang, Ziyang Zhou, Juxiang Zeng, Yulou Su, Li Xing, Zhou Su, Chen Zhang, Lizhen Cui, Jun Hao, Wei Wang", "dynamic_graph_contrastive"),
  paper("dark-side-2025", 2025, "WWW", "Welcome to the Dark Side: Analyzing the Revenue Flows of Fraud in the Online Ad Ecosystem", "Emmanouil Papadogiannakis, Nicolas Kourtellis, Panagiotis Papadopoulos, Evangelos Markatos", "graph_aml"),
  paper("grad-2025", 2025, "WWW", "Grad: Guided Relation Diffusion Generation for Graph Augmentation in Graph Fraud Detection", "Jie Yang, Rui Zhang, Ziyang Cheng, Dawei Cheng, Guang Yang, Bo Wang", "pretraining_prompting"),
  paper("heterophily-spectrum-2024", 2024, "AAAI", "Revisiting Graph-Based Fraud Detection in Sight of Heterophily and Spectrum", "Fan Xu, Nan Wang, Hao Wu, Xuezhi Wen, Xibin Zhao, Hai Wan", "unsupervised_heterophily", "shadow_mode"),
  paper("dig-in-gnn-2024", 2024, "AAAI", "DiG-In-GNN: Discriminative Feature Guided GNN-Based Fraud Detector against Inconsistencies in Multi-Relation Fraud Graph", "Jinghui Zhang, Zhengjia Xu, Dingyang Lv, Zhan Shi, Dian Shen, Jiahui Jin, Fang Dong", "adversarial_robustness"),
  paper("dga-gnn-2024", 2024, "AAAI", "DGA-GNN: Dynamic Grouping Aggregation GNN for Fraud Detection", "Mingjiang Duan, Tongya Zheng, Yang Gao, Gang Wang, Zunlei Feng, Xinyu Wang", "attribute_graph_patterns", "shadow_mode"),
  paper("barely-supervised-2024", 2024, "AAAI", "Barely Supervised Learning for Graph-Based Fraud Detection", "Hang Yu, Zhengyang Liu, Xiangfeng Luo", "limited_labels"),
  paper("payment-pretraining-2024", 2024, "CIKM", "A Payment Transaction Pre-training Model for Fraud Transaction Detection", "Wenxi Huang, Zhangyi Zhao, Xiaojun Chen, Qin Zhang, Mark Junjie Li, Hanjing Su, Qingyao Wu", "pretraining_prompting"),
  paper("collab-smpc-2024", 2024, "CIKM", "Collaborative Fraud Detection on Large Scale Graph Using Secure Multi-Party Computation", "Xin Liu, Xiaoyu Fan, Rong Ma, Kun Chen, Yi Li, Guosai Wang, Wei Xu", "federated_learning"),
  paper("lex-gnn-2024", 2024, "CIKM", "LEX-GNN: Label-Exploring Graph Neural Network for Accurate Fraud Detection", "Woochang Hyun, Insoo Lee, Bongwon Suh", "limited_labels"),
  paper("partition-message-2024", 2024, "ICLR", "Partitioning Message Passing for Graph Fraud Detection", "Wei Zhuo, Zemin Liu, Bryan Hooi, Bingsheng He, Guang Tan, Rizal Fathony, Jia Chen", "unsupervised_heterophily"),
  paper("realtime-payments-agent-2024", 2024, "IJCAI", "Fraud Risk Mitigation in Real-Time Payments: A Strategic Agent-Based Analysis", "Katherine Mayo, Nicholas Grabill, Michael Wellman", "rules_optimization"),
  paper("robust-graph-2024", 2024, "IJCAI", "Safeguarding Fraud Detection from Attacks: A Robust Graph Learning Approach", "Jiasheng Wu, Xin Liu, Dawei Cheng, Yi Ouyang, Xian Wu, Yefeng Zheng", "adversarial_robustness"),
  paper("sefraud-2024", 2024, "KDD", "SEFraud: Graph-based Self-Explainable Fraud Detection via Interpretative Mask Learning", "Kaidi Li, Tianmeng Yang, Min Zhou, Jiahao Meng, Shendi Wang, Yihui Wu, Boshuai Tan, Hu Song, Lujia Pan, Fan Yu, Zhenli Sheng, Yunhai Tong", "llm_explainability"),
  paper("pareto-rules-2024", 2024, "KDD", "On Finding Bi-objective Pareto-optimal Fraud Prevention Rule Sets for Fintech Applications", "Chengyao Wen, Yin Lou", "rules_optimization", "active_control", "Rule builder backtesting exposes alert volume and false-positive tradeoffs."),
  paper("group-aware-aml-2023", 2023, "TKDE", "Anti-Money Laundering by Group-Aware Deep Graph Learning", "Dawei Cheng, Yujia Ye, Sheng Xiang, Zhenwei Ma, Ying Zhang, Changjun Jiang", "graph_aml", "active_control", "Microtransaction clusters, fan-in/fan-out, rapid pass-through, and linked-entity graph evidence."),
  paper("attr-driven-2023", 2023, "AAAI", "Semi-supervised Credit Card Fraud Detection via Attribute-driven Graph Representation", "Sheng Xiang, Mingzhi Zhu, Dawei Cheng, Enxia Li, Ruihui Zhao, Yi Ouyang, Ling Chen, Yefeng Zheng", "attribute_graph_patterns"),
  paper("few-labels-2023", 2023, "WSDM", "A Framework for Detecting Frauds from Extremely Few Labels", "Ya-Lin Zhang, Yi-Xuan Sun, Fangfang Fan, Meng Li, Yeyu Zhao, Wei Wang, Longfei Li, Jun Zhou, Jinghua Feng", "limited_labels"),
  paper("bert4eth-2023", 2023, "WWW", "BERT4ETH: A Pre-trained Transformer for Ethereum Fraud Detection", "Sihao Hu, Zhen Zhang, Bingqiao Luo, Shengliang Lu, Bingsheng He, Ling Liu", "pretraining_prompting"),
  paper("future-info-2022", 2022, "AISTATS", "The Importance of Future Information in Credit Card Fraud Detection", "Van Bach Nguyen, Kanishka Ghosh Dastidar, Michael Granitzer, Wissam Siblini", "temporal_sequence"),
  paper("bright-2022", 2022, "CIKM", "BRIGHT - Graph Neural Networks in Real-time Fraud Detection", "Mingxuan Lu, Zhichao Han, Susie Xi Rao, Zitao Zhang, Yang Zhao, Yinan Shan, Ramesh Raghunathan, Ce Zhang, Jiawei Jiang", "graph_aml"),
  paper("metarule-2022", 2022, "CIKM", "MetaRule: A Meta-path Guided Ensemble Rule Set Learning for Explainable Fraud Detection", "Lu Yu, Meng Li, Xiaoguang Huang, Wei Zhu, Yanming Fang, Jun Zhou, Longfei Li", "rules_optimization"),
  paper("behavior-pretraining-2022", 2022, "KDD", "User Behavior Pre-training for Online Fraud Detection", "Can Liu, Yuncong Gao, Li Sun, Jinghua Feng, Hao Yang, Xiang Ao", "pretraining_prompting"),
  paper("flowscope-2020", 2020, "AAAI", "FlowScope: Spotting Money Laundering Based on Graphs", "Xiangfeng Li, Shenghua Liu, Zifeng Li, Xiaotian Han, Chuan Shi, Bryan Hooi, He Huang, Xueqi Cheng", "graph_aml", "active_control", "Circularity, pass-through, and money-flow graph evidence in microtransaction intelligence."),
  paper("camouflage-2020", 2020, "CIKM", "Enhancing Graph Neural Network-based Fraud Detectors against Camouflaged Fraudsters", "Yingtong Dou, Zhiwei Liu, Li Sun, Yutong Deng, Hao Peng, Philip Yu", "adversarial_robustness", "shadow_mode"),
  paper("fraudar-2016", 2016, "KDD", "FRAUDAR: Bounding Graph Fraud in the Face of Camouflage", "Bryan Hooi, Hyun Ah Song, Alex Beutel, Neil Shah, Kijung Shin, Christos Faloutsos", "classic_fraud_mining", "shadow_mode"),
  paper("money-flow-2015", 2015, "CIKM", "Fraud Transaction Recognition: A Money Flow Network Approach", "Renxin Mao, Zhao Li, Jinhua Fu", "graph_aml"),
  paper("money-laundering-2003", 2003, "KDD", "Applying Data Mining in Investigating Money Laundering Crimes", "Zhongfei Zhang, John Salerno, Philip Yu", "classic_fraud_mining"),
  paper("cost-sensitive-1998", 1998, "KDD", "Toward Scalable Learning with Non-Uniform Class and Cost Distributions: A Case Study in Credit Card Fraud Detection", "Phillip Chan, Salvatore Stolfo", "classic_fraud_mining"),
];

export const researchImplementations: ResearchImplementationModule[] = [
  {
    id: "gaap-attribute-association",
    name: "GAAP-inspired attribute-association aggregation",
    sourcePapers: ["gaap-2025", "dga-gnn-2024", "attr-driven-2023"],
    status: "active",
    riskSignals: ["dynamic attribute bins", "shared graph attribute combinations", "cross-corridor pattern rarity"],
    evidenceRequired: ["binned amount/velocity/device profile", "linked devices or IPs", "transaction corridor and beneficiary context"],
    fairnessControls: ["country and mobile-money channel are never standalone adverse reasons", "all geographic signals require behavioral corroboration"],
    auditEvents: ["aml.transaction.evaluated", "aml.alert.created"],
  },
  {
    id: "tre-retrieval-enrichment",
    name: "TRE-inspired recent-neighbor drift enrichment",
    sourcePapers: ["tre-2025", "future-info-2022", "behavior-pretraining-2022"],
    status: "active",
    riskSignals: ["nearest recent events", "concept-drift uplift", "similar-case outcome evidence"],
    evidenceRequired: ["recent transaction window", "distance-weighted neighbor score", "matching channel/device/corridor indicators"],
    fairnessControls: ["retrieval neighbors explain score movement", "neighbor labels are advisory and never irreversible"],
    auditEvents: ["aml.transaction.evaluated"],
  },
  {
    id: "heterophily-and-camouflage",
    name: "Heterophily, camouflage, and graph-injection guard",
    sourcePapers: ["hgad-2025", "graph-injection-2025", "fraudar-2016", "camouflage-2020"],
    status: "shadow_mode",
    riskSignals: ["neighbor-risk disagreement", "sudden new edge burst", "shared-device camouflage"],
    evidenceRequired: ["identity graph degree change", "shared device/IP evidence", "new beneficiary timing"],
    fairnessControls: ["human review required before restrictions based on graph-only evidence"],
    auditEvents: ["aml.alert.created", "aml.case.escalated"],
  },
  {
    id: "rule-portfolio-optimizer",
    name: "Pareto rule-governance and false-positive control",
    sourcePapers: ["pareto-rules-2024", "metarule-2022", "cost-sensitive-1998"],
    status: "active",
    riskSignals: ["estimated alert volume", "estimated false-positive rate", "rule version drift"],
    evidenceRequired: ["backtest results", "approval notes", "rule owner and version history"],
    fairnessControls: ["four-eyes approval", "mandatory written rationale for manual overrides"],
    auditEvents: ["aml.rule.created", "aml.rule.backtested", "aml.rule.approved", "aml.rule.activated"],
  },
  {
    id: "provider-consortium-learning",
    name: "Federated and provider-dependent intelligence registry",
    sourcePapers: ["fedgb-2025", "collab-smpc-2024"],
    status: "provider_required",
    riskSignals: ["consortium hit", "federated model confidence", "secure-party aggregation"],
    evidenceRequired: ["provider agreement", "privacy controls", "model validation pack"],
    fairnessControls: ["no raw customer data export", "provider confidence displayed separately from internal evidence"],
    auditEvents: ["aml.screening.requested", "aml.permission.changed"],
  },
];

export const repositoryReviews: RepositoryIntegrationReview[] = [
  {
    id: "jestercloud-aws",
    repository: "JesterCloud/aml-fraud-detection-aws",
    url: "https://github.com/JesterCloud/aml-fraud-detection-aws",
    observedPattern: "AWS-oriented AML fraud detection pipeline pattern with event processing, persistence, and model-scoring separation.",
    integratedFeature: "Mapped to African Guard as an additive event-driven transaction governance flow: persist, score, alert, investigate, audit.",
    status: "reviewed_not_imported",
    notes: "No source code was copied. African Guard keeps its NestJS, PostgreSQL, Redis, Kafka, Neo4j, and Next.js stack.",
  },
  {
    id: "automated-fraud-detection",
    repository: "ameya123ch/Automated-Fraud-Detection-System",
    url: "https://github.com/ameya123ch/Automated-Fraud-Detection-System",
    observedPattern: "End-to-end automated fraud-detection workflow emphasizing data ingestion, model evaluation, and analyst-facing output.",
    integratedFeature: "Mapped to the AML transaction evaluation endpoint, explainability factors, and analyst review actions.",
    status: "reviewed_not_imported",
    notes: "The app now exposes comparable workflow coverage using existing African Guard services rather than adding a second dashboard.",
  },
  {
    id: "financial-fraud-risk-engine",
    repository: "AmirhosseinHonardoust/Financial-Fraud-Risk-Engine",
    url: "https://github.com/AmirhosseinHonardoust/Financial-Fraud-Risk-Engine",
    observedPattern: "Risk-engine separation of scores, thresholds, decisions, and reason codes.",
    integratedFeature: "Mapped to unified FinCrime score components, configurable rule scoring, recommended actions, and model-governance cards.",
    status: "implemented",
    notes: "Integrated as typed risk-decision and research-signal structures; no dependency or code import was added.",
  },
  {
    id: "github-topic-html",
    repository: "GitHub fraud-detection topic, HTML language",
    url: "https://github.com/topics/fraud-detection?l=html",
    observedPattern: "Public topic index of lightweight fraud-detection examples and UI-centric demos.",
    integratedFeature: "Used only as a review input for app-facing coverage; African Guard does not import demo UI code.",
    status: "reviewed_not_imported",
    notes: "Production functionality remains in the existing monorepo architecture.",
  },
];
