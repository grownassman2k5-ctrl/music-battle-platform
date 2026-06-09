export const maxChatMessageLength = 1000;
export const maxDisplayNameLength = 40;
export const maxEventNameLength = 100;
export const maxPasscodeLength = 80;
export const maxCsvCellLength = 500;

const eventSlugPattern = /^[a-z0-9][a-z0-9_-]{1,127}$/;
const controlCharacterPattern = /[\u0000-\u001F\u007F]/g;

export function cleanTextInput(value: string, maxLength: number) {
  return value
    .replace(controlCharacterPattern, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

export function validateAdminCode(value: string) {
  const code = value.trim();

  if (!code) {
    return {
      error: "Enter the admin access code.",
      value: "",
    };
  }

  if (code.length > 120) {
    return {
      error: "The admin access code is too long.",
      value: "",
    };
  }

  return { error: "", value: code };
}

export function validateEventSlug(value: string) {
  const eventSlug = value.trim().toLowerCase();

  if (!eventSlugPattern.test(eventSlug)) {
    return {
      error: "Event slug is not valid.",
      value: "",
    };
  }

  return { error: "", value: eventSlug };
}

export function validatePasscode(value: string) {
  const passcode = value.trim();

  if (!passcode) {
    return {
      error: "Enter the event passcode.",
      value: "",
    };
  }

  if (passcode.length > maxPasscodeLength) {
    return {
      error: `Passcodes must be ${maxPasscodeLength} characters or fewer.`,
      value: "",
    };
  }

  if (controlCharacterPattern.test(passcode)) {
    return {
      error: "Passcode contains unsupported characters.",
      value: "",
    };
  }

  return { error: "", value: passcode };
}

export function validateDisplayName(value: string) {
  const displayName = cleanTextInput(value, maxDisplayNameLength);

  if (!displayName) {
    return {
      error: "Enter a display name.",
      value: "",
    };
  }

  return { error: "", value: displayName };
}

export function validateEventName(value: string) {
  const eventName = cleanTextInput(value, maxEventNameLength);

  if (!eventName) {
    return {
      error: "Enter an event name.",
      value: "",
    };
  }

  return { error: "", value: eventName };
}

export function validateChatMessage(value: string) {
  const message = cleanTextInput(value, maxChatMessageLength);

  if (!message) {
    return {
      error: "Write a message before sending.",
      value: "",
    };
  }

  if (value.length > maxChatMessageLength) {
    return {
      error: `Chat messages must be ${maxChatMessageLength} characters or fewer.`,
      value: "",
    };
  }

  return { error: "", value: message };
}

export function sanitizeCsvCell(value: string) {
  return cleanTextInput(value, maxCsvCellLength);
}
