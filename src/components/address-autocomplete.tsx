import { Button } from "@/components/ui/button";
import { useEffect, useRef, useState } from "react";
import { Check, Loader2, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useDeliveryPoints } from "@/components/delivery-points-tab";
import { BrCityPicker } from "@/components/br-city-picker";

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

const normalizeText = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

type Suggestion = { id: string; text: string; place: () => Promise<string | null> };

export function AddressAutocomplete({
  name,
  defaultValue,
  required,
  label = "Ponto de entrega",
  detailsName,
  referencePlaceholder,
  allowDeliveryPoints = true,
  modeName,
  defaultMode = "entrega",
}: {
  name: string;
  defaultValue?: string;
  required?: boolean;
  label?: string;
  detailsName?: string;
  referencePlaceholder?: string;
  allowDeliveryPoints?: boolean;
  /** Quando informado, exibe a escolha Entrega/Retirada e envia o valor neste campo do formulário. */
  modeName?: string;
  defaultMode?: "entrega" | "retirada";
}) {
  const [mode, setMode] = useState<"entrega" | "retirada">(defaultMode);
  const pickup = Boolean(modeName) && mode === "retirada";
  // Valor final salvo: sugestão confirmada ou endereço digitado manualmente.
  const initial = defaultValue ?? "";
  const [address, setAddress] = useState(initial);
  const [confirmed, setConfirmed] = useState(Boolean(initial));
  const [details, setDetails] = useState("");
  const [complement, setComplement] = useState("");
  const [city, setCity] = useState("");
  const [query, setQuery] = useState(initial);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { data: deliveryPoints } = useDeliveryPoints(allowDeliveryPoints);
  const sessionRef = useRef<unknown>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const initializedDefaultRef = useRef(false);

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

  const manualAddress = query.trim();
  const addressValue = confirmed ? address : manualAddress;
  const validAddress = addressValue.length >= 3;
  const isDeliveryPoint = Boolean(allowDeliveryPoints && deliveryPoints?.some((point) => point.address === addressValue));
  const manualMode = !isDeliveryPoint;
  const cityPart = manualMode && city && !normalizeText(addressValue).includes(normalizeText(city.split(" - ")[0])) ? city : "";
  const street = [addressValue, manualMode ? complement.trim() : ""].filter(Boolean).join(", ");
  const full = [[street, cityPart].filter(Boolean).join(" — "), details.trim()].filter(Boolean).join(" — ");

  useEffect(() => {
    if (!allowDeliveryPoints || initializedDefaultRef.current || defaultValue || !deliveryPoints?.length) return;
    initializedDefaultRef.current = true;
    const preferred = deliveryPoints.find((point) => point.is_default) ?? deliveryPoints[0];
    setAddress(preferred.address);
    setQuery(preferred.address);
    setConfirmed(true);
  }, [allowDeliveryPoints, defaultValue, deliveryPoints]);

  return (
    <div className="space-y-2" ref={boxRef}>
      {modeName && (
        <div className="space-y-2">
          <Label>Modalidade</Label>
          <RadioGroup value={mode} onValueChange={(value) => { if (value === "entrega" || value === "retirada") setMode(value); }} className="flex flex-wrap gap-3" aria-label="Entrega ou Retirada">
            {(["entrega", "retirada"] as const).map((value) => (
              <Label key={value} htmlFor={`${name}-mode-${value}`} className="min-h-9 cursor-pointer rounded-md px-3 py-2 text-foreground has-[[data-state=checked]]:bg-accent has-[[data-state=checked]]:text-accent-foreground">
                <span className="flex items-center gap-3">
                  <RadioGroupItem id={`${name}-mode-${value}`} value={value} className="shrink-0" />
                  <span className="leading-none">{value === "entrega" ? "Entrega" : "Retirada"}</span>
                </span>
              </Label>
            ))}
          </RadioGroup>
          <input type="hidden" name={modeName} value={mode} />
        </div>
      )}
      <Label htmlFor={`${name}-search`} className="block">{pickup ? "Ponto de retirada" : label}</Label>
      {allowDeliveryPoints && deliveryPoints && deliveryPoints.length > 0 && (
        <SearchableSelect aria-label={pickup ? "Selecionar ponto de retirada" : "Selecionar ponto de entrega"} clearable={false} placeholder="Digite ou selecione um ponto cadastrado" value={deliveryPoints.find((point) => point.address === addressValue)?.code ?? "manual"} options={[...deliveryPoints.map((point) => ({ value: point.code, label: point.name, keywords: point.address })), { value: "manual", label: "Outro endereço (somente neste pedido)", keywords: "provisório temporário" }]} onChange={(code) => {
          if (code === "manual") {
            setAddress("");
            setQuery("");
            setConfirmed(false);
            return;
          }
          const point = deliveryPoints.find((item) => item.code === code);
          if (!point) return;
          setAddress(point.address);
          setQuery(point.address);
          setConfirmed(true);
          setOpen(false);
          setSuggestions([]);
        }} />
      )}
      {allowDeliveryPoints && manualMode && (
        <p id={`${name}-address-scope`} className="text-xs text-muted-foreground">
          Este endereço será salvo apenas neste pedido. Não será adicionado aos pontos cadastrados para compras futuras.
        </p>
      )}
      {manualMode && <Label htmlFor={`${name}-search`} className="block text-xs text-muted-foreground">Rua e número</Label>}
      <div className="relative flex min-w-0 items-center gap-2">
        <MapPin aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground" />
        <Input
          id={`${name}-search`}
          autoComplete="off"
          className="min-w-0 flex-1"
          aria-describedby={allowDeliveryPoints && manualMode ? `${name}-address-scope` : undefined}
          placeholder="Digite o endereço ou selecione uma opção do Google"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setConfirmed(false);
            setAddress("");
          }}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
        />
        {loading ? (
          <Loader2 aria-label="Consultando endereço" className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
        ) : confirmed ? (
          <Check aria-label="Endereço selecionado" className="h-4 w-4 shrink-0 text-myio-green" />
        ) : null}
        {open && suggestions.length > 0 && (
          <ul className="absolute top-full z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover p-1 shadow-md">
            {suggestions.map((s) => (
              <li key={s.id}>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-auto w-full justify-start whitespace-normal rounded-sm px-2 py-2 text-left text-sm"
                  onClick={() => void pick(s)}
                >
                  {s.text}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {error && (
        <p className="text-xs text-muted-foreground">
          O Google Maps está indisponível. O endereço digitado será usado normalmente.
        </p>
      )}
      {!confirmed && validAddress && !error && (
        <p className="text-xs text-muted-foreground">
          Você pode selecionar uma sugestão ou continuar com o endereço digitado.
        </p>
      )}
      {manualMode && (
        <div className="grid items-end gap-2 sm:grid-cols-2">
          <div className="flex min-w-0 flex-col gap-2">
            <Label htmlFor={`${name}-complement`} className="text-xs text-muted-foreground">Complemento</Label>
            <Input id={`${name}-complement`} placeholder="Ex.: Sala 12, Bloco B" value={complement} onChange={(e) => setComplement(e.target.value)} />
          </div>
          <div className="flex min-w-0 flex-col gap-2">
            <Label htmlFor={`${name}-city`} className="text-xs text-muted-foreground">UF e Cidade</Label>
            <BrCityPicker id={`${name}-city`} value={city} onChange={setCity} />
          </div>
        </div>
      )}
      <Textarea
        placeholder={referencePlaceholder ?? (pickup ? "Referência para retirada (ex.: falar com João na recepção)" : "Referência para entrega (ex.: com João no portão)")}
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
          value={validAddress ? "ok" : ""}
          onChange={() => {}}
        />
      )}
    </div>
  );
}
