export const agents = [
  {
    id: "builder",
    name: "Builder Agent",
    description: "Implements code changes that align with the product source of truth.",
    promptFile: "builder.md",
    requiredDocs: [
      "ShureFund_SoT_v3.md",
      "ShureFund_MVP_Scope_and_Target_State_v1.md",
      "ShureFund_Data_Model_v2_1.md",
      "ShureFund_Control_Logic_v2_1.md",
      "ShureFund_Workflow_State_Machine_v1.md",
    ],
  },
  {
    id: "code_assurance",
    name: "Code Assurance Agent",
    description: "Reviews code quality, drift risk, and merge readiness.",
    promptFile: "code-assurance.md",
    requiredDocs: [
      "ShureFund_SoT_v3.md",
      "ShureFund_Control_Logic_v2_1.md",
      "ShureFund_Data_Model_v2_1.md",
      "ShureFund_Workflow_State_Machine_v1.md",
      "ShureFund_Audit_and_Event_Model_v1.md",
    ],
  },
  {
    id: "workflow_ux",
    name: "Workflow / UX Agent",
    description: "Protects workflow clarity, status visibility, and mobile-first UX.",
    promptFile: "workflow-ux.md",
    requiredDocs: [
      "ShureFund_SoT_v3.md",
      "ShureFund_Workflow_State_Machine_v1.md",
      "UX_SYSTEM.docx",
    ],
  },
  {
    id: "funding_assurance",
    name: "Funding Assurance Agent",
    description: "Owns funding integrity, ledger reasoning, and release eligibility checks.",
    promptFile: "funding-assurance.md",
    requiredDocs: [
      "ShureFund_SoT_v3.md",
      "ShureFund_Data_Model_v2_1.md",
      "ShureFund_Control_Logic_v2_1.md",
      "ShureFund_MVP_Scope_and_Target_State_v1.md",
    ],
  },
  {
    id: "compliance_audit",
    name: "Compliance / Audit Agent",
    description: "Owns compliance posture, audit completeness, and control evidence.",
    promptFile: "compliance-audit.md",
    requiredDocs: [
      "ShureFund_SoT_v3.md",
      "ShureFund_Audit_and_Event_Model_v1.md",
      "COMPLIANCE.docx",
      "LEGAL_FRAMEWORK.docx",
    ],
  },
  {
    id: "brand_guardian",
    name: "Brand Guardian Agent",
    description: "Protects tone, visual identity, and risk-forward presentation.",
    promptFile: "brand-guardian.md",
    requiredDocs: [
      "ShureFund_SoT_v3.md",
      "BRAND_GUIDELINES.docx",
      "UX_SYSTEM.docx",
    ],
  },
];
