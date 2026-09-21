import React from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, Lock, CheckCircle2, Server } from "lucide-react";
import OmniDriveLogo from "../../../../shared/ui/components/OmniDriveLogo.jsx";

const PublicFooter = () => {
  return (
    <footer className="bg-slate-900 text-slate-300 pt-16 pb-12 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-slate-800">
          {/* Brand & Mission */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <OmniDriveLogo size="sm" />
              <span className="font-bold text-xl text-white tracking-tight">
                OmniDrive<span className="text-[#60a5fa]">AI</span>
              </span>
            </div>
            <p className="text-sm text-slate-400 max-w-sm leading-relaxed">
              Production-grade event-driven cloud storage platform. Offloads heavy video transcoding,
              vision tagging, and document summarization into decoupled AWS serverless pipelines.
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-800 text-emerald-400 border border-slate-700">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                AWS ap-south-1 Active
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-800 text-blue-400 border border-slate-700">
                <ShieldCheck className="w-3.5 h-3.5" />
                SOC2 Type II
              </span>
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">
              Platform
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link to="/" className="hover:text-white transition-colors">
                  Overview
                </Link>
              </li>
              <li>
                <Link to="/features" className="hover:text-white transition-colors">
                  AI Capabilities
                </Link>
              </li>
              <li>
                <Link to="/how-it-works" className="hover:text-white transition-colors">
                  Serverless Pipeline
                </Link>
              </li>
              <li>
                <Link to="/safety" className="hover:text-white transition-colors">
                  Safety Gatekeeper
                </Link>
              </li>
              <li>
                <Link to="/pricing" className="hover:text-white transition-colors">
                  Plans & Quotas
                </Link>
              </li>
            </ul>
          </div>

          {/* Architecture & AI */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">
              Architecture
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <span className="text-slate-400">Direct-to-S3 Multi-Part</span>
              </li>
              <li>
                <span className="text-slate-400">ARM64 Fargate Transcoder</span>
              </li>
              <li>
                <span className="text-slate-400">Amazon Rekognition Vision</span>
              </li>
              <li>
                <span className="text-slate-400">Bedrock Claude 3 Summaries</span>
              </li>
              <li>
                <span className="text-slate-400">EventBridge + SQS FIFO</span>
              </li>
            </ul>
          </div>

          {/* Compliance & Trust */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">
              Security
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li className="flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                <span>AES-256 / KMS BYOK</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Zero Model Training</span>
              </li>
              <li className="flex items-center gap-2">
                <Server className="w-3.5 h-3.5 text-blue-400" />
                <span>Private AWS VPC</span>
              </li>
              <li className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                <span>HIPAA & ISO 27001</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom copyright & legal */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <p>© 2026 OmniDrive AI. Built for high-throughput AWS serverless media pipelines.</p>
          <div className="flex items-center gap-6">
            <span className="hover:text-slate-300 cursor-pointer">Privacy Policy</span>
            <span className="hover:text-slate-300 cursor-pointer">Terms of Service</span>
            <span className="hover:text-slate-300 cursor-pointer">Security Whitepaper</span>
            <span className="hover:text-slate-300 cursor-pointer">Status (99.999%)</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default PublicFooter;
