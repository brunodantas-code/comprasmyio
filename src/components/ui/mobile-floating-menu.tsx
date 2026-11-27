import { Children, Fragment, cloneElement, isValidElement, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight, Ellipsis } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { mobileMenuPage, mobileMenuNeedsPaging } from '@/lib/mobile-menu-pages';

function menuItems(children: ReactNode): ReactNode[] {
  return Children.toArray(children).flatMap(child => isValidElement<{ children?: ReactNode }>(child) && child.type === Fragment ? menuItems(child.props.children) : [child]);
}

/** Page the original navigation entries; destinations, labels and permission filters stay with the app. */
export function MobileFloatingMenu({ children }: { children: ReactNode }) {
  const [page, setPage] = useState(0);
  if (!isValidElement<{ children?: ReactNode; className?: string }>(children)) return children;
  const items = menuItems(children.props.children);
  if (!mobileMenuNeedsPaging(items.length)) return children;
  const { start, end, next, last } = mobileMenuPage(items.length, page);
  const controls = <Button key="mobile-menu-more" cdeIgnore variant="ghost" size="icon" className="mobile-menu-more" aria-label={last ? 'Voltar aos primeiros menus' : 'Exibir próximos menus'} title={last ? 'Voltar aos primeiros menus' : 'Exibir próximos menus'} onClick={() => setPage(next)}><Ellipsis className="size-5" />{last ? <ChevronLeft className="size-3" /> : <ChevronRight className="size-3" />}</Button>;
  return cloneElement(children, { className: `${children.props.className ?? ''} mobile-menu-paged`, children: [<Fragment key={`page-${start}`}>{items.slice(start, end)}</Fragment>, controls] });
}