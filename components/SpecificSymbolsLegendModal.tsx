"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { labelFromSymbolFilename } from "@/lib/specific-symbol-label";
import { stripAccents } from "@/lib/utils";
import type { SpecificSymbolEntry } from "@/types/game";

interface SpecificSymbolsLegendModalProps {
  universeId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function SpecificSymbolsLegendModal({
  universeId,
  isOpen,
  onClose,
}: SpecificSymbolsLegendModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [universeName, setUniverseName] = useState("");
  const [symbols, setSymbols] = useState<SpecificSymbolEntry[]>([]);

  const load = useCallback(async () => {
    if (!universeId) return;
    setLoading(true);
    setError(null);
    try {
      const bp = (process.env.NEXT_PUBLIC_BASE_PATH || "").replace(/^\/+|\/+$/g, "");
      const segments = [
        bp,
        "api",
        "universe",
        encodeURIComponent(universeId),
        "specific-symbols",
      ].filter(Boolean);
      const path = `/${segments.join("/")}`.replace(/\/{2,}/g, "/");
      const res = await fetch(path);
      if (!res.ok) {
        setError(stripAccents("Impossible de charger les symboles."));
        setSymbols([]);
        return;
      }
      const data = (await res.json()) as {
        universeName: string;
        symbols: SpecificSymbolEntry[];
      };
      setUniverseName(data.universeName);
      setSymbols(data.symbols ?? []);
    } catch {
      setError(stripAccents("Erreur réseau."));
      setSymbols([]);
    } finally {
      setLoading(false);
    }
  }, [universeId]);

  useEffect(() => {
    if (isOpen && universeId) void load();
  }, [isOpen, universeId, load]);

  const sorted = useMemo(() => {
    return [...symbols].sort((a, b) =>
      labelFromSymbolFilename(a.filename).localeCompare(
        labelFromSymbolFilename(b.filename),
        "fr",
      ),
    );
  }, [symbols]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={stripAccents("Symboles")}
      closeLabel={stripAccents("Fermer la boîte de dialogue")}
      contentClassName="text-gray-200"
    >
      {universeId ? (
        <div className="space-y-4">
          <p className="text-sm text-gray-400">
            {stripAccents("Univers :")}{" "}
            <span className="font-medium text-gray-200">{stripAccents(universeName)}</span>
          </p>
          {loading ? (
            <p className="text-sm text-gray-400">{stripAccents("Chargement…")}</p>
          ) : error ? (
            <p className="text-sm text-red-400" role="alert">
              {error}
            </p>
          ) : sorted.length === 0 ? (
            <p className="text-sm text-gray-400">{stripAccents("Aucun symbole pour cet univers.")}</p>
          ) : (
            <ul className="grid max-h-[min(70vh,28rem)] grid-cols-3 gap-3 overflow-y-auto pr-1 sm:grid-cols-4">
              {sorted.map((sym) => {
                const label = labelFromSymbolFilename(sym.filename);
                return (
                  <li
                    key={sym.stem}
                    className="flex flex-col items-center gap-1.5 rounded-lg border border-gray-600/80 bg-gray-800/40 px-2 py-2.5 text-center"
                  >
                    <img
                      src={sym.url}
                      alt=""
                      className="h-10 w-10 shrink-0 rounded-sm object-contain sm:h-12 sm:w-12"
                    />
                    <span className="line-clamp-2 text-xs leading-tight text-gray-200">
                      {stripAccents(label)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}
    </Modal>
  );
}
