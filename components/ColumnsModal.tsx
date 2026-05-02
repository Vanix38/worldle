"use client";

import { useCallback, useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { stripAccents } from "@/lib/utils";
import type { ColumnDocRow, FieldMappingFonction } from "@/types/game";

interface ColumnsModalProps {
  universeId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

function fonctionLabel(f: FieldMappingFonction): string {
  switch (f) {
    case "Classique":
      return "Classique";
    case "Recherche":
      return "Recherche";
    case "Comparaison":
      return "Comparaison";
    case "ComparaisonDate":
      return "Comparaison (date)";
    case "ComparaisonChiffre":
      return "Comparaison (nombre)";
    case "Indice":
      return "Indice";
    default:
      return f;
  }
}

export function ColumnsModal({ universeId, isOpen, onClose }: ColumnsModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [universeName, setUniverseName] = useState("");
  const [rows, setRows] = useState<ColumnDocRow[]>([]);

  const load = useCallback(async () => {
    if (!universeId) return;
    setLoading(true);
    setError(null);
    try {
      const bp = (process.env.NEXT_PUBLIC_BASE_PATH || "").replace(/^\/+|\/+$/g, "");
      const segments = [bp, "api", "universe", encodeURIComponent(universeId), "columns"].filter(
        Boolean,
      );
      const path = `/${segments.join("/")}`.replace(/\/{2,}/g, "/");
      const res = await fetch(path);
      if (!res.ok) {
        setError(stripAccents("Impossible de charger les colonnes."));
        setRows([]);
        return;
      }
      const data = (await res.json()) as {
        universeName: string;
        columns: ColumnDocRow[];
      };
      setUniverseName(data.universeName);
      setRows(data.columns);
    } catch {
      setError(stripAccents("Erreur réseau."));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [universeId]);

  useEffect(() => {
    if (isOpen && universeId) void load();
  }, [isOpen, universeId, load]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={stripAccents("Colonnes")}
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
          ) : (
            <ul className="max-h-[min(70vh,28rem)] space-y-4 overflow-y-auto pr-1">
              {rows.map((row) => (
                <li
                  key={row.key}
                  className="rounded-lg border border-gray-600/80 bg-gray-800/40 px-3 py-2.5"
                >
                  <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-semibold text-white">{stripAccents(row.header)}</span>
                    <span className="rounded bg-gray-700/80 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-gray-400">
                      {fonctionLabel(row.fonction)}
                    </span>
                  </div>
                  {row.hintPrompt ? (
                    <p className="mb-1 text-xs text-amber-200/90">
                      {stripAccents("Indice :")} {stripAccents(row.hintPrompt)}
                    </p>
                  ) : null}
                  <p className="text-sm leading-relaxed text-gray-300">
                    {row.description
                      ? stripAccents(row.description)
                      : stripAccents("Aucune description pour ce champ.")}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </Modal>
  );
}
