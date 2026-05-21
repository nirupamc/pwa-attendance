"use client";

import { useMemo, useState } from "react";
import { Wifi } from "lucide-react";
import { normalizeBSSID, isValidBSSID } from "@/lib/utils/bssid";
import { OfficeNetwork } from "@/lib/types";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface BSSIDGuideModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingNetworks: OfficeNetwork[];
  onSave: (data: { label: string; bssid: string }) => Promise<void>;
}

export const BSSIDGuideModal = ({
  open,
  onOpenChange,
  existingNetworks,
  onSave,
}: BSSIDGuideModalProps) => {
  const [step, setStep] = useState(1);
  const [bssidInput, setBssidInput] = useState("");
  const [label, setLabel] = useState("");

  const normalized = useMemo(() => normalizeBSSID(bssidInput), [bssidInput]);
  const isValid = useMemo(() => isValidBSSID(normalized), [normalized]);
  const duplicate = existingNetworks.find(
    (network) => network.bssid === normalized
  );

  const reset = () => {
    setStep(1);
    setBssidInput("");
    setLabel("");
  };

  const handleSave = async () => {
    await onSave({ label, bssid: normalized });
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) reset();
        onOpenChange(value);
      }}
    >
      <DialogContent className="h-screen w-screen max-w-none rounded-none border-border bg-background p-6">
        {step === 1 && (
          <div className="flex h-full flex-col justify-between">
            <div>
              <h2 className="font-heading text-2xl uppercase tracking-[3px] text-primary">
                Step 1: Connect to the Office WiFi
              </h2>
              <p className="mt-3 text-text-muted">
                Before finding your BSSID, make sure your phone or laptop is
                connected to the office WiFi network you want to add.
              </p>
              <div className="mt-8 flex items-center justify-center">
                <div className="rounded-full bg-primary/10 p-6 text-primary">
                  <Wifi size={48} />
                </div>
              </div>
            </div>
            <Button
              className="bg-primary text-background hover:bg-primary-dark"
              onClick={() => setStep(2)}
            >
              I&apos;m connected → Next
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="flex h-full flex-col justify-between">
            <div>
              <h2 className="font-heading text-2xl uppercase tracking-[3px] text-primary">
                Step 2: Find Your Network&apos;s BSSID
              </h2>
              <Tabs defaultValue="android" className="mt-4">
                <TabsList className="grid w-full grid-cols-3 bg-surface">
                  <TabsTrigger value="android">Android Phone</TabsTrigger>
                  <TabsTrigger value="iphone">iPhone</TabsTrigger>
                  <TabsTrigger value="router">Router Admin Panel</TabsTrigger>
                </TabsList>
                <TabsContent value="android" className="mt-4 text-sm text-text-muted">
                  <ol className="list-decimal space-y-2 pl-5">
                    <li>Open Settings on your Android phone</li>
                    <li>Tap WiFi or Connections</li>
                    <li>Tap the name of your connected office WiFi</li>
                    <li>Find MAC address or BSSID (aa:bb:cc:dd:ee:ff)</li>
                    <li>Copy that value and paste it below</li>
                  </ol>
                  <p className="mt-3 text-xs">Example: a4:c3:f0:85:ac:23</p>
                </TabsContent>
                <TabsContent value="iphone" className="mt-4 text-sm text-text-muted">
                  <ol className="list-decimal space-y-2 pl-5">
                    <li>Open Settings on your iPhone</li>
                    <li>Tap WiFi</li>
                    <li>Tap the ⓘ icon next to your office WiFi</li>
                    <li>Look for Router (aa:bb:cc:dd:ee:ff)</li>
                    <li>Copy that value and paste it below</li>
                  </ol>
                  <p className="mt-3 text-xs">Example: a4:c3:f0:85:ac:23</p>
                </TabsContent>
                <TabsContent value="router" className="mt-4 text-sm text-text-muted">
                  <ol className="list-decimal space-y-2 pl-5">
                    <li>Open a browser and go to 192.168.1.1</li>
                    <li>Log in (often admin/admin)</li>
                    <li>Go to Wireless Settings or WiFi Status</li>
                    <li>Find BSSID or MAC Address</li>
                    <li>Copy that value and paste it below</li>
                  </ol>
                </TabsContent>
              </Tabs>

              <div className="mt-6 space-y-2">
                <label className="text-xs uppercase tracking-[2px] text-text-muted">
                  Paste your BSSID here
                </label>
                <Input
                  placeholder="e.g. aa:bb:cc:dd:ee:ff"
                  value={bssidInput}
                  onChange={(event) =>
                    setBssidInput(normalizeBSSID(event.target.value))
                  }
                />
                <p className="text-xs text-text-muted">
                  Will be saved as: {normalized || "--"}
                </p>
                {duplicate && (
                  <p className="text-xs text-warning">
                    This network is already saved as &quot;{duplicate.label}
                    &quot;
                  </p>
                )}
                {bssidInput && !duplicate && (
                  <p className={`text-xs ${isValid ? "text-success" : "text-danger"}`}>
                    {isValid ? "BSSID format looks good" : "Invalid BSSID format"}
                  </p>
                )}
              </div>
            </div>
            <Button
              className="bg-primary text-background hover:bg-primary-dark"
              disabled={!isValid || Boolean(duplicate)}
              onClick={() => setStep(3)}
            >
              BSSID looks good → Next
            </Button>
          </div>
        )}

        {step === 3 && (
          <div className="flex h-full flex-col justify-between">
            <div>
              <h2 className="font-heading text-2xl uppercase tracking-[3px] text-primary">
                Step 3: Give This Network a Name
              </h2>
              <p className="mt-3 text-text-muted">
                Add a label so you know which access point this is.
              </p>
              <div className="mt-6 space-y-2">
                <label className="text-xs uppercase tracking-[2px] text-text-muted">
                  Network Label
                </label>
                <Input
                  placeholder="e.g. Main Router, Floor 2 TP-Link"
                  value={label}
                  onChange={(event) => setLabel(event.target.value)}
                />
              </div>
              <div className="mt-6 rounded-xl border border-border bg-surface p-4 text-sm">
                <p>Label: {label || "--"}</p>
                <p>BSSID: {normalized}</p>
              </div>
            </div>
            <Button
              className="bg-primary text-background hover:bg-primary-dark"
              disabled={!label}
              onClick={handleSave}
            >
              Save Network
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
