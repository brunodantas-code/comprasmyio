/** Preserve deliberately mixed-case names and acronyms; normalize only all-caps imports. */
export function surveyNameCase(name: string, enabled: boolean): string {
  if (!enabled || /\p{Ll}/u.test(name)) return name;
  return name.toLocaleLowerCase("pt-BR").replace(/\p{L}/u, first => first.toLocaleUpperCase("pt-BR"));
}