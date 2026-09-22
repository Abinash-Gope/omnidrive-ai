import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  ShieldCheck,
  Building2,
  Mail,
  User,
  Users,
  Server,
  HardDrive,
  CheckCircle2,
  ArrowRight,
  Loader2,
  Lock,
} from "lucide-react";
import ModalWrapper from "../../../../shared/ui/components/ModalWrapper.jsx";
import { closeModal, setToast } from "../../../../shared/state/uiSlice.jsx";
import { updatePlan } from "../../state/authSlice.jsx";

const EnterpriseContactModal = () => {
  const dispatch = useDispatch();
  const activeModal = useSelector((state) => state.ui?.activeModal);
  const isOpen = activeModal === "enterpriseContact";

  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "Alex Chen",
    workEmail: "alex@enterprise-cloud.io",
    companyName: "Acme Cloud Infrastructure",
    teamSize: "51-250 members",
    deploymentModel: "Dedicated AWS VPC",
    expectedStorage: "10 TB - 100 TB",
    requirements: ["byok", "zeroRetention"],
    notes: "We require private S3 ingestion with zero customer data retention for AI document pipelines.",
  });

  const handleClose = () => {
    dispatch(closeModal());
    setTimeout(() => setIsSubmitted(false), 300);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulate async enterprise lead dispatch
    await new Promise((r) => setTimeout(r, 600));
    setIsLoading(false);
    setIsSubmitted(true);
    dispatch(
      setToast({
        type: "success",
        message: "Enterprise inquiry submitted! Our AWS Solutions Architect will contact you shortly.",
      })
    );
  };

  const toggleRequirement = (reqId) => {
    setFormData((prev) => {
      const exists = prev.requirements.includes(reqId);
      return {
        ...prev,
        requirements: exists
          ? prev.requirements.filter((r) => r !== reqId)
          : [...prev.requirements, reqId],
      };
    });
  };

  return (
    <ModalWrapper isOpen={isOpen} onClose={handleClose} maxWidth="max-w-xl">
      {isSubmitted ? (
        /* Confirmation State */
        <div className="text-center py-6 space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-md">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
            Enterprise Request Received!
          </h3>

          <p className="text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto leading-relaxed">
            Thank you, <strong className="text-slate-900 dark:text-white">{formData.fullName}</strong>. Your inquiry for{" "}
            <strong className="text-slate-900 dark:text-white">{formData.companyName}</strong> has been prioritized.
          </p>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-left text-xs space-y-2 max-w-md mx-auto">
            <div className="flex justify-between">
              <span className="text-slate-500">Inquiry Reference:</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">#OMNI-ENT-9482</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Architecture:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{formData.deploymentModel}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Target Volume:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{formData.expectedStorage}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Target Response Time:</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">&lt; 2 Business Hours</span>
            </div>
          </div>

          <p className="text-xs text-slate-500">
            A Senior AWS Solutions Architect will contact you at{" "}
            <strong className="text-slate-700 dark:text-slate-300 font-mono">{formData.workEmail}</strong>.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <button
              onClick={() => {
                dispatch(updatePlan("enterprise"));
                dispatch(
                  setToast({
                    type: "success",
                    message: "Enterprise Dedicated VPC Sandbox activated for your account!",
                  })
                );
                handleClose();
              }}
              className="w-full sm:flex-1 py-2.5 rounded-full bg-gradient-to-r from-[#1a73e8] to-purple-600 hover:from-[#1557bf] hover:to-purple-700 text-white text-xs font-semibold shadow-md transition-all"
            >
              Activate Enterprise Subscription Plan
            </button>
            <button
              onClick={handleClose}
              className="w-full sm:w-28 py-2.5 rounded-full border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition-all"
            >
              Done
            </button>
          </div>
        </div>
      ) : (
        /* Form State */
        <div className="space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Dedicated AWS Infrastructure</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              Contact Enterprise Sales
            </h2>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Deploy OmniDrive AI directly into your private AWS VPC with dedicated ARM64 Graviton3 clusters and custom S3 compliance.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs focus:ring-2 focus:ring-[#1a73e8] focus:outline-none"
                    placeholder="Jane Doe"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Work Email *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    value={formData.workEmail}
                    onChange={(e) => setFormData({ ...formData, workEmail: e.target.value })}
                    className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs focus:ring-2 focus:ring-[#1a73e8] focus:outline-none"
                    placeholder="name@company.com"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Company / Organization *
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs focus:ring-2 focus:ring-[#1a73e8] focus:outline-none"
                    placeholder="Acme Inc."
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Team Size
                </label>
                <select
                  value={formData.teamSize}
                  onChange={(e) => setFormData({ ...formData, teamSize: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs focus:ring-2 focus:ring-[#1a73e8] focus:outline-none"
                >
                  <option>1-50 members</option>
                  <option>51-250 members</option>
                  <option>251-1,000 members</option>
                  <option>1,000+ members</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Deployment Architecture
                </label>
                <select
                  value={formData.deploymentModel}
                  onChange={(e) => setFormData({ ...formData, deploymentModel: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs focus:ring-2 focus:ring-[#1a73e8] focus:outline-none"
                >
                  <option>Dedicated AWS VPC</option>
                  <option>AWS GovCloud (FedRAMP)</option>
                  <option>Hybrid Cloud / On-Premise S3</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Expected Monthly Media Storage
                </label>
                <select
                  value={formData.expectedStorage}
                  onChange={(e) => setFormData({ ...formData, expectedStorage: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs focus:ring-2 focus:ring-[#1a73e8] focus:outline-none"
                >
                  <option>Under 10 TB</option>
                  <option>10 TB - 100 TB</option>
                  <option>100 TB - 1 PB</option>
                  <option>1 PB+ (Exabyte Scale)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Specific Security & Compliance Needs
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  { id: "byok", label: "Customer KMS Keys (BYOK)" },
                  { id: "zeroRetention", label: "Zero Model Retention (Bedrock)" },
                  { id: "hipaa", label: "HIPAA / SOC2 BAA" },
                  { id: "customFfmpeg", label: "Custom FFmpeg Presets" },
                ].map((item) => (
                  <label
                    key={item.id}
                    onClick={() => toggleRequirement(item.id)}
                    className={`flex items-center gap-2 p-2 rounded-xl border cursor-pointer select-none transition-colors ${
                      formData.requirements.includes(item.id)
                        ? "bg-purple-50 dark:bg-purple-950/50 border-purple-300 dark:border-purple-800 text-purple-900 dark:text-purple-200"
                        : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={formData.requirements.includes(item.id)}
                      readOnly
                      className="rounded text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-[11px] font-medium">{item.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Project Scope & Details
              </label>
              <textarea
                rows={2}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs focus:ring-2 focus:ring-[#1a73e8] focus:outline-none"
                placeholder="Tell us about your pipeline volumes, latency requirements, or VPC setup..."
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-full bg-gradient-to-r from-[#1a73e8] to-purple-600 hover:from-[#1557bf] hover:to-purple-700 text-white font-semibold text-xs shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>Submit Enterprise Consultation Request</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      )}
    </ModalWrapper>
  );
};

export default EnterpriseContactModal;
