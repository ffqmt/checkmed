"use client";

import * as React from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type FilterSelectConfig = {
  paramName: string;
  placeholder: string;
  options: { value: string; label: string }[];
};

export function FilterBar({
  searchParamName = "q",
  searchPlaceholder = "Buscar por colaborador...",
  selects = [],
}: {
  searchParamName?: string;
  searchPlaceholder?: string;
  selects?: FilterSelectConfig[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = React.useState(searchParams.get(searchParamName) ?? "");

  function updateParam(name: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === "all") params.delete(name);
    else params.set(name, value);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && updateParam(searchParamName, search)}
          onBlur={() => updateParam(searchParamName, search)}
          placeholder={searchPlaceholder}
          className="pl-8"
        />
      </div>
      {selects.map((select) => (
        <Select
          key={select.paramName}
          value={searchParams.get(select.paramName) ?? "all"}
          onValueChange={(value) => updateParam(select.paramName, value)}
        >
          <SelectTrigger size="sm" className="w-44">
            <SelectValue placeholder={select.placeholder} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{select.placeholder}</SelectItem>
            {select.options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ))}
    </div>
  );
}
