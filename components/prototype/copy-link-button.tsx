"use client";

import { useState } from "react";
import { MockButton } from "./ui";

export function CopyLinkButton({
  className = "",
  label = "Copy Link",
  path,
}: {
  className?: string;
  label?: string;
  path: string;
}) {
  return (
    <CopyTextButton
      className={className}
      label={label}
      text={() => new URL(path, window.location.origin).toString()}
    />
  );
}

export function CopyTextButton({
  className = "",
  label = "Copy Text",
  text,
}: {
  className?: string;
  label?: string;
  text: string | (() => string);
}) {
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">(
    "idle",
  );

  async function copyText() {
    try {
      const value = typeof text === "function" ? text() : text;

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        copyTextFallback(value);
      }

      setCopyStatus("copied");
      window.setTimeout(() => setCopyStatus("idle"), 1800);
    } catch {
      setCopyStatus("error");
      window.setTimeout(() => setCopyStatus("idle"), 2200);
    }
  }

  return (
    <MockButton className={className} onClick={() => void copyText()} tone="ghost">
      {copyStatus === "copied"
        ? "Copied"
        : copyStatus === "error"
          ? "Copy Failed"
          : label}
    </MockButton>
  );
}

function copyTextFallback(value: string) {
  const textArea = document.createElement("textarea");
  textArea.value = value;
  textArea.style.left = "-9999px";
  textArea.style.position = "fixed";
  textArea.style.top = "0";
  document.body.append(textArea);
  textArea.focus();
  textArea.select();
  document.execCommand("copy");
  textArea.remove();
}
