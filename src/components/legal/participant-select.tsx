import { SearchableSelect } from '@/components/ui/searchable-select';
import { legalParticipantOptions } from '@/lib/legal-participant-options';

export function ParticipantSelect({ name, index, users, onChange }: {
  name: string;
  index: number;
  users: { id: string; full_name: string }[];
  onChange: (name: string) => void;
}) {
  const options = Array.from(new Set(users.map(user => user.full_name))).map(value => ({ value, label: value }));
  if (name && !options.some(option => option.value === name)) options.push({ value: name, label: name });
  return <SearchableSelect
    aria-label={`Participante ${index + 1}`}
    value={name}
    onChange={onChange}
    options={options}
    optionFilter={legalParticipantOptions}
    placeholder="Buscar usuário ou adicionar participante externo"
  />;
}