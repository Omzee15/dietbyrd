import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { UserPlus, Shield, UtensilsCrossed } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-8 max-w-2xl mx-auto px-6">
        <div>
          <div className="w-16 h-16 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mx-auto mb-4">
            FA
          </div>
          <h1 className="text-4xl font-bold tracking-tight">FitArc Platform</h1>
          <p className="text-muted-foreground mt-2">Clinical collaboration platform for mental health professionals</p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Link to="/doctor">
            <div className="bg-card border rounded-xl p-6 hover:border-primary hover:shadow-lg transition-all cursor-pointer group">
              <UserPlus className="w-8 h-8 text-primary mx-auto mb-3 group-hover:scale-110 transition-transform" />
              <h3 className="font-semibold">Doctor Portal</h3>
              <p className="text-xs text-muted-foreground mt-1">Refer patients & track outcomes</p>
            </div>
          </Link>
          <Link to="/admin">
            <div className="bg-card border rounded-xl p-6 hover:border-primary hover:shadow-lg transition-all cursor-pointer group">
              <Shield className="w-8 h-8 text-primary mx-auto mb-3 group-hover:scale-110 transition-transform" />
              <h3 className="font-semibold">Admin Panel</h3>
              <p className="text-xs text-muted-foreground mt-1">Manage all patients & assignments</p>
            </div>
          </Link>
          <Link to="/dietician">
            <div className="bg-card border rounded-xl p-6 hover:border-primary hover:shadow-lg transition-all cursor-pointer group">
              <UtensilsCrossed className="w-8 h-8 text-primary mx-auto mb-3 group-hover:scale-110 transition-transform" />
              <h3 className="font-semibold">Dietician Portal</h3>
              <p className="text-xs text-muted-foreground mt-1">Create diet plans & consultations</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Index;
