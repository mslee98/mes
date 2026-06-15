export function isCopyableClipboardText(value: string): boolean {
  const text = value.trim();
  return text.length > 0 && text !== "-";
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  const value = text.trim();
  if (!isCopyableClipboardText(value)) return false;

  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}
