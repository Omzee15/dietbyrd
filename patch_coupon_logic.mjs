import fs from 'fs';

function patchDashboard() {
  const file = 'c:/ClientWo/dietbyrd/src/pages/PatientDashboard.tsx';
  let content = fs.readFileSync(file, 'utf8');

  // Add Tag to lucide-react imports
  if (!content.includes('Tag,')) {
    content = content.replace(/UtensilsCrossed,\n\s*Star,/, "UtensilsCrossed,\n  Star,\n  Tag,");
  }

  // Add validateCoupon, applyCoupon, CouponValidation to api imports
  if (!content.includes('validateCoupon,')) {
    content = content.replace(/verifyPayment,\n\s*type DietPlan,/, "verifyPayment,\n  validateCoupon,\n  applyCoupon,\n  type CouponValidation,\n  type DietPlan,");
  }

  // Add state logic
  if (!content.includes('const [couponCode')) {
    content = content.replace(
      /const confirmAppointmentButtonRef = useRef<HTMLButtonElement>\(null\);/,
      `const confirmAppointmentButtonRef = useRef<HTMLButtonElement>(null);\n\n  // Coupon state\n  const [couponCode, setCouponCode] = useState("");\n  const [appliedCoupon, setAppliedCoupon] = useState<CouponValidation | null>(null);\n  const [couponLoading, setCouponLoading] = useState(false);\n  const [couponError, setCouponError] = useState<string | null>(null);\n\n  const handleApplyCoupon = async (pkg: ConsultationPackage | null) => {\n    if (!couponCode.trim() || !pkg) return;\n    setCouponLoading(true);\n    setCouponError(null);\n    try {\n      const result = await validateCoupon(couponCode.trim(), pkg.price / 100);\n      setAppliedCoupon(result);\n      toast.success(\`Coupon applied! ₹\${result.discount_applied} off\`);\n    } catch (err: any) {\n      setCouponError(err.message || "Invalid coupon code");\n      setAppliedCoupon(null);\n    } finally {\n      setCouponLoading(false);\n    }\n  };\n\n  const handleRemoveCoupon = () => {\n    setAppliedCoupon(null);\n    setCouponCode("");\n    setCouponError(null);\n  };`
    );
  }

  // Update handlePayment
  if (!content.includes('discountedPaise')) {
    content = content.replace(
      /const order = await createPaymentOrder\(\{\n\s*patient_id: user!\.profileId!,\n\s*package_id: pkg\.id,\n\s*amount: pkg\.price,\n\s*\}\);/,
      `const discountedPaise = appliedCoupon\n        ? Math.max(100, pkg.price - Math.round(appliedCoupon.discount_applied * 100))\n        : undefined;\n\n      // Create order on backend\n      const order = await createPaymentOrder({\n        patient_id: user!.profileId!,\n        package_id: pkg.id,\n        amount: pkg.price,\n        ...(discountedPaise ? { discounted_amount: discountedPaise } : {}),\n      });`
    );
  }

  // Update verification to apply coupon
  if (!content.includes('applyCoupon(appliedCoupon.id')) {
    content = content.replace(
      /await verifyPayment\(\{[\s\S]*?\}\);/,
      `await verifyPayment({\n              razorpay_order_id: response.razorpay_order_id,\n              razorpay_payment_id: response.razorpay_payment_id,\n              razorpay_signature: response.razorpay_signature,\n            });\n\n            if (appliedCoupon) {\n              applyCoupon(appliedCoupon.id, {\n                patient_id: user!.profileId!,\n                discount_applied: appliedCoupon.discount_applied,\n                order_amount: pkg.price / 100,\n              }).catch(console.error);\n              handleRemoveCoupon();\n            }`
    );
  }

  // Update JSX to show the coupon UI
  if (!content.includes('{/* Coupon code input */}')) {
    content = content.replace(
      /<\/div>\n\s*<DialogFooter className="mt-6">/,
      `</div>\n\n                  {/* Coupon code input */}\n                  {selectedPackage && (\n                    <div className="space-y-2 mt-4">\n                      {appliedCoupon ? (\n                        <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-50 border border-emerald-200">\n                          <div className="flex items-center gap-2 text-emerald-700 text-sm">\n                            <Tag className="w-4 h-4" />\n                            <span className="font-medium">{appliedCoupon.code}</span>\n                            <span>— ₹{appliedCoupon.discount_applied} off</span>\n                          </div>\n                          <button\n                            type="button"\n                            onClick={handleRemoveCoupon}\n                            className="text-emerald-600 hover:text-emerald-800"\n                          >\n                            <X className="w-4 h-4" />\n                          </button>\n                        </div>\n                      ) : (\n                        <div className="flex gap-2">\n                          <Input\n                            placeholder="Coupon code"\n                            value={couponCode}\n                            onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponError(null); }}\n                            onKeyDown={(e) => {\n                              if (e.key === "Enter") {\n                                e.preventDefault();\n                                handleApplyCoupon(selectedPackage);\n                              }\n                            }}\n                            className="h-9 text-sm"\n                          />\n                          <Button\n                            type="button"\n                            variant="outline"\n                            size="sm"\n                            className="h-9 px-3 shrink-0"\n                            onClick={() => handleApplyCoupon(selectedPackage)}\n                            disabled={!couponCode.trim() || couponLoading}\n                          >\n                            {couponLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Apply"}\n                          </Button>\n                        </div>\n                      )}\n                      {couponError && <p className="text-xs text-red-500">{couponError}</p>}\n                    </div>\n                  )}\n\n                <DialogFooter className="mt-6">`
    );
    
    // Replace the button text to show discounted price if applicable
    content = content.replace(
      /Pay ₹\{selectedPackage \? \(selectedPackage\.price \/ 100\)\.toFixed\(0\) : "0"\} & Confirm Booking/,
      `Pay ₹{selectedPackage ? Math.max(1, (selectedPackage.price / 100) - (appliedCoupon?.discount_applied || 0)).toFixed(0) : "0"} & Confirm Booking`
    );
  }

  fs.writeFileSync(file, content);
  console.log('Patched PatientDashboard.tsx');
}

function patchPublicBooking() {
  const file = 'c:/ClientWo/dietbyrd/src/components/PublicBookingModal.tsx';
  let content = fs.readFileSync(file, 'utf8');

  // Add Tag and X to lucide-react imports
  if (!content.includes('Tag,')) {
    content = content.replace(/Phone,\n\s*User,/, "Phone,\n  User,\n  Tag,\n  X,");
  }

  // Add validateCoupon, applyCoupon, CouponValidation to api imports
  if (!content.includes('validateCoupon,')) {
    content = content.replace(/bookAppointment,\n\s*type ConsultationPackage,/, "bookAppointment,\n  validateCoupon,\n  applyCoupon,\n  type CouponValidation,\n  type ConsultationPackage,");
  }

  // Add state logic
  if (!content.includes('const [couponCode')) {
    content = content.replace(
      /const confirmPaymentButtonRef = useRef<HTMLButtonElement>\(null\);/,
      `const confirmPaymentButtonRef = useRef<HTMLButtonElement>(null);\n\n  // Coupon state\n  const [couponCode, setCouponCode] = useState("");\n  const [appliedCoupon, setAppliedCoupon] = useState<CouponValidation | null>(null);\n  const [couponLoading, setCouponLoading] = useState(false);\n  const [couponError, setCouponError] = useState<string | null>(null);\n\n  const handleApplyCoupon = async (pkg: ConsultationPackage | null) => {\n    if (!couponCode.trim() || !pkg) return;\n    setCouponLoading(true);\n    setCouponError(null);\n    try {\n      const result = await validateCoupon(couponCode.trim(), pkg.price / 100);\n      setAppliedCoupon(result);\n      toast.success(\`Coupon applied! ₹\${result.discount_applied} off\`);\n    } catch (err: any) {\n      setCouponError(err.message || "Invalid coupon code");\n      setAppliedCoupon(null);\n    } finally {\n      setCouponLoading(false);\n    }\n  };\n\n  const handleRemoveCoupon = () => {\n    setAppliedCoupon(null);\n    setCouponCode("");\n    setCouponError(null);\n  };`
    );
  }

  // Update handlePayment
  if (!content.includes('discountedPaise')) {
    content = content.replace(
      /const order = await createPaymentOrder\(\{\n\s*patient_id: patientId,\n\s*package_id: selectedPackage\.id,\n\s*amount: selectedPackage\.price,\n\s*\}\);/,
      `const discountedPaise = appliedCoupon\n        ? Math.max(100, selectedPackage.price - Math.round(appliedCoupon.discount_applied * 100))\n        : undefined;\n\n      const order = await createPaymentOrder({\n        patient_id: patientId,\n        package_id: selectedPackage.id,\n        amount: selectedPackage.price,\n        ...(discountedPaise ? { discounted_amount: discountedPaise } : {}),\n      });`
    );
  }

  // Update verification to apply coupon
  if (!content.includes('applyCoupon(appliedCoupon.id')) {
    content = content.replace(
      /await verifyPayment\(\{[\s\S]*?\}\);/,
      `await verifyPayment({\n              razorpay_order_id: response.razorpay_order_id,\n              razorpay_payment_id: response.razorpay_payment_id,\n              razorpay_signature: response.razorpay_signature,\n            });\n\n            if (appliedCoupon) {\n              applyCoupon(appliedCoupon.id, {\n                patient_id: patientId,\n                discount_applied: appliedCoupon.discount_applied,\n                order_amount: selectedPackage.price / 100,\n              }).catch(console.error);\n              handleRemoveCoupon();\n            }`
    );
  }

  // Update JSX to show the coupon UI
  if (!content.includes('{/* Coupon code input */}')) {
    content = content.replace(
      /<\/div>\n\n\s*<Button\n\s*ref=\{confirmPaymentButtonRef\}/,
      `</div>\n\n            {/* Coupon code input */}\n            {selectedPackage && (\n              <div className="space-y-2 mt-4 mb-4">\n                {appliedCoupon ? (\n                  <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-50 border border-emerald-200">\n                    <div className="flex items-center gap-2 text-emerald-700 text-sm">\n                      <Tag className="w-4 h-4" />\n                      <span className="font-medium">{appliedCoupon.code}</span>\n                      <span>— ₹{appliedCoupon.discount_applied} off</span>\n                    </div>\n                    <button\n                      type="button"\n                      onClick={handleRemoveCoupon}\n                      className="text-emerald-600 hover:text-emerald-800"\n                    >\n                      <X className="w-4 h-4" />\n                    </button>\n                  </div>\n                ) : (\n                  <div className="flex gap-2">\n                    <Input\n                      placeholder="Coupon code"\n                      value={couponCode}\n                      onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponError(null); }}\n                      onKeyDown={(e) => {\n                        if (e.key === "Enter") {\n                          e.preventDefault();\n                          handleApplyCoupon(selectedPackage);\n                        }\n                      }}\n                      className="h-9 text-sm"\n                    />\n                    <Button\n                      type="button"\n                      variant="outline"\n                      size="sm"\n                      className="h-9 px-3 shrink-0"\n                      onClick={() => handleApplyCoupon(selectedPackage)}\n                      disabled={!couponCode.trim() || couponLoading}\n                    >\n                      {couponLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Apply"}\n                    </Button>\n                  </div>\n                )}\n                {couponError && <p className="text-xs text-red-500">{couponError}</p>}\n              </div>\n            )}\n\n            <Button\n              ref={confirmPaymentButtonRef}`
    );
    
    // Replace the button text to show discounted price if applicable
    content = content.replace(
      /Pay ₹\$\{selectedPackage \? \(selectedPackage\.price \/ 100\)\.toFixed\(0\) : "0"\} & Confirm Booking/,
      `Pay ₹\${selectedPackage ? Math.max(1, (selectedPackage.price / 100) - (appliedCoupon?.discount_applied || 0)).toFixed(0) : "0"} & Confirm Booking`
    );
  }

  fs.writeFileSync(file, content);
  console.log('Patched PublicBookingModal.tsx');
}

try {
  patchDashboard();
  patchPublicBooking();
} catch (e) {
  console.error(e);
}
