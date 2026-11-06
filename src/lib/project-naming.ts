export const PROJECT_NAME_SEPARATOR = " | ";

/** Nome padronizado do projeto: "Tipo | Nome". O nome é o único campo livre. */
export function composeProjectName(projectType: string, shortName: string): string {
  const type = projectType.trim();
  const name = shortName.replace(/\|/g, " ").replace(/\s+/g, " ").trim();
  if (!type) return name;
  if (!name) return type;
  return `${type}${PROJECT_NAME_SEPARATOR}${name}`;
}

/** Recupera tipo e nome de projetos antigos que já seguem o padrão. */
export function splitProjectName(fullName: string, knownTypes: string[]): { projectType: string; shortName: string } {
  const index = fullName.indexOf("|");
  if (index > 0) {
    const type = fullName.slice(0, index).trim();
    if (knownTypes.includes(type)) return { projectType: type, shortName: fullName.slice(index + 1).trim() };
  }
  return { projectType: "", shortName: fullName.trim() };
}
