/**
 * Official Property Studio Platform Roles and Stakeholder Classifications
 * Standardized 14 Roles as per client requirements:
 * 1. Property Seeker – Who is looking for Property
 * 2. RERA Certified Individual Realter/CP/Agent – Channel Partner /Broker /Agent
 * 3. RERA Certified Property Consultancy/Firm
 * 4. Non-RERA Realter/Broker/CP
 * 5. Working Sales Professional – Sales Person, who are working to some company on salary basis
 * 6. Reseller – Bought Property, wanted to sell through Property Studio
 * 7. Trader / Investor – Frequently trading buying and selling Multiple Property
 * 8. Land Owner – Landlord, who had large extent land, who gave development to developer
 * 9. Developer – who developer of plotting venture in Sq Yards and builder of apartments and Villas or other residential or commercial property in Square Feet’s
 * 10. Vendor – Contractors and Suppliers
 * 11. Architect & Engineer
 * 12. Interior Designer & Decorater
 * 13. Influencer
 * 14. Digital Marketer
 */

export interface PlatformRoleItem {
  number: number;
  roleKey: string;
  title: string;
  subtitle: string;
  fullLabel: string;
}

export const PLATFORM_ROLES: PlatformRoleItem[] = [
  {
    number: 1,
    roleKey: 'PROPERTY_SEEKER',
    title: 'Property Seeker',
    subtitle: 'Who is looking for Property',
    fullLabel: '1. Property Seeker – Who is looking for Property'
  },
  {
    number: 2,
    roleKey: 'RERA_AGENT',
    title: 'RERA Certified Individual Realter/CP/Agent',
    subtitle: 'Channel Partner /Broker /Agent',
    fullLabel: '2. RERA Certified Individual Realter/CP/Agent – Channel Partner /Broker /Agent'
  },
  {
    number: 3,
    roleKey: 'RERA_CONSULTANCY',
    title: 'RERA Certified Property Consultancy/Firm',
    subtitle: 'RERA Certified Property Consultancy/Firm',
    fullLabel: '3. RERA Certified Property Consultancy/Firm'
  },
  {
    number: 4,
    roleKey: 'NON_RERA_BROKER',
    title: 'Non-RERA Realter/Broker/CP',
    subtitle: 'Non-RERA Realter/Broker/CP',
    fullLabel: '4. Non-RERA Realter/Broker/CP'
  },
  {
    number: 5,
    roleKey: 'SALES_PROFESSIONAL',
    title: 'Working Sales Professional',
    subtitle: 'Sales Person, who are working to some company on salary basis',
    fullLabel: '5. Working Sales Professional – Sales Person, who are working to some company on salary basis'
  },
  {
    number: 6,
    roleKey: 'RESELLER',
    title: 'Reseller',
    subtitle: 'Bought Property, wanted to sell through Property Studio',
    fullLabel: '6. Reseller – Bought Property, wanted to sell through Property Studio'
  },
  {
    number: 7,
    roleKey: 'TRADER_INVESTOR',
    title: 'Trader / Investor',
    subtitle: 'Frequently trading buying and selling Multiple Property',
    fullLabel: '7. Trader / Investor – Frequently trading buying and selling Multiple Property'
  },
  {
    number: 8,
    roleKey: 'LANDOWNER',
    title: 'Land Owner',
    subtitle: 'Landlord, who had large extent land, who gave development to developer',
    fullLabel: '8. Land Owner – Landlord, who had large extent land, who gave development to developer'
  },
  {
    number: 9,
    roleKey: 'DEVELOPER',
    title: 'Developer',
    subtitle: 'Developer of plotting venture in Sq Yards and builder of apartments and Villas or other residential or commercial property in Square Feet’s',
    fullLabel: '9. Developer – Plotting venture in Sq Yards & builder of apartments, Villas & commercial'
  },
  {
    number: 10,
    roleKey: 'VENDOR',
    title: 'Vendor',
    subtitle: 'Contractors and Suppliers',
    fullLabel: '10. Vendor – Contractors and Suppliers'
  },
  {
    number: 11,
    roleKey: 'ARCHITECT_ENGINEER',
    title: 'Architect & Engineer',
    subtitle: 'Architect & Engineer',
    fullLabel: '11. Architect & Engineer'
  },
  {
    number: 12,
    roleKey: 'INTERIOR_DESIGNER',
    title: 'Interior Designer & Decorater',
    subtitle: 'Interior Designer & Decorater',
    fullLabel: '12. Interior Designer & Decorater'
  },
  {
    number: 13,
    roleKey: 'INFLUENCER',
    title: 'Influencer',
    subtitle: 'Influencer',
    fullLabel: '13. Influencer'
  },
  {
    number: 14,
    roleKey: 'DIGITAL_MARKETER',
    title: 'Digital Marketer',
    subtitle: 'Digital Marketer',
    fullLabel: '14. Digital Marketer'
  }
];

/**
 * Exact list of 14 Stakeholder Roles for Add Entity to Review dropdown
 */
export const STAKEHOLDER_REVIEW_ROLES: string[] = [
  'Property Seeker – Who is looking for Property',
  'RERA Certified Individual Realter/CP/Agent – Channel Partner /Broker /Agent',
  'RERA Certified Property Consultancy/Firm',
  'Non-RERA Realter/Broker/CP',
  'Working Sales Professional – Sales Person, who are working to some company on salary basis',
  'Reseller – Bought Property, wanted to sell through Property Studio',
  'Trader / Investor – Frequently trading buying and selling Multiple Property',
  'Land Owner – Landlord, who had large extent land, who gave development to developer',
  'Developer – who developer of plotting venture in Sq Yards and builder of apartments and Villas or other residential or commercial property in Square Feet’s',
  'Vendor – Contractors and Suppliers',
  'Architect & Engineer',
  'Interior Designer & Decorater',
  'Influencer',
  'Digital Marketer'
];
