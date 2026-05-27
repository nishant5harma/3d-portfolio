type ClassValue = string | number | boolean | undefined | null;

export function cn(...inputs: (ClassValue | ClassValue[])[]): string {
  const out: string[] = [];
  for (const input of inputs) {
    if (!input) continue;
    if (Array.isArray(input)) {
      const nested = cn(...input);
      if (nested) out.push(nested);
    } else if (typeof input === "string") {
      out.push(input);
    } else if (typeof input === "number") {
      out.push(String(input));
    }
  }
  return out.join(" ");
}
