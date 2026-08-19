import { PitchDeckViewer } from "@/components/shared/pitch-deck-viewer";
import { PITCH_DECK } from "@/lib/pitch-deck";

export default function ApresentacaoPage() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Apresentação para o cliente</h2>
        <p className="text-sm text-muted-foreground">
          Use as setas do teclado ou os botões para navegar. Abra em tela cheia na hora de apresentar de verdade — os
          slides marcados como &quot;só para quem apresenta&quot; indicam onde fazer uma demonstração ao vivo.
        </p>
      </div>
      <PitchDeckViewer slides={PITCH_DECK} />
    </div>
  );
}
