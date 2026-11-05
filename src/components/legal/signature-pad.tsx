import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Eraser, Check } from 'lucide-react';
export function SignaturePad({ onConfirm }: { onConfirm: (image: string) => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false); const last = useRef({ x: 0, y: 0 }); const [hasInk, setHasInk] = useState(false);
  const point = (event: React.PointerEvent<HTMLCanvasElement>) => { const r = event.currentTarget.getBoundingClientRect(); return { x: (event.clientX-r.left)*600/r.width, y: (event.clientY-r.top)*180/r.height }; };
  return <div className="space-y-2">
    <canvas ref={canvas} width={600} height={180} aria-label="Área de assinatura" className="h-32 w-full touch-none rounded-md border border-border bg-background" onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); drawing.current = true; last.current = point(e); }} onPointerMove={e => { if (!drawing.current) return; const ctx=canvas.current?.getContext('2d'); if (!ctx) return; const p=point(e); ctx.strokeStyle=getComputedStyle(e.currentTarget).color; ctx.lineWidth=2; ctx.lineCap='round'; ctx.beginPath(); ctx.moveTo(last.current.x,last.current.y); ctx.lineTo(p.x,p.y); ctx.stroke(); last.current=p; setHasInk(true); }} onPointerUp={() => { drawing.current=false; }} onPointerCancel={() => { drawing.current=false; }} />
    <div className="flex justify-end gap-2"><Button variant="outline" size="sm" onClick={() => { canvas.current?.getContext('2d')?.clearRect(0,0,600,180); setHasInk(false); }}><Eraser />Limpar</Button><Button size="sm" disabled={!hasInk} onClick={() => { const c=canvas.current; if(c) onConfirm(c.toDataURL('image/png')); }}><Check />Confirmar assinatura</Button></div>
  </div>;
}