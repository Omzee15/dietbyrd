import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import AppSidebar from "@/components/AppSidebar";
import { LogOut, Plus, Edit, Trash2, Tag } from "lucide-react";
import { getAdminSidebarSections } from "@/lib/admin-sidebar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { getAuthHeaders } from "@/lib/api";

interface Coupon {
  id: number;
  code: string;
  discount_type: 'percentage' | 'fixed_amount';
  discount_value: number;
  max_discount_amount: number | null;
  min_purchase_amount: number;
  usage_limit: number | null;
  usage_count: number;
  valid_from: string;
  valid_until: string;
  is_active: boolean;
  notes: string | null;
}

const AdminCoupons = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { logout, user } = useAuth();
  
  const [editingCoupon, setEditingCoupon] = useState<Partial<Coupon> | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch coupons
  const { data: coupons = [], isLoading } = useQuery({
    queryKey: ["coupons"],
    queryFn: async () => {
      const res = await fetch("/api/admin/coupons", { headers: getAuthHeaders() });
      if (!res.ok) throw new Error("Failed to fetch coupons");
      const data = await res.json();
      return data.data || [];
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/admin/coupons/${id}`, { method: "DELETE", headers: getAuthHeaders() });
      if (!res.ok) throw new Error("Failed to delete coupon");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coupons"] });
      toast.success("Coupon deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete coupon");
    },
  });

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (coupon: Partial<Coupon>) => {
      const url = coupon.id ? `/api/admin/coupons/${coupon.id}` : "/api/admin/coupons";
      const method = coupon.id ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(coupon),
      });
      if (!res.ok) throw new Error("Failed to save coupon");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coupons"] });
      toast.success("Coupon saved successfully");
      setIsModalOpen(false);
      setEditingCoupon(null);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to save coupon");
    },
  });

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleAddNew = () => {
    setEditingCoupon({
      code: "",
      discount_type: "percentage",
      discount_value: 10,
      max_discount_amount: null,
      min_purchase_amount: 0,
      usage_limit: null,
      usage_count: 0,
      valid_from: new Date().toISOString().split('T')[0],
      valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      is_active: true,
      notes: "",
    });
    setIsModalOpen(true);
  };

  const handleEdit = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!editingCoupon) return;
    saveMutation.mutate(editingCoupon);
  };

  const sidebarSections = getAdminSidebarSections();

  const bottomContent = (
    <button
      onClick={handleLogout}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium text-red-400 hover:bg-red-500/10 transition-all duration-150"
    >
      <LogOut className="w-[18px] h-[18px] shrink-0" />
      <span>Sign Out</span>
    </button>
  );

  return (
    <div className="flex min-h-screen">
      <AppSidebar title="DietByRD" subtitle={user?.name || "Admin Panel"} sections={sidebarSections} bottomContent={bottomContent} />
      
      <main className="flex-1 p-8 bg-gray-50">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Coupon Codes</h1>
              <p className="text-gray-500 mt-1">Create and manage discount coupons</p>
            </div>
            <Button onClick={handleAddNew}>
              <Plus className="w-4 h-4 mr-2" />
              Create Coupon
            </Button>
          </div>

          {/* Coupon List */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Discount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usage</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valid Until</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                        Loading coupons...
                      </td>
                    </tr>
                  ) : coupons.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                        No coupons found
                      </td>
                    </tr>
                  ) : (
                    coupons.map((coupon: Coupon) => (
                      <tr key={coupon.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-mono font-bold text-primary">{coupon.code}</td>
                        <td className="px-6 py-4 text-sm">
                          {coupon.discount_type === 'percentage' 
                            ? `${coupon.discount_value}%` 
                            : `₹${coupon.discount_value}`}
                          {coupon.max_discount_amount && (
                            <div className="text-xs text-gray-500">Max: ₹{coupon.max_discount_amount}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {coupon.usage_count} / {coupon.usage_limit || '∞'}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {new Date(coupon.valid_until).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant={coupon.is_active ? 'default' : 'secondary'}>
                            {coupon.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEdit(coupon)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => deleteMutation.mutate(coupon.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {/* Edit/Add Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingCoupon?.id ? "Edit Coupon" : "Create New Coupon"}</DialogTitle>
          </DialogHeader>
          {editingCoupon && (
            <div className="space-y-4">
              <div>
                <Label>Coupon Code</Label>
                <Input
                  value={editingCoupon.code}
                  onChange={(e) => setEditingCoupon({ ...editingCoupon, code: e.target.value.toUpperCase() })}
                  placeholder="e.g., SAVE20"
                  className="font-mono uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Discount Type</Label>
                  <Select
                    value={editingCoupon.discount_type}
                    onValueChange={(value) => setEditingCoupon({ ...editingCoupon, discount_type: value as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage</SelectItem>
                      <SelectItem value="fixed_amount">Fixed Amount</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Discount Value</Label>
                  <Input
                    type="number"
                    value={editingCoupon.discount_value}
                    onChange={(e) => setEditingCoupon({ ...editingCoupon, discount_value: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Max Discount Amount (₹)</Label>
                  <Input
                    type="number"
                    value={editingCoupon.max_discount_amount || ''}
                    onChange={(e) => setEditingCoupon({ ...editingCoupon, max_discount_amount: e.target.value ? parseFloat(e.target.value) : null })}
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <Label>Min Purchase Amount (₹)</Label>
                  <Input
                    type="number"
                    value={editingCoupon.min_purchase_amount}
                    onChange={(e) => setEditingCoupon({ ...editingCoupon, min_purchase_amount: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Valid From</Label>
                  <Input
                    type="date"
                    value={editingCoupon.valid_from?.split('T')[0]}
                    onChange={(e) => setEditingCoupon({ ...editingCoupon, valid_from: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Valid Until</Label>
                  <Input
                    type="date"
                    value={editingCoupon.valid_until?.split('T')[0]}
                    onChange={(e) => setEditingCoupon({ ...editingCoupon, valid_until: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label>Usage Limit</Label>
                <Input
                  type="number"
                  value={editingCoupon.usage_limit || ''}
                  onChange={(e) => setEditingCoupon({ ...editingCoupon, usage_limit: e.target.value ? parseInt(e.target.value) : null })}
                  placeholder="Unlimited if empty"
                />
              </div>

              <div>
                <Label>Notes (Internal)</Label>
                <Input
                  value={editingCoupon.notes || ''}
                  onChange={(e) => setEditingCoupon({ ...editingCoupon, notes: e.target.value })}
                  placeholder="Optional notes"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={editingCoupon.is_active}
                  onChange={(e) => setEditingCoupon({ ...editingCoupon, is_active: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="is_active" className="cursor-pointer">Active</Label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? "Saving..." : "Save Coupon"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminCoupons;
