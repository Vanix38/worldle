import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Worlddle – Devine le personnage",
  description: "Jeu de devinette de personnages par univers (One Piece, Naruto, LoL, DBD, YouTubeurs FR). Joue à l'infini.",
};

import { GameLayout } from "@/components/layout/GameLayout";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-gray-900 text-gray-100 antialiased">
        <GameLayout>{children}</GameLayout>
      </body>
    </html>
  );
}
