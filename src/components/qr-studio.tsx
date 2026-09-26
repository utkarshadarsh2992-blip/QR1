import { ArrowLeftRight, Download, TriangleAlert } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import {
  byteLength,
  contrastWarning,
  ECC_OPTIONS,
  type EccLevel,
  isHexColor,
  normalizeHex,
  SIZE_DEFAULT,
  SIZE_MAX,
  SIZE_MIN,
  SIZE_STEP,
} from "@/lib/qr";
import { cn } from "@/lib/utils";

const DEFAULT_TEXT = "https://example.com";
const DEFAULT_FG = "#171614";
const DEFAULT_BG = "#ffffff";
const PREVIEW_PX = 280;

type PreviewStatus = "empty" | "ready" | "error";

async function drawQr(
  canvas: HTMLCanvasElement,
  text: string,
  options: { ecc: EccLevel; size: number; fg: string; bg: string },
) {
  const mod = await import("qrcode");
  const toCanvas = mod.toCanvas ?? mod.default.toCanvas;
  await toCanvas(canvas, text, {
    errorCorrectionLevel: options.ecc,
    width: options.size,
    margin: 2,
    color: { dark: options.fg, light: options.bg },
  });
}

function downloadFilename(text: string): string {
  const slug = text
    .replace(/^https?:\/\//i, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .toLowerCase();
  return slug ? `qr-${slug}.png` : "lattice-qr.png";
}

function ColorField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (next: string) => void;
}) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex gap-2">
        <input
          id={id}
          type="color"
          value={isHexColor(value) ? value : "#000000"}
          onChange={(event) => onChange(event.target.value)}
          aria-label={`${label} swatch`}
          className="size-11 shrink-0 cursor-pointer rounded-md border border-line bg-surface"
        />
        <Input
          id={`${id}-hex`}
          value={draft}
          spellCheck={false}
          autoComplete="off"
          aria-label={`${label} hex value`}
          className="font-mono uppercase"
          onChange={(event) => {
            const next = event.target.value;
            setDraft(next);
            const normalized = normalizeHex(next, "");
            if (isHexColor(normalized)) onChange(normalized);
          }}
          onBlur={() => {
            const next = normalizeHex(draft, value);
            setDraft(next);
            onChange(next);
          }}
        />
      </div>
    </div>
  );
}

export function QrStudio() {
  const contentId = "qr-content";
  const sizeId = "qr-size";
  const eccName = "qr-ecc";
  const warningId = "qr-contrast-warning";
  const statusId = "qr-content-status";

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [text, setText] = useState(DEFAULT_TEXT);
  const [fg, setFg] = useState(DEFAULT_FG);
  const [bg, setBg] = useState(DEFAULT_BG);
  const [size, setSize] = useState(SIZE_DEFAULT);
  const [ecc, setEcc] = useState<EccLevel>("M");
  const [status, setStatus] = useState<PreviewStatus>("empty");
  const [downloading, setDownloading] = useState(false);

  const trimmed = text.trim();
  const bytes = byteLength(trimmed);
  const warning = useMemo(() => contrastWarning(fg, bg), [fg, bg]);
  const eccMeta = ECC_OPTIONS.find((option) => option.id === ecc) ?? ECC_OPTIONS[1];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!trimmed) {
      const ctx = canvas.getContext("2d");
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
      setStatus("empty");
      return;
    }

    let cancelled = false;
    void drawQr(canvas, trimmed, { ecc, size: PREVIEW_PX, fg, bg })
      .then(() => {
        if (!cancelled) setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [trimmed, fg, bg, ecc]);

  async function handleDownload() {
    if (!trimmed || status !== "ready") return;
    setDownloading(true);
    try {
      const canvas = document.createElement("canvas");
      await drawQr(canvas, trimmed, { ecc, size, fg, bg });
      const url = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = url;
      link.download = downloadFilename(trimmed);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success(`Saved ${size}×${size} PNG`);
    } catch {
      toast.error("Could not build a PNG for this text. Try a shorter message.");
    } finally {
      setDownloading(false);
    }
  }

  function swapColors() {
    const nextFg = bg;
    const nextBg = fg;
    setFg(nextFg);
    setBg(nextBg);
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium tracking-[0.18em] text-muted uppercase">QR studio</p>
          <h1 className="font-display text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
            Lattice
          </h1>
        </div>
        <p className="max-w-sm text-sm leading-relaxed text-muted">
          Type a URL or any text. The code updates as you go. Download a PNG when it looks right.
        </p>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] xl:grid-cols-[minmax(0,1fr)_22rem]">
        <form
          className="flex flex-col gap-6 rounded-xl border border-line bg-surface p-4 sm:p-6 lg:order-1"
          onSubmit={(event) => {
            event.preventDefault();
            void handleDownload();
          }}
        >
          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-3">
              <Label htmlFor={contentId}>Content</Label>
              <span className="text-xs tabular-nums text-faint">{bytes} bytes</span>
            </div>
            <Textarea
              id={contentId}
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="https:// or any text"
              spellCheck={false}
              autoComplete="off"
              aria-describedby={statusId}
              aria-invalid={status === "error" || undefined}
            />
            <p id={statusId} className="text-xs text-muted">
              {status === "error"
                ? "Too much data for this error-correction level. Shorten the text or pick a lower level."
                : "Updates instantly. Works with URLs, Wi-Fi strings, or plain notes."}
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-ink">Colors</p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={swapColors}
                className="h-11 px-3"
              >
                <ArrowLeftRight aria-hidden="true" />
                Swap
              </Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2" aria-describedby={warning ? warningId : undefined}>
              <ColorField id="qr-fg" label="Foreground color" value={fg} onChange={setFg} />
              <ColorField id="qr-bg" label="Background color" value={bg} onChange={setBg} />
            </div>
            {warning ? (
              <p
                id={warningId}
                role="status"
                className="flex items-start gap-2 text-sm text-danger"
              >
                <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                {warning}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-3">
              <Label id={sizeId}>Size</Label>
              <span className="text-sm tabular-nums text-muted">
                {size} × {size} px
              </span>
            </div>
            <Slider
              min={SIZE_MIN}
              max={SIZE_MAX}
              step={SIZE_STEP}
              value={[size]}
              onValueChange={(value) => {
                const next = value[0];
                if (typeof next === "number") setSize(next);
              }}
              aria-labelledby={sizeId}
              aria-valuetext={`${size} pixels`}
            />
            <p className="text-xs text-muted">
              Preview stays readable. This size is the PNG you download.
            </p>
          </div>

          <fieldset className="flex flex-col gap-3">
            <legend className="text-sm font-medium text-ink">Error correction</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {ECC_OPTIONS.map((option) => {
                const selected = option.id === ecc;
                return (
                  <label
                    key={option.id}
                    className={cn(
                      "flex min-h-11 cursor-pointer flex-col items-center justify-center rounded-md border px-2 py-2 text-center transition-colors duration-150",
                      selected
                        ? "border-ink bg-ink text-surface"
                        : "border-line bg-surface text-ink hover:bg-wash",
                    )}
                  >
                    <input
                      type="radio"
                      name={eccName}
                      value={option.id}
                      checked={selected}
                      onChange={() => setEcc(option.id)}
                      className="sr-only"
                    />
                    <span className="text-sm font-semibold">{option.id}</span>
                    <span className={cn("text-xs", selected ? "text-surface/80" : "text-muted")}>
                      {option.name}
                    </span>
                  </label>
                );
              })}
            </div>
            <p className="text-xs text-muted">
              {eccMeta.name} recovers {eccMeta.recovery}. {eccMeta.hint}
            </p>
          </fieldset>
        </form>

        <aside className="order-first flex flex-col gap-4 rounded-xl border border-line bg-surface p-4 sm:p-6 lg:sticky lg:top-8 lg:order-2">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-sm font-medium text-ink">Live preview</h2>
            <p className="text-xs tabular-nums text-faint">
              {ecc} · {size}px
            </p>
          </div>

          <div
            className="flex min-h-56 items-center justify-center rounded-md border border-line p-4 sm:min-h-72 sm:p-5"
            style={{ backgroundColor: bg }}
            aria-live="polite"
          >
            <canvas
              ref={canvasRef}
              width={PREVIEW_PX}
              height={PREVIEW_PX}
              className={cn(
                "h-auto w-full max-w-xs",
                status === "ready" ? "opacity-100" : "sr-only",
              )}
              style={{ imageRendering: "pixelated" }}
            >
              QR code for the entered content
            </canvas>
            {status !== "ready" ? (
              <p className="max-w-[16rem] text-center text-sm text-muted">
                {status === "error"
                  ? "This text is too long for a QR code at the current settings."
                  : "Type a URL or some text to see a code here."}
              </p>
            ) : null}
          </div>

          <Button
            type="button"
            onClick={() => void handleDownload()}
            disabled={status !== "ready" || downloading}
            className="w-full"
          >
            <Download aria-hidden="true" />
            {downloading ? "Preparing PNG…" : "Download PNG"}
          </Button>
          <p className="text-xs leading-relaxed text-faint">
            Codes are built in your browser. Nothing is uploaded.
          </p>
        </aside>
      </div>
    </div>
  );
}
