"use client";

import { usePathname } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { stripAccents } from "@/lib/utils";

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RulesModal({ isOpen, onClose }: RulesModalProps) {
  const pathname = usePathname();
  const basePath = (process.env.NEXT_PUBLIC_BASE_PATH || "").replace(/^\/+|\/+$/g, "");
  const prefix = basePath ? `/${basePath}` : "";
  const pathSansBase =
    prefix && pathname.startsWith(prefix) ? pathname.slice(prefix.length) || "/" : pathname;
  const isLogoQuiz = pathSansBase.startsWith("/logo/");

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={stripAccents("Comment jouer ?")}>
      {isLogoQuiz ? (
        <ul className="space-y-3 text-left">
          <li>
            {stripAccents(
              "Choisis un pack, puis un logo dans la liste (eventuellement par section)."
            )}
          </li>
          <li>
            {stripAccents(
              "Compose le nom avec les lettres. Tu peux retirer une lettre non verrouillee, passer au suivant, ou revenir a la liste."
            )}
          </li>
          <li>
            {stripAccents(
              "Apres une tentative : lettres bien placees restent (vert), presentes mais mal placees reviennent en jaune, absentes reviennent grisees."
            )}
          </li>
          <li>
            {stripAccents(
              "Les logos trouves sont marques dans la liste. Un badge indique la difficulte (TF a I)."
            )}
          </li>
        </ul>
      ) : (
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
      )}
    </Modal>
  );
}
