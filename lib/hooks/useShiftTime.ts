"use client";

import { useEffect, useState } from "react";
import {
  getShiftDayStart,
  getPunchWindowMessage,
  isWithinPunchWindow,
} from "@/lib/utils/shiftTime";

interface ShiftTime {
  isWithinWindow: boolean;
  windowMessage: string;
  shiftDayStart: Date;
}

function getState(): ShiftTime {
  return {
    isWithinWindow: isWithinPunchWindow(),
    windowMessage: getPunchWindowMessage(),
    shiftDayStart: getShiftDayStart(),
  };
}

export function useShiftTime(): ShiftTime {
  const [state, setState] = useState<ShiftTime>(getState);

  useEffect(() => {
    const update = () => setState(getState());

    // Re-evaluate every minute so the countdown stays accurate
    const interval = setInterval(update, 60_000);

    // Re-evaluate when the user brings the app to the foreground
    const handleVisibility = () => {
      if (document.visibilityState === "visible") update();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  return state;
}
