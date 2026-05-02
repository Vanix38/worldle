"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import type { UniverseId } from "@/types/game";
import { useHardModeState } from "@/hooks/useHardModeState";
import { HardModeSection } from "@/components/HardModeSection";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { stripAccents } from "@/lib/utils";

type HardModeConfirmIntent = "start" | "newSeries" | null;

interface HardModeToolbarWithSectionProps {
  universeId: UniverseId;
}

export function HardModeToolbarWithSection({ universeId }: HardModeToolbarWithSectionProps) {
  const hardMode = useHardModeState(universeId);
  const [confirmIntent, setConfirmIntent] = useState<HardModeConfirmIntent>(null);

  const sessionActive = Boolean(hardMode.currentId || hardMode.foundIds.length > 0);
  const showResetSeries =
    hardMode.hydrated && !hardMode.allFound && sessionActive;

  const closeConfirmModal = useCallback(() => setConfirmIntent(null), []);

  const confirmModalAction = () => {
    if (confirmIntent === "newSeries") {
      hardMode.resetAndStartNewSeries();
    } else if (confirmIntent === "start") {
      hardMode.startSession();
    }
    setConfirmIntent(null);
  };

  const confirmModalTitle =
    confirmIntent === "newSeries"
      ? stripAccents("Nouvelle série ?")
      : confirmIntent === "start"
        ? stripAccents("Démarrer le portrait mystère ?")
        : "";

  const confirmModalBody =
    confirmIntent === "newSeries"
      ? stripAccents(
          "Recommencer une série efface la série actuelle et tire un nouveau personnage. La liste des trouvés sera réinitialisée."
        )
      : confirmIntent === "start"
        ? stripAccents(
            "Lancer une série portrait mystère ? Devine chaque personnage à partir de son image seule, sans grille ni suggestions."
          )
        : "";

  return (
    <>
      <div className="mb-4 flex w-full max-w-[13.5rem] flex-col gap-2 self-end sm:w-[13.5rem]">
        <Link
          href={`/game/${universeId}`}
          className="inline-flex min-h-[2.75rem] w-full items-center justify-center rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
        >
          Mode classique
        </Link>
        {showResetSeries ? (
          <Button
            type="button"
            variant="primary"
            size="md"
            className="w-full"
            onClick={() => hardMode.resetSession()}
          >
            {stripAccents("Réinitialiser la série")}
          </Button>
        ) : null}
      </div>

      <Modal
        isOpen={confirmIntent !== null}
        onClose={closeConfirmModal}
        title={confirmModalTitle}
        closeLabel={stripAccents("Fermer la boîte de dialogue")}
      >
        <p className="mb-6 text-sm leading-relaxed">{confirmModalBody}</p>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" size="md" type="button" onClick={closeConfirmModal}>
            Annuler
          </Button>
          <Button variant="primary" size="md" type="button" onClick={confirmModalAction}>
            {confirmIntent === "newSeries"
              ? stripAccents("Nouvelle série")
              : stripAccents("Commencer")}
          </Button>
        </div>
      </Modal>

      <HardModeSection
        hardMode={hardMode}
        onRequestStartWithConfirm={() => setConfirmIntent("start")}
        onRequestNewSeriesWithConfirm={() => setConfirmIntent("newSeries")}
      />
    </>
  );
}
