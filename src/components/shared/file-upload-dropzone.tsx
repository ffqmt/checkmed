"use client";

import * as React from "react";
import { UploadCloud, FileText, X } from "lucide-react";
import { cn } from "@/lib/utils";

const ACCEPTED = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];

export function FileUploadDropzone({
  name = "file",
  onFileChange,
}: {
  name?: string;
  onFileChange?: (file: File | null) => void;
}) {
  const [file, setFile] = React.useState<File | null>(null);
  const [dragOver, setDragOver] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  function setSelected(next: File | null) {
    setFile(next);
    onFileChange?.(next);
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        name={name}
        accept={ACCEPTED.join(",")}
        className="hidden"
        onChange={(e) => setSelected(e.target.files?.[0] ?? null)}
      />
      {!file ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const dropped = e.dataTransfer.files?.[0];
            if (dropped) setSelected(dropped);
          }}
          className={cn(
            "flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/30 px-6 py-10 text-center transition-colors",
            dragOver && "border-primary bg-primary/5",
          )}
        >
          <UploadCloud className="size-6 text-muted-foreground" />
          <p className="text-sm font-medium">Arraste o atestado aqui ou clique para selecionar</p>
          <p className="text-xs text-muted-foreground">PDF, JPG, JPEG ou PNG · até 15MB</p>
        </button>
      ) : (
        <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="rounded-md bg-muted p-2">
              <FileText className="size-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium">{file.name}</p>
              <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setSelected(null);
              if (inputRef.current) inputRef.current.value = "";
            }}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
      )}
    </div>
  );
}
