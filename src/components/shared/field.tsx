export function Field({ label, value, sensitive, mono }: { label: string; value?: string | null; sensitive?: boolean; mono?: boolean }) {
  return (
    <div>
      <p className="text-muted-foreground">{label}</p>
      <p className={`font-medium ${sensitive ? "text-muted-foreground italic" : ""} ${mono ? "font-mono text-xs" : ""}`}>{value || "—"}</p>
    </div>
  );
}
