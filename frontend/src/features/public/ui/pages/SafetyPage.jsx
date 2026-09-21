import React from "react";
import { Link } from "react-router-dom";
import {
  ShieldCheck,
  Lock,
  FileCheck,
  AlertTriangle,
  CheckCircle2,
  Server,
  EyeOff,
  Sparkles,
} from "lucide-react";
import usePublicPages from "../../hooks/usePublicPages.jsx";

const SafetyPage = () => {
  const { handleOpenRegister } = usePublicPages();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto mb-16">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 mb-4">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Zero-Trust Media Governance</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Safety, Privacy & Compliance
        </h1>
        <p className="mt-4 text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
          OmniDrive AI enforces automated safety filters before compute tasks spin up.
          Your private media remains encrypted, isolated, and strictly protected.
        </p>
      </div>

      {/* 4 Pillars Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
        {/* Pillar 1: Moderation Gatekeeper */}
        <div className="bg-white dark:bg-slate-800/80 rounded-3xl p-8 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Automated Rekognition Moderation Gate
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            Every upload passes through an automated moderation filter. Amazon Rekognition checks for
            nudity, explicit graphics, hate symbols, and violence in sub-80ms before heavy Fargate
            workers or LLM summarizers are invoked.
          </p>
          <div className="p-4 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              If flagged, files are instantly quarantined into a dark S3 bucket with access revoked.
              Downstream Fargate transcoding is cancelled to save compute and eliminate toxic leakage.
            </span>
          </div>
        </div>

        {/* Pillar 2: Zero Model Training */}
        <div className="bg-white dark:bg-slate-800/80 rounded-3xl p-8 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center">
            <EyeOff className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Zero Model Training Guarantee
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            Your proprietary documents, confidential PDFs, and media assets are processed through
            stateless Amazon Bedrock Claude 3 endpoints. AWS foundational models are legally never trained
            on your customer data.
          </p>
          <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-200">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>No data retention or model fine-tuning caches</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Full compliance with SOC2, GDPR, and enterprise DPA standards</span>
            </li>
          </ul>
        </div>

        {/* Pillar 3: KMS BYOK Encryption */}
        <div className="bg-white dark:bg-slate-800/80 rounded-3xl p-8 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Customer-Managed Encryption Keys (BYOK)
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            All files at rest are secured with envelope encryption using AWS KMS keys backed by FIPS 140-2
            Level 3 Hardware Security Modules. Enterprise users can bring their own KMS key, giving them
            the power to revoke access at any second.
          </p>
          <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-200">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>TLS 1.3 encryption in transit for all S3 direct multi-part uploads</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Dedicated AWS IAM least-privilege service roles</span>
            </li>
          </ul>
        </div>

        {/* Pillar 4: Private Cloud Deployment */}
        <div className="bg-white dark:bg-slate-800/80 rounded-3xl p-8 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
            <Server className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Isolated AWS VPC & GovCloud Ready
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            Deploy OmniDrive AI directly into your private AWS VPC via Terraform or CloudFormation.
            Keep data air-gapped within your organization's perimeter with Zero-NAT public egress exposure.
          </p>
          <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-200">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>VPC Endpoints for S3, Rekognition, and Bedrock</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Full CloudTrail immutable audit logs archived to S3 Glacier</span>
            </li>
          </ul>
        </div>
      </div>

      {/* CTA Box */}
      <div className="text-center py-8">
        <button
          onClick={handleOpenRegister}
          className="px-8 py-3.5 rounded-full bg-[#1a73e8] hover:bg-[#1557bf] text-white font-semibold shadow-md hover:shadow-lg transition-all"
        >
          Get Started with Protected Storage
        </button>
      </div>
    </div>
  );
};

export default SafetyPage;
