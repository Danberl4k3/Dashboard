'use client';
import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';

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
    <fieldset className="flex flex-wrap items-center gap-3 rounded-xl border p-3">
      <legend>Contratistas</legend>
      {options.length === 0 ? (
        <p>Sin contratistas para este proyecto</p>
      ) : (
        options.map((name) => (
          <label key={name} className="inline-flex items-center gap-2">
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
            <span>{name}</span>
          </label>
        ))
      )}
      <Button
        size="sm"
        variant={value.length === 0 ? 'default' : 'outline'}
        onClick={() => onChange([])}
      >
        Todos
      </Button>
    </fieldset>
  );
}
