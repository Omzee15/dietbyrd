import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { getConsultationPreview } from "@/lib/api";

const Pay: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const ref = searchParams.get("ref");
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = ref ? Number(ref) : null;
    if (!id) {
      setError("Missing reference id");
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const data = await getConsultationPreview(id);
        setPreview(data);
      } catch (err: any) {
        setError(err?.message || "Failed to load preview");
      } finally {
        setLoading(false);
      }
    })();
  }, [ref]);

  if (loading) return <div className="p-6">Loading…</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!preview) return <div className="p-6">No preview found.</div>;

  const amountINR = (preview.amount || 0) / 100;

  return (
    <div className="max-w-xl mx-auto p-6">
      <h2 className="text-2xl font-semibold mb-4">Confirm & Pay</h2>
      <div className="bg-white shadow p-4 rounded">
        <p><strong>Patient:</strong> {preview.patient_name}</p>
        <p><strong>Doctor:</strong> {preview.doctor_name || 'DietByRD'}</p>
        <p><strong>Diagnosis:</strong> {preview.diagnosis || '—'}</p>
        <p className="mt-4 text-lg"><strong>Amount:</strong> ₹{amountINR.toFixed(2)}</p>
        <div className="mt-6">
          <button className="btn btn-primary" onClick={() => navigate(`/register?ref=${ref}`)}>Pay & Register (Manual)</button>
        </div>
      </div>
    </div>
  );
};

export default Pay;
