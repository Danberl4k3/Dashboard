'use client';
import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';

const providerDotStyles: Record<string, string> = {
  DOMINION: 'bg-blue-500',
  INTELLISOFT: 'bg-teal-500',
  PROSEGUR: 'bg-amber-500',
  RUWAY: 'bg-violet-500',
  SELECTEC: 'bg-rose-500',
  SENTINEL: 'bg-emerald-500',
};

export default function ProviderFilter({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string[];
  onChange: (v: string[]) => void;
}) {
  return (
    <fieldset className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border/80 pt-3 text-xs">
      <legend className="sr-only">Contratistas</legend>
      <span className="font-medium text-muted-foreground">Contratistas</span>
      {options.length === 0 ? (
        <p className="text-muted-foreground">
          Sin contratistas para este proyecto
        </p>
      ) : (
        options.map((name) => (
          <label
            key={name}
            className="inline-flex cursor-pointer items-center gap-2 text-foreground hover:text-primary"
          >
            <Checkbox
              checked={value.includes(name)}
              onCheckedChange={(checked) =>
                onChange(
                  checked
                    ? [...value, name]
                    : value.filter((item) => item !== name),
                )
              }
            />
            <span
              className={`size-1.5 rounded-full ${providerDotStyles[name.trim().toUpperCase()] ?? 'bg-slate-400'}`}
              aria-hidden="true"
            />
            <span>{name}</span>
          </label>
        ))
      )}
      <Button
        size="sm"
        variant={value.length === 0 ? 'secondary' : 'ghost'}
        className="ml-auto"
        onClick={() => onChange([])}
      >
        Todos
      </Button>
    </fieldset>
  );
}
