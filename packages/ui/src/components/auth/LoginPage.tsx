import { useState } from "react";

const BASE = "/api";

async function verifyToken(token: string): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/auth/ping`, {
      headers: { "x-studio-token": token },
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function LoginPage({ onLogin }: { onLogin: () => void }) {
  const [passphrase, setPassphrase] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const ok = await verifyToken(passphrase.trim());
    if (ok) {
      localStorage.setItem("studio-token", passphrase.trim());
      onLogin();
    } else {
      setError("Incorrect passphrase.");
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[--color-bg-body]">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-[--color-accent] flex items-center justify-center text-white font-bold text-sm mb-4">
            MPS
          </div>
          <h1 className="font-serif text-2xl font-bold text-[--color-text-primary]">
            Mangrove Publication Studio
          </h1>
          <p className="text-sm text-[--color-text-muted] mt-1">
            Enter your passphrase to continue
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <input
              type="password"
              placeholder="Passphrase"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              autoFocus
              className="w-full px-4 py-3 bg-[--color-bg-card] border border-[--color-bg-accent] rounded-xl text-[--color-text-primary] placeholder:text-[--color-text-muted] focus:outline-none focus:ring-2 focus:ring-[--color-accent] text-sm"
            />
          </div>

          {error && (
            <p className="text-sm text-red-400 text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={!passphrase || loading}
            className="w-full py-3 bg-[--color-accent] text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? "Verifying…" : "Enter Studio"}
          </button>
        </form>

        <p className="text-center text-[10px] text-[--color-text-muted] mt-8">
          Mangrove Publishing LLC · Private access only
        </p>
      </div>
    </div>
  );
}
