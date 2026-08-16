const SECRET_KEYS = [
  "KREA_API_KEY",
  "authorization",
  "Authorization",
  "api_key",
  "apiKey",
];

function looksLikeBearer(value: string): boolean {
  return (
    /^bearer\s+\S+/i.test(value) || /^krea_[A-Za-z0-9_-]{8,}$/i.test(value)
  );
}

export function redactSecrets(
  value: unknown,
  extraSecrets: string[] = [],
): unknown {
  const secrets = extraSecrets.filter((s) => s.length > 0);
  const scrub = (input: string): string => {
    let next = input;
    for (const secret of secrets) {
      if (secret) next = next.split(secret).join("[redacted]");
    }
    if (looksLikeBearer(next)) return "[redacted]";
    return next;
  };

  const walk = (node: unknown): unknown => {
    if (typeof node === "string") return scrub(node);
    if (Array.isArray(node)) return node.map(walk);
    if (node && typeof node === "object") {
      const out: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(node)) {
        if (SECRET_KEYS.includes(key)) {
          out[key] = val ? "[redacted]" : val;
        } else {
          out[key] = walk(val);
        }
      }
      return out;
    }
    return node;
  };

  return walk(value);
}

export function assertNoSecretLeak(text: string, secrets: string[]): void {
  for (const secret of secrets) {
    if (secret && text.includes(secret)) {
      throw new Error(
        "Refusing to write a live-run artifact that contains a secret.",
      );
    }
  }
}
