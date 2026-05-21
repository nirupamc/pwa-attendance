"use client";

import { useEffect, useState } from "react";
import { Trash2, WifiOff, Plus } from "lucide-react";
import { toast } from "sonner";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { OfficeNetwork } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { BSSIDGuideModal } from "@/components/admin/BSSIDGuideModal";

export default function NetworksPage() {
  const [networks, setNetworks] = useState<OfficeNetwork[]>([]);
  const [openGuide, setOpenGuide] = useState(false);
  const [toDelete, setToDelete] = useState<OfficeNetwork | null>(null);

  const fetchNetworks = async () => {
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase.from("office_networks").select("*");
    setNetworks((data ?? []) as OfficeNetwork[]);
  };

  useEffect(() => {
    fetchNetworks();
  }, []);

  const handleSave = async (payload: { label: string; bssid: string }) => {
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.from("office_networks").insert({
      label: payload.label,
      ssid_name: payload.label,
      bssid: payload.bssid,
    });
    if (error) {
      toast.error("Unable to save network.");
      return;
    }
    toast.success("Network saved ✓");
    fetchNetworks();
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    const supabase = createSupabaseBrowserClient();
    await supabase.from("office_networks").delete().eq("id", toDelete.id);
    setToDelete(null);
    fetchNetworks();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-3xl uppercase tracking-[4px] text-primary">
          Office Networks
        </h1>
        <Button
          className="bg-primary text-background hover:bg-primary-dark"
          onClick={() => setOpenGuide(true)}
        >
          <Plus size={18} className="mr-2" />
          Add Network
        </Button>
      </div>

      {networks.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-6 text-center text-text-muted">
          <div className="flex items-center justify-center">
            <WifiOff className="text-primary" size={36} />
          </div>
          <p className="mt-2 font-heading text-lg uppercase tracking-[3px] text-primary">
            No Networks Configured
          </p>
          <p className="text-sm text-text-muted">
            Add your office WiFi networks so employees can be verified when
            punching in.
          </p>
          <Button
            className="mt-4 bg-primary text-background hover:bg-primary-dark"
            onClick={() => setOpenGuide(true)}
          >
            Add First Network
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {networks.map((network) => (
            <div
              key={network.id}
              className="flex items-center justify-between rounded-xl border border-border bg-surface p-4"
            >
              <div>
                <p className="font-heading text-lg uppercase tracking-[3px] text-primary">
                  {network.label}
                </p>
                <p className="text-xs text-text-muted">{network.ssid_name}</p>
                <p className="mt-1 text-xs font-mono text-text-muted">
                  {network.bssid}
                </p>
              </div>
              <button onClick={() => setToDelete(network)}>
                <Trash2 className="text-danger" size={18} />
              </button>
            </div>
          ))}
        </div>
      )}

      <BSSIDGuideModal
        open={openGuide}
        onOpenChange={setOpenGuide}
        existingNetworks={networks}
        onSave={handleSave}
      />

      <Dialog open={Boolean(toDelete)} onOpenChange={() => setToDelete(null)}>
        <DialogContent className="bg-surface border-border">
          <h3 className="font-heading text-xl uppercase tracking-[3px] text-primary">
            Delete Network
          </h3>
          <p className="text-sm text-text-muted">
            Delete {toDelete?.label}? This cannot be undone.
          </p>
          <div className="mt-4 flex gap-2">
            <Button
              variant="outline"
              className="border-border text-text-primary"
              onClick={() => setToDelete(null)}
            >
              Cancel
            </Button>
            <Button
              className="bg-danger text-background hover:bg-danger/90"
              onClick={handleDelete}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
