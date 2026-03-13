"use client";

import { stripAccents } from "@/lib/utils";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { motion } from "framer-motion";

interface ShareResultProps {
  characterName: string;
  guessCount: number;
  onNewGame: () => void;
}

export function ShareResult({ characterName, guessCount, onNewGame }: ShareResultProps) {
  const text = `J'ai trouvé ${characterName} en ${guessCount} coup${guessCount > 1 ? "s" : ""} !`;

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Worlddle",
          text,
        });
      } catch (err) {
        copyToClipboard(text);
      }
    } else {
      copyToClipboard(text);
    }
  };

  function copyToClipboard(str: string) {
    navigator.clipboard.writeText(str);
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: [0.98, 1.02, 1] }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <Card
        variant="elevated"
        padding="md"
        className="border-green-600/50 bg-green-900/20 text-center"
      role="status"
      aria-live="polite"
      aria-label={`Victoire : ${characterName} en ${guessCount} coup${guessCount > 1 ? "s" : ""}`}
    >
      <p className="mb-2 text-lg font-semibold text-green-400">Bravo !</p>
      <p className="mb-4 text-white">
        C&apos;était <strong>{stripAccents(characterName)}</strong> en {guessCount} coup
        {guessCount > 1 ? "s" : ""}.
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <Button variant="primary" size="md" onClick={handleShare} aria-label="Partager le résultat">
          Partager
        </Button>
        <Button variant="secondary" size="md" onClick={onNewGame} aria-label="Nouvelle partie">
          Nouvelle partie
        </Button>
      </div>
    </Card>
    </motion.div>
  );
}
