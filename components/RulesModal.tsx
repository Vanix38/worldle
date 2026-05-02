"use client";

import { Modal } from "@/components/ui/Modal";
import { stripAccents } from "@/lib/utils";

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RulesModal({ isOpen, onClose }: RulesModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={stripAccents("Comment jouer ?")}>
      <ul className="space-y-3 text-left">
        <li>{stripAccents("Choisis un univers (Marvel, One Piece, etc.).")}</li>
        <li>{stripAccents("Tape le nom d'un personnage pour faire une tentative.")}</li>
        <li>
          {stripAccents(
            "Chaque essai te donne un feedback par catégorie : vert = identique, orange = partiel ou plus haut/bas, rouge = différent."
          )}
        </li>
        <li>{stripAccents("Trouve le personnage mystère en un minimum de coups !")}</li>
      </ul>
    </Modal>
  );
}
