"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { CompanyVehicle } from "@/types/database";
import { Button } from "@/components/ui/button";
import { VehicleInspectionCapture } from "@/components/shift/vehicle-inspection-capture";

type Step = "choose" | "select-vehicle" | "inspection";

interface StartShiftFlowProps {
  driverId: string;
  shiftId: string | null;
  vehicles: CompanyVehicle[];
}

export function StartShiftFlow({ driverId, shiftId, vehicles }: StartShiftFlowProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("choose");
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(vehicles[0]?.id ?? "");
  const [inspectionId, setInspectionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isStartingPersonal, setIsStartingPersonal] = useState(false);
  const [isCreatingInspection, setIsCreatingInspection] = useState(false);

  async function startPersonalShift() {
    setError(null);
    setIsStartingPersonal(true);
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc("start_shift", {
      p_shift_id: shiftId,
      p_vehicle_type: "personal",
      p_start_inspection_id: null,
    });
    setIsStartingPersonal(false);

    if (rpcError) {
      setError("Could not start your shift. Please try again.");
      return;
    }

    router.push("/");
    router.refresh();
  }

  async function beginCompanyInspection() {
    if (!selectedVehicleId) {
      setError("Select a vehicle first.");
      return;
    }
    setError(null);
    setIsCreatingInspection(true);
    const supabase = createClient();
    const { data, error: rpcError } = await supabase.rpc("create_vehicle_inspection", {
      p_company_vehicle_id: selectedVehicleId,
      p_inspection_type: "start",
    });
    setIsCreatingInspection(false);

    if (rpcError || !data) {
      setError("Could not start the inspection. Please try again.");
      return;
    }

    setInspectionId(data);
    setStep("inspection");
  }

  async function finishCompanyShift() {
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc("start_shift", {
      p_shift_id: shiftId,
      p_vehicle_type: "company",
      p_start_inspection_id: inspectionId,
    });

    if (rpcError) {
      throw new Error("Could not start your shift after the inspection. Please try again.");
    }

    router.push("/");
    router.refresh();
  }

  if (step === "choose") {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-slate-600">Which vehicle are you using today?</p>

        <button
          type="button"
          onClick={startPersonalShift}
          disabled={isStartingPersonal}
          className="rounded-2xl border-2 border-slate-200 bg-white p-5 text-left disabled:opacity-60"
        >
          <p className="text-lg font-bold text-slate-900">Personal Vehicle</p>
          <p className="text-sm text-slate-500">No inspection needed — start straight away.</p>
        </button>

        <button
          type="button"
          onClick={() => setStep("select-vehicle")}
          className="rounded-2xl border-2 border-slate-200 bg-white p-5 text-left"
        >
          <p className="text-lg font-bold text-slate-900">Company Vehicle</p>
          <p className="text-sm text-slate-500">Requires a quick 3-photo handover check.</p>
        </button>

        {isStartingPersonal && <p className="text-sm text-slate-500">Starting your shift…</p>}
        {error && (
          <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}
      </div>
    );
  }

  if (step === "select-vehicle") {
    return (
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-slate-700">Select vehicle</span>
          {vehicles.length === 0 ? (
            <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
              No active company vehicles are configured. Ask an admin to add one, or use a personal vehicle.
            </p>
          ) : (
            <select
              value={selectedVehicleId}
              onChange={(event) => setSelectedVehicleId(event.target.value)}
              className="min-h-12 rounded-xl border border-slate-300 px-4 text-base"
            >
              {vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.internal_name} ({vehicle.registration})
                </option>
              ))}
            </select>
          )}
        </label>

        {error && (
          <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        <Button onClick={beginCompanyInspection} disabled={isCreatingInspection || vehicles.length === 0} fullWidth>
          {isCreatingInspection ? "Starting inspection…" : "Continue to photo check"}
        </Button>
        <button type="button" onClick={() => setStep("choose")} className="text-sm text-slate-500">
          Back
        </button>
      </div>
    );
  }

  // step === "inspection"
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-slate-600">
        Take a photo of each area before you start. Your shift only begins once all three are saved.
      </p>
      <VehicleInspectionCapture
        inspectionId={inspectionId!}
        driverId={driverId}
        submitLabel="Submit inspection & start shift"
        onComplete={finishCompanyShift}
      />
    </div>
  );
}
