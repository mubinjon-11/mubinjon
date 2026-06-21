import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Ban, LogOut } from "lucide-react";

function formatRemaining(ms: number) {
  if (ms <= 0) return "00:00:00";
  const totalSec = Math.floor(ms / 1000);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return d > 0
    ? `${d} kun ${pad(h)}:${pad(m)}:${pad(s)}`
    : `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export function BlockedOverlay() {
  const { block, signOut, refreshBlock } = useAuth();
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!block.isBlocked && !block.blockedUntil) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [block.isBlocked, block.blockedUntil]);

  // When timer ends, refresh from server so overlay disappears.
  useEffect(() => {
    if (!block.blockedUntil) return;
    const remaining = new Date(block.blockedUntil).getTime() - Date.now();
    if (remaining <= 0) {
      refreshBlock();
      return;
    }
    const id = setTimeout(() => refreshBlock(), remaining + 500);
    return () => clearTimeout(id);
  }, [block.blockedUntil, refreshBlock]);

  if (!block.isBlocked && !block.blockedUntil) return null;

  const remainingMs = block.blockedUntil
    ? new Date(block.blockedUntil).getTime() - Date.now()
    : 0;

  return (
    <div className="fixed inset-0 z-[9999] bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-6 space-y-4 border-destructive/40">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <Ban className="h-6 w-6 text-destructive" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Akkauntingiz bloklangan</h2>
            <p className="text-sm text-muted-foreground">
              Administrator tomonidan saytdan foydalanish cheklangan.
            </p>
          </div>
        </div>

        {block.isBlocked ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
            Sizning akkauntingiz <strong>doimiy ravishda</strong> bloklangan.
            Administratorga murojaat qiling.
          </div>
        ) : (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-center">
            <div className="text-xs text-muted-foreground uppercase tracking-wider">
              Sizni quyidagi vaqtga bloklashdi
            </div>
            <div className="mt-2 font-mono text-3xl font-bold text-destructive">
              {formatRemaining(remainingMs)}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              Tugaydi: {new Date(block.blockedUntil!).toLocaleString("uz-UZ")}
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Blok davomida hech qanday vazifa bajara olmaysiz.
        </p>

        <Button variant="outline" className="w-full" onClick={signOut}>
          <LogOut className="h-4 w-4" />
          Chiqish
        </Button>
      </Card>
    </div>
  );
}
