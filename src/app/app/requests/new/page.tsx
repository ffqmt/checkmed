import { NewRequestForm } from "./new-request-form";

export default function NewRequestPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Nova solicitação de validação</h2>
        <p className="text-sm text-muted-foreground">
          Envie o atestado médico do colaborador para iniciar a análise automática.
        </p>
      </div>
      <NewRequestForm />
    </div>
  );
}
