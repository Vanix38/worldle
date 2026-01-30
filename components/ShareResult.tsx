"use client";

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
    <div
      className="rounded-lg border border-green-600/50 bg-green-900/20 p-4 text-center"
      role="status"
      aria-live="polite"
      aria-label={`Victoire : ${characterName} en ${guessCount} coup${guessCount > 1 ? "s" : ""}`}
    >
      <p className="mb-2 text-lg font-semibold text-green-400">Bravo !</p>
      <p className="mb-4 text-white">
        C'était <strong>{characterName}</strong> en {guessCount} coup
        {guessCount > 1 ? "s" : ""}.
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={handleShare}
          className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2 focus:ring-offset-gray-900"
          aria-label="Partager le résultat"
        >
          Partager
        </button>
        <button
          type="button"
          onClick={onNewGame}
          className="rounded-lg bg-gray-600 px-4 py-2 text-sm font-medium text-white hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 focus:ring-offset-gray-900"
          aria-label="Nouvelle partie"
        >
          Nouvelle partie
        </button>
      </div>
    </div>
  );
}
