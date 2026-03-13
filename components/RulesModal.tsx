"use client";

import { Modal } from "@/components/ui/Modal";

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RulesModal({ isOpen, onClose }: RulesModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Comment jouer ?">
      <ul className="space-y-3 text-left">
        <li>Choisis un univers (Marvel, One Piece, etc.).</li>
        <li>Tape le nom d&apos;un personnage pour faire une tentative.</li>
        <li>
          Chaque essai te donne un feedback par catégorie : vert = identique,
          orange = partiel ou plus haut/bas, rouge = différent.
        </li>
        <li>Trouve le personnage mystère en un minimum de coups !</li>
      </ul>
    </Modal>
  );
}
