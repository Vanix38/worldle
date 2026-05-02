"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { stripAccents } from "@/lib/utils";

const STORAGE_KEY = "worlddle-onboarding-seen";

export function OnboardingModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    try {
      const seen = localStorage.getItem(STORAGE_KEY);
      if (!seen) setIsOpen(true);
    } catch {
      setIsOpen(true);
    }
  }, []);

  const handleClose = (dismissForever?: boolean) => {
    setIsOpen(false);
    if (dismissForever) {
      try {
        localStorage.setItem(STORAGE_KEY, "1");
      } catch {}
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => handleClose()}
      title={stripAccents("Bienvenue sur Worlddle !")}
      closeLabel={stripAccents("Compris")}
    >
      <div className="space-y-4">
        <p className="text-gray-300">
          {stripAccents(
            "Devine le personnage mystère en faisant des tentatives. Chaque essai te donne un feedback par catégorie."
          )}
        </p>
        <ul className="space-y-2 text-left text-gray-300">
          <li>
            <span className="font-medium text-green-400">Vert</span>
            {stripAccents(" = identique")}
          </li>
          <li>
            <span className="font-medium text-amber-400">Orange</span>
            {stripAccents(" = partiel ou plus haut/bas")}
          </li>
          <li>
            <span className="font-medium text-red-400">Rouge</span>
            {stripAccents(" = différent")}
          </li>
        </ul>
        <div className="flex flex-wrap gap-2 pt-2">
          <Button variant="primary" size="md" onClick={() => handleClose(true)}>
            {stripAccents("Compris, ne plus afficher")}
          </Button>
          <Button variant="ghost" size="md" onClick={() => handleClose()}>
            Fermer
          </Button>
        </div>
      </div>
    </Modal>
  );
}
