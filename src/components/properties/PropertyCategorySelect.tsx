import React from 'react';
import {
  ALL_PROPERTY_TYPES,
  propertyTypeChoices,
  type PropertyTypeChoice
} from '../../shared/propertyCategories';

interface PropertyCategorySelectProps {
  value: string;
  onChange: (value: string) => void;
  storedValues?: readonly (string | null | undefined)[];
  includeAll?: boolean;
  ariaLabel: string;
  className?: string;
  id?: string;
}

function groupedChoices(choices: PropertyTypeChoice[]): Array<{ group: string; choices: PropertyTypeChoice[] }> {
  const groups: Array<{ group: string; choices: PropertyTypeChoice[] }> = [];
  for (const choice of choices) {
    const current = groups[groups.length - 1];
    if (!current || current.group !== choice.group) {
      groups.push({ group: choice.group, choices: [choice] });
    } else {
      current.choices.push(choice);
    }
  }
  return groups;
}

export const PropertyCategorySelect: React.FC<PropertyCategorySelectProps> = ({
  value,
  onChange,
  storedValues = [],
  includeAll = false,
  ariaLabel,
  className,
  id
}) => {
  const current = value === ALL_PROPERTY_TYPES ? '' : value;
  const groups = groupedChoices(propertyTypeChoices([...storedValues, current]));

  return (
    <select
      id={id}
      aria-label={ariaLabel}
      value={value}
      onChange={event => onChange(event.target.value)}
      className={className}
    >
      {includeAll && <option value={ALL_PROPERTY_TYPES}>All property types</option>}
      {groups.map(group => (
        <optgroup key={group.group} label={group.group}>
          {group.choices.map(choice => (
            <option key={`${group.group}:${choice.label}`} value={choice.label}>
              {choice.label}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
};
