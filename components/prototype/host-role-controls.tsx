"use client";

import { useState } from "react";
import { MockButton, Panel, Pill } from "./ui";

export function HostRoleControls() {
  const [coHostEnabled, setCoHostEnabled] = useState(true);
  const [hostLockEnabled, setHostLockEnabled] = useState(false);
  const [moderationQueue, setModerationQueue] = useState(true);

  return (
    <Panel className="p-4">
      <p className="text-sm font-semibold uppercase text-zinc-500">
        Host crew
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Pill tone="gold">Host: Maya</Pill>
        <Pill tone="cyan">Co-host: Devin</Pill>
        <Pill tone="neutral">Moderator: Tasha</Pill>
      </div>
      <div className="mt-5 grid gap-2">
        <MockButton
          onClick={() => setHostLockEnabled((value) => !value)}
          tone={hostLockEnabled ? "primary" : "ghost"}
        >
          Host Lock {hostLockEnabled ? "On" : "Off"}
        </MockButton>
        <MockButton
          onClick={() => setCoHostEnabled((value) => !value)}
          tone={coHostEnabled ? "secondary" : "ghost"}
        >
          Co-host Controls {coHostEnabled ? "On" : "Off"}
        </MockButton>
        <MockButton
          onClick={() => setModerationQueue((value) => !value)}
          tone={moderationQueue ? "secondary" : "ghost"}
        >
          Mod Queue {moderationQueue ? "On" : "Off"}
        </MockButton>
      </div>
    </Panel>
  );
}
