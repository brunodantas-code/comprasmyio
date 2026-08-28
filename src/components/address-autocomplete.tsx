import { useEffect, useRef, useState } from "react";
import { Check, Loader2, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const BROWSER_KEY = import.meta.env['VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY'] as string | undefined;
const TRACKING_ID = import.meta.env['VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID'] as string | undefined;

let mapsPromise: Promise<void> | null = null;

function loadMaps(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (mapsPromise) return mapsPromise;
  mapsPromise = new Promise<void>((resolve, reject) => {
    const w = window as unknown as { google?: { maps?: unknown } };
    if (w.google?.maps) return resolve();
    if (!BROWSER_KEY) return reject(new Error("Google Maps indisponível"));
    const cbName = "__initGoogleMapsAutocomplete";
    (window as unknown as Record<string, unknown>)[cbName] = () => resolve();
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${BROWSER_KEY}&libraries=places&loading=async&callback=${cbName}${TRACKING_ID ? `&channel=${TRACKING_ID}` : ""}`;
    s.async = true;
    s.onerror = () => reject(new Error("Falha ao carregar Google Maps"));
    document.head.appendChild(s);
  });
  return mapsPromise;
}

type Suggestion = { id: string; text: string; place: () => Promise<string | null> };

export function AddressAutocomplete({
  name,
  defaultValue,
  required,
  label = "Ponto de entrega",
  detailsName,
}: {
  name: string;
  defaultValue?: string;
  required?: boolean;
  label?: string;
  detailsName?: string;
}) {
  // valor final salvo (endereço validado + complemento)
  const initial = defaultValue ?? "";
  const [address, setAddress] = useState(initial);
  const [confirmed, setConfirmed] = useState(Boolean(initial));
  const [details, setDetails] = useState("");
  const [query, setQuery] = useState(initial);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionRef = useRef<unknown>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    if (!query || query === address || query.trim().length < 4) {
      setSuggestions([]);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        await loadMaps();
        const g = (window as unknown as { google: any }).google;
        const { AutocompleteSuggestion, AutocompleteSessionToken } = (await g.maps.importLibrary("places")) as any;
        if (!sessionRef.current) sessionRef.current = new AutocompleteSessionToken();
        const { suggestions: res } = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: query,
          sessionToken: sessionRef.current,
          includedRegionCodes: ["br"],
          language: "pt-BR",
        });
        if (cancelled) return;
        setSuggestions(
          (res ?? []).map((s: any, i: number) => ({
            id: String(i),
            text: s.placePrediction?.text?.toString() ?? "",
            place: async () => {
              const place = s.placePrediction.toPlace();
              await place.fetchFields({ fields: ["formattedAddress"] });
              return place.formattedAddress ?? null;
            },
          })),
        );
        setOpen(true);
      } catch {
        if (!cancelled) setError("Não foi possível consultar o Google Maps agora.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query, address]);

  const pick = async (s: Suggestion) => {
    const formatted = (await s.place().catch(() => null)) ?? s.text;
    setAddress(formatted);
    setQuery(formatted);
    setConfirmed(true);
    setOpen(false);
    setSuggestions([]);
    sessionRef.current = null;
  };

  const full = [address, details.trim()].filter(Boolean).join(" — ");

  return (
    <div className="space-y-2" ref={boxRef}>
      <Label htmlFor={`${name}-search`}>{label}</Label>
      <div className="relative">
        <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id={`${name}-search`}
          autoComplete="off"
          className={cn("pl-9 pr-9", confirmed && "border-green-500")}
          placeholder="Digite o endereço e selecione uma opção do Google"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setConfirmed(false);
            setAddress("");
          }}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
        />
        {loading ? (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        ) : confirmed ? (
          <Check className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-green-600" />
        ) : null}
        {open && suggestions.length > 0 && (
          <ul className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover p-1 shadow-md">
            {suggestions.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  className="w-full rounded-sm px-2 py-2 text-left text-sm hover:bg-accent"
                  onClick={() => void pick(s)}
                >
                  {s.text}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      {!confirmed && query.trim().length > 0 && (
        <p className="text-xs text-muted-foreground">Selecione um endereço sugerido pelo Google para validar.</p>
      )}
      <Textarea
        placeholder="Complemento / referência (ex.: com João no portão)"
        value={details}
        onChange={(e) => setDetails(e.target.value)}
        rows={2}
      />
      <input type="hidden" name={name} value={full} required={required} />
      {detailsName && <input type="hidden" name={detailsName} value={details} />}
      {required && (
        <input
          tabIndex={-1}
          aria-hidden
          className="sr-only h-0 w-0 border-0 p-0"
          required
          value={confirmed ? "ok" : ""}
          onChange={() => {}}
        />
      )}
    </div>
  );
}
