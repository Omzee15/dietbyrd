import React from "react";
import { JoinRequestForm } from "@/components/JoinRequestForm";
import { useNavigate } from "react-router-dom";
import { Heart, Activity } from "lucide-react";

const JoinForm = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#DFE5E9] flex items-center justify-center p-4 md:p-8" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div className="w-full max-w-[1300px] flex flex-col md:flex-row gap-6 md:gap-8 min-h-[750px] items-stretch">
        
        {/* Left Side - Form Card */}
        <div className="w-full md:w-[420px] bg-white rounded-[32px] p-8 md:p-10 shadow-[0_8px_30px_rgba(0,0,0,0.04)] flex flex-col justify-center shrink-0">
          <JoinRequestForm 
            inline={true} 
            onBack={() => navigate("/login")} 
            onComplete={() => navigate("/login")} 
          />
        </div>

        {/* Right Side - Information Panel */}
        <div className="hidden md:flex flex-1 bg-[#167858] p-12 lg:p-16 text-white flex-col relative overflow-hidden rounded-[32px] shadow-xl">
          {/* Background circles */}
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#1A8D68] rounded-full blur-[100px] opacity-40 -translate-y-1/3 translate-x-1/4"></div>
          <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-[#0E523A] rounded-full blur-[80px] opacity-40 translate-y-1/4 translate-x-1/4"></div>
          
          {/* Content */}
          <div className="relative z-10 flex flex-col h-full">
            
            {/* Logo area */}
            <div className="flex items-center gap-4 mb-12">
               <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                 <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>
               </div>
               <div>
                 <h2 className="text-[22px] font-bold tracking-tight leading-none mb-1">DietByRD</h2>
                 <p className="text-[12px] text-white/70 uppercase tracking-wider font-semibold">Clinical Nutrition Platform</p>
               </div>
            </div>

            <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-md border border-white/10 px-5 py-2.5 rounded-full mb-10 self-start text-[14px]">
              <div className="w-2 h-2 rounded-full bg-[#86EFAC]"></div>
              <span className="font-medium text-white/90">Trusted by 500+ Healthcare Providers</span>
            </div>

            <h1 className="text-5xl lg:text-[72px] font-bold tracking-tight mb-8 leading-[1.05]">
              Nutrition care,<br />
              <span className="text-[#86EFAC]">reimagined.</span>
            </h1>

            <p className="text-[18px] text-white/80 leading-relaxed mb-12 max-w-xl font-medium">
              Connect doctors with registered dietitians seamlessly. Create
              personalized diet plans and track patient outcomes in real-time.
            </p>

            <div className="space-y-4 mb-auto max-w-xl">
              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5 flex items-center gap-5 transition-all hover:bg-white/10">
                <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center shrink-0 border border-white/5">
                  <Heart className="w-6 h-6 text-[#86EFAC]" strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="font-bold text-white text-[16px] mb-1">Patient-Centric Care</h3>
                  <p className="text-[14px] text-white/60">Holistic approach to nutrition management</p>
                </div>
              </div>
              
              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5 flex items-center gap-5 transition-all hover:bg-white/10">
                <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center shrink-0 border border-white/5">
                  <Activity className="w-6 h-6 text-[#86EFAC]" strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="font-bold text-white text-[16px] mb-1">Real-time Collaboration</h3>
                  <p className="text-[14px] text-white/60">Doctors and dietitians work together</p>
                </div>
              </div>
            </div>

            {/* Bottom Stats Grid */}
            <div className="grid grid-cols-3 gap-6 mt-12 pt-8 border-t border-white/10">
              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-[20px] p-6 text-center transition-all hover:bg-white/10">
                <p className="text-4xl font-bold text-white mb-2 tracking-tight">10k+</p>
                <p className="text-[11px] text-white/60 uppercase tracking-wider font-bold">Patients Helped</p>
              </div>
              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-[20px] p-6 text-center transition-all hover:bg-white/10">
                <p className="text-4xl font-bold text-white mb-2 tracking-tight">95%</p>
                <p className="text-[11px] text-white/60 uppercase tracking-wider font-bold">Satisfaction Rate</p>
              </div>
              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-[20px] p-6 text-center transition-all hover:bg-white/10">
                <p className="text-4xl font-bold text-white mb-2 tracking-tight">200+</p>
                <p className="text-[11px] text-white/60 uppercase tracking-wider font-bold">Active Dietitians</p>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default JoinForm;
