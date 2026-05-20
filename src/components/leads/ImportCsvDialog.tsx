"use client";

import { DownloadSimpleIcon, XIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { ChangeEvent, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { parseCsvText, type CsvRow } from "@/lib/csv/client";
import { notify } from "@/lib/ui/toast";
import type { ApiResponse } from "@/types/api";

type ImportCsvDialogProps = {
  endpoint: string;
  label: string;
  requiredField: string;
  templateHeaders: string[];
  triggerId?: string;
};

type ImportResponse = {
  created: number;
  reused?: number;
  results: Array<{
    message: string;
    row: number;
    status: string;
  }>;
};

function normalizeRow(row: CsvRow, allowedHeaders: string[]) {
  return allowedHeaders.reduce<CsvRow>((nextRow, header) => {
    nextRow[header] = row[header]?.trim() ?? "";
    return nextRow;
  }, {});
}

function getErrorMessage(response: ApiResponse<ImportResponse>) {
  return response.ok ? null : response.error.message;
}

export function ImportCsvDialog({
  endpoint,
  label,
  requiredField,
  templateHeaders,
  triggerId,
}: ImportCsvDialogProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [resultSummary, setResultSummary] = useState<string | null>(null);

  const previewRows = useMemo(() => rows.slice(0, 8), [rows]);
  const validRows = useMemo(
    () => rows.filter((row) => row[requiredField]?.trim()),
    [requiredField, rows],
  );
  const invalidCount = rows.length - validRows.length;

  function resetDialog() {
    setError(null);
    setResultSummary(null);
    setRows([]);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  function closeDialog() {
    if (isSubmitting) {
      return;
    }

    resetDialog();
    setIsOpen(false);
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    setError(null);
    setResultSummary(null);
    const file = event.target.files?.[0];

    if (!file) {
      setRows([]);
      return;
    }

    const text = await file.text();
    const parsedRows = parseCsvText(text)
      .slice(0, 200)
      .map((row) => normalizeRow(row, templateHeaders));

    setRows(parsedRows);
  }

  async function importRows() {
    setError(null);
    setResultSummary(null);

    if (validRows.length === 0) {
      const message = `Add at least one row with ${requiredField}.`;
      setError(message);
      notify.warning("Import needs valid rows", message);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(endpoint, {
        body: JSON.stringify({ rows: validRows }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const result = (await response.json()) as ApiResponse<ImportResponse>;
      const message = getErrorMessage(result);

      if (!response.ok || message || !result.ok) {
        const errorMessage =
          message ?? `We could not import ${label.toLowerCase()}.`;
        setError(errorMessage);
        notify.error("Import failed", "Check the file format and try again.");
        return;
      }

      const errorCount = result.data.results.filter(
        (rowResult) => rowResult.status === "error",
      ).length;

      setResultSummary(
        `${result.data.created} created${
          result.data.reused ? `, ${result.data.reused} reused` : ""
        }${errorCount ? `, ${errorCount} skipped` : ""}.`,
      );
      notify.success(
        "Import complete",
        label.toLowerCase().includes("lead")
          ? "Your leads were imported successfully."
          : "Your contacts were imported successfully.",
      );
      if (errorCount > 0) {
        const errorMessage =
          result.data.results
            .filter((rowResult) => rowResult.status === "error")
            .slice(0, 3)
            .map((rowResult) => `Row ${rowResult.row}: ${rowResult.message}`)
            .join(" ");
        setError(errorMessage);
        notify.warning("Some rows were skipped", errorMessage);
      }
      router.refresh();
    } catch (caughtError) {
      const errorMessage =
        caughtError instanceof Error
          ? caughtError.message
          : `We could not import ${label.toLowerCase()}.`;
      setError(errorMessage);
      notify.error("Import failed", "Check the file format and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <button
        id={triggerId}
        className="inline-flex h-10 items-center justify-center rounded-lg border border-[var(--ops-border)] bg-[var(--ops-card)] px-4 text-sm font-semibold text-[var(--ops-text-soft)] shadow-sm transition hover:bg-[var(--ops-card-soft)] hover:text-[var(--ops-text)]"
        onClick={() => setIsOpen(true)}
        type="button"
      >
        <DownloadSimpleIcon aria-hidden="true" className="mr-2" size={18} />
        Import {label}
      </button>

      {isOpen ? (
        <div
          aria-labelledby={`${label}-import-title`}
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 px-4 py-4 backdrop-blur-sm sm:items-center"
          role="dialog"
        >
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-[var(--ops-border)] bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-[var(--ops-border)] px-5 py-4">
              <div>
                <h2
                  className="text-lg font-semibold text-[var(--ops-text)]"
                  id={`${label}-import-title`}
                >
                  Import {label}
                </h2>
                <p className="mt-1 text-sm text-[var(--ops-text-soft)]">
                  Upload a CSV, review valid rows, then import up to 200 records.
                </p>
              </div>
              <button
                aria-label={`Close import ${label}`}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[var(--ops-text-soft)] transition hover:bg-[var(--ops-card-soft)] hover:text-[var(--ops-text)]"
                disabled={isSubmitting}
                onClick={closeDialog}
                type="button"
              >
                <XIcon aria-hidden="true" size={20} />
              </button>
            </div>

            <div className="space-y-5 p-5">
              {error ? (
                <div
                  className="rounded-lg bg-[var(--ops-danger-soft)] p-3 text-sm text-[var(--ops-danger)]"
                  role="alert"
                >
                  {error}
                </div>
              ) : null}
              {resultSummary ? (
                <div className="rounded-lg bg-[var(--ops-success-soft)] p-3 text-sm font-medium text-[var(--ops-success)]">
                  {resultSummary}
                </div>
              ) : null}

              <div>
                <label className="text-sm font-medium text-[var(--ops-text)]">
                  CSV file
                  <input
                    accept=".csv,text/csv"
                    className="mt-2 block w-full rounded-lg border border-[var(--ops-border)] bg-white px-3 py-2 text-sm text-[var(--ops-text)] shadow-sm file:mr-3 file:rounded-md file:border-0 file:bg-[var(--workspace-primary-soft,var(--ops-primary-soft))] file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-[var(--workspace-primary,var(--ops-primary-dark))]"
                    disabled={isSubmitting}
                    onChange={handleFileChange}
                    ref={inputRef}
                    type="file"
                  />
                </label>
              </div>

              <div className="rounded-lg border border-[var(--ops-border)] bg-[var(--ops-card-soft)] p-3 text-xs text-[var(--ops-text-soft)]">
                Headers: {templateHeaders.join(", ")}
              </div>

              {rows.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-[var(--ops-text-soft)]">
                    <span>
                      {validRows.length} valid, {invalidCount} invalid
                    </span>
                    <span>Previewing {previewRows.length} rows</span>
                  </div>
                  <div className="overflow-x-auto rounded-lg border border-[var(--ops-border)]">
                    <table className="min-w-full text-left text-xs">
                      <thead className="bg-[var(--ops-card-soft)] font-semibold uppercase text-[var(--ops-text-muted)]">
                        <tr>
                          <th className="px-3 py-2">Row</th>
                          {templateHeaders.slice(0, 6).map((header) => (
                            <th className="px-3 py-2" key={header}>
                              {header}
                            </th>
                          ))}
                          <th className="px-3 py-2">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--ops-border)] bg-white">
                        {previewRows.map((row, index) => {
                          const valid = Boolean(row[requiredField]?.trim());

                          return (
                            <tr key={`${index}-${row[requiredField]}`}>
                              <td className="px-3 py-2">{index + 2}</td>
                              {templateHeaders.slice(0, 6).map((header) => (
                                <td className="px-3 py-2" key={header}>
                                  {row[header] || "-"}
                                </td>
                              ))}
                              <td className="px-3 py-2">
                                {valid ? "Ready" : `${requiredField} required`}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="flex justify-end gap-3 border-t border-[var(--ops-border)] p-5">
              <Button disabled={isSubmitting} onClick={closeDialog} type="button" variant="secondary">
                Close
              </Button>
              <Button disabled={isSubmitting || validRows.length === 0} onClick={importRows} type="button">
                {isSubmitting ? "Importing..." : `Import ${label}`}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
