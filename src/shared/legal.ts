/**
 * Draft legal copy for operator and counsel review.
 * It describes this release. It is not a claim of compliance with every law.
 */

export const LEGAL_CONSENT_VERSION = '2026-10-17';
export const LEGAL_LAST_UPDATED = '17 October 2026';
export const LEGAL_CONTACT_EMAIL = 'info@propertystudio.org';

export type LegalDocumentId = 'privacy' | 'terms';

export interface LegalBlock {
  text: string;
}

export interface LegalSection {
  id: string;
  heading: string;
  blocks: LegalBlock[];
}

export interface LegalDocument {
  id: LegalDocumentId;
  path: '/privacy-policy' | '/terms-and-conditions';
  title: string;
  sections: LegalSection[];
}

export function legalDocumentForPath(pathname: string): LegalDocument | null {
  const path = pathname.split('?')[0].replace(/\/+$/, '') || '/';
  if (path === '/privacy-policy') return PRIVACY_POLICY;
  if (path === '/terms-and-conditions') return TERMS_AND_CONDITIONS;
  return null;
}

const draftNotice = 'This page is a draft for the site operator and for legal review. It describes how Property Studio is built in this release. It is not a statement that the service complies with every law that may apply.';

const operatorPlaceholder = '[To be confirmed by the operator: the full legal name of the business entity that operates Property Studio.]';
const addressPlaceholder = '[To be confirmed by the operator: the complete registered postal address. The website currently publishes only “Western Corridor Financial District, Hyderabad”.]';
const lawPlaceholder = '[To be confirmed by the operator: the governing law and the venue for disputes.]';

export const PRIVACY_POLICY: LegalDocument = {
  id: 'privacy',
  path: '/privacy-policy',
  title: 'Privacy Policy',
  sections: [
    {
      id: 'status',
      heading: 'Status of this draft',
      blocks: [
        { text: draftNotice },
        { text: `Last updated: ${LEGAL_LAST_UPDATED}. Consent version recorded at registration: ${LEGAL_CONSENT_VERSION}.` },
        { text: `The website identifies the service as Property Studio and Property Studio Media & Intelligence. Published contact: ${LEGAL_CONTACT_EMAIL}. Published identifiers on the site include TG RERA A02200004078 and Udyam TS-02-283677. ${operatorPlaceholder} ${addressPlaceholder}` }
      ]
    },
    {
      id: 'information-collected',
      heading: 'Information collected at registration',
      blocks: [
        { text: 'When you create an account, the server asks for your name, email address, and a password. Property Seekers must also provide a mobile number in international E.164 format. Other self-serve roles may leave the mobile number blank. You may also enter an organization or similar profile detail.' },
        { text: 'The account record stores your role, email verification status, and, when a mobile number is verified, phone verification status. It stores the avatar identifier you select from the built-in library. Users choose from predefined avatars and cannot upload profile photos from their gallery in this release.' },
        { text: 'A successful registration creates a server session. The session identifier is kept in an httpOnly cookie named ps_session. The registration response does not include that session token in the JSON body. Passwords are stored as salted hashes. The application does not keep the plaintext password after hashing.' }
      ]
    },
    {
      id: 'verification',
      heading: 'Email codes and WhatsApp codes',
      blocks: [
        { text: 'Every self-serve registration requires an email one-time code. When email delivery is configured, the server sends that code through Resend from an address on propertystudio.org. If Resend is not configured, or the message is rejected, the code is discarded and the account is not created.' },
        { text: 'Property Seeker registration is built to require a second code sent through Meta’s WhatsApp Cloud API, using an approved authentication template. That send happens only when the server has a WhatsApp access token, phone-number ID, template name, template language, and Graph API version. Those values stay on the server. If any of them is missing or delivery fails, registration does not complete. This draft does not claim that a live WhatsApp message has been delivered in Production. Production delivery still depends on the operator configuring Meta and verifying a real recipient.' },
        { text: 'Other roles are not required to complete WhatsApp verification. A client-supplied flag that a phone is already verified is ignored. The server marks a number verified only after it accepts the code for that number and that registration.' },
        { text: 'Codes are six digits, stored as salted hashes rather than as the original code, and expire after 10 minutes. A code is single-use. The server also applies attempt limits, a resend cooldown, and request rate limits. Codes, access tokens, and full phone numbers are not written into the application’s verification logs.' }
      ]
    },
    {
      id: 'phone-access',
      heading: 'Who can see a phone number',
      blocks: [
        { text: 'You can see your own mobile number on your authenticated account responses. A Super Admin or Developer can retrieve Property Seeker mobile numbers through the account list and lead list. Those reads are written to the audit log as phone access, with the route and a count. The audit entry is not intended to store the phone number, the one-time code, or an access token.' },
        { text: 'Every other role receives the number omitted or masked. A mask keeps only the last four digits. Unauthenticated requests do not receive phone numbers. A role or user ID sent by the browser is not treated as authorization. The server uses the session and the role stored for that account.' },
        { text: 'Wallet credits, an existing lead-unlock record, and a checkout attempt do not reveal a phone number in this release. Paid access to contact numbers is not enabled.' }
      ]
    },
    {
      id: 'community-and-leads',
      heading: 'Profiles, community posts, and enquiries',
      blocks: [
        { text: 'Your display name, role, organization, and selected avatar identifier can appear with community posts and in account views that already show that profile. Community posts and comments are not a channel for publishing a phone number. Public event replay removes fields whose names indicate a phone number.' },
        { text: 'A property enquiry stores the name, email, budget, location interest, requirements, and the phone number associated with the enquiry. For a Property Seeker, the stored phone number is the verified number on the account, not a different number typed only in the form. Professionals may see a masked number. Name and email on an enquiry can be shown to the seeker who created it, to a Super Admin or Developer, or to a professional who already has an unlock record. That name and email visibility is separate from phone-number access.' },
        { text: 'New community posts wait for approval before they are public. A Super Admin can approve, reject, or remove posts and can suspend a community. Editing an approved post returns it to pending review, and the revised text is not shown on the public list, the public post page, or anonymous event replay until it is approved again.' }
      ]
    },
    {
      id: 'storage',
      heading: 'Where information is stored and which providers are used',
      blocks: [
        { text: 'When DATABASE_URL is configured, account, session, verification, community, enquiry, and audit records are stored in PostgreSQL through the application’s database driver. The operator chooses the database host. This release does not run a second application database. Production startup refuses to use SQLite. SQLite is available only for an explicit local development setting when no database URL is configured.' },
        { text: 'The repository is set up to host the web application on Vercel, with API requests routed to the server bundle. Email codes are sent through Resend when that provider is configured. WhatsApp codes are sent through Meta’s WhatsApp Cloud API when that provider is configured. The application code in this release does not include a separate analytics product, advertising cookie, or profile-photo storage service.' },
        { text: 'The host, database provider, Resend, and Meta may process the information needed to deliver the feature you used, and they may keep their own operational logs under their own terms. This draft does not list a fixed retention period for those providers and does not claim that their logs are deleted on a particular schedule.' }
      ]
    },
    {
      id: 'cookies',
      heading: 'Cookies and sessions',
      blocks: [
        { text: 'The session cookie ps_session is httpOnly, SameSite Lax, and limited to this site. In production it is marked Secure. The cookie and the matching server session are set to expire after 30 days. Logging out revokes the server session and clears the cookie. A revoked cookie is not accepted for later requests.' },
        { text: 'The application does not set an advertising or analytics cookie in this release. Your browser may still store its own data, and the hosting provider may log IP address, user agent, and request paths as part of operating the site.' }
      ]
    },
    {
      id: 'security',
      heading: 'Security controls and their limits',
      blocks: [
        { text: 'Controls in this release include salted password hashes, salted and expiring one-time codes, single-use code checks, attempt and rate limits, httpOnly sessions, server-side role checks, phone-number masking, and audit records for privileged phone access and legal-consent acceptance.' },
        { text: 'These controls reduce risk. They do not make access impossible if a password, device, provider account, or server credential is compromised. This draft does not claim that stored data is encrypted, that backups are deleted automatically, or that every transmission is protected beyond the protections the configured host and database URL actually provide.' }
      ]
    },
    {
      id: 'retention',
      heading: 'Retention, correction, and deletion',
      blocks: [
        { text: 'The operator has not published a fixed retention schedule in this draft. Account, enquiry, community, and audit records remain until the operator deletes them or completes a deletion request. Unused one-time codes expire after 10 minutes. Sessions expire after 30 days or when you log out.' },
        { text: 'There is no self-serve account-deletion button in this release. An administrator can remove an account from the admin tools. You may email the contact address below to ask for a correction or for deletion. The operator will need to confirm what can be removed without breaking an audit, enquiry, or legal obligation. This draft does not promise that every related record, host log, or provider log will be erased.' }
      ]
    },
    {
      id: 'disclosure',
      heading: 'When information may be disclosed',
      blocks: [
        { text: 'Information is handled by the people and providers needed to run the feature: the database host, the application host, Resend for email codes, and Meta for WhatsApp codes when that feature is configured. Super Admin and Developer accounts can see the phone numbers described above. Moderators and administrators can review content that is pending, rejected, or suspended.' },
        { text: 'Information may also be disclosed to a competent authority when the operator receives a legal requirement to do so. This draft does not describe a specific statute or a specific court.' },
        { text: 'Ordinary users, including agents, channel partners, resellers, landowners, and other Property Seekers, do not receive unrestricted access to a Property Seeker’s mobile number.' }
      ]
    },
    {
      id: 'changes',
      heading: 'Changes',
      blocks: [
        { text: 'If this draft changes, the last-updated date and the consent version will change with it. A new registration stores the version that was current when you accepted it. Continued use of an existing account after a later change is not, by itself, recorded as a new acceptance unless the product asks you to accept again.' }
      ]
    },
    {
      id: 'contact',
      heading: 'Contact',
      blocks: [
        { text: `Questions, correction requests, and deletion requests can be sent to ${LEGAL_CONTACT_EMAIL}. ${operatorPlaceholder} ${addressPlaceholder}` },
        { text: 'The Terms & Conditions are published at /terms-and-conditions.' }
      ]
    }
  ]
};

export const TERMS_AND_CONDITIONS: LegalDocument = {
  id: 'terms',
  path: '/terms-and-conditions',
  title: 'Terms & Conditions',
  sections: [
    {
      id: 'status',
      heading: 'Status of this draft',
      blocks: [
        { text: draftNotice },
        { text: `Last updated: ${LEGAL_LAST_UPDATED}. The registration checkbox records consent version ${LEGAL_CONSENT_VERSION}.` },
        { text: `These terms apply to use of the Property Studio website and accounts. ${operatorPlaceholder} ${addressPlaceholder} ${lawPlaceholder}` }
      ]
    },
    {
      id: 'accounts',
      heading: 'Accounts and accurate information',
      blocks: [
        { text: 'You must provide information that is accurate for the account you create. Self-serve registration is available for Property Seekers, landowners, channel partners, resellers, RERA agents, and real-estate media roles. Super Admin and Developer accounts cannot be created through self-serve registration.' },
        { text: 'You must accept this draft Privacy Policy and these Terms before the server creates the account. The checkbox is not selected for you. Sending the registration request without that acceptance is rejected, and no account is created.' },
        { text: 'You are responsible for the password and for activity under your session. Tell the operator if you believe the account is being used without your permission.' }
      ]
    },
    {
      id: 'verification',
      heading: 'Email verification and WhatsApp verification',
      blocks: [
        { text: 'Registration requires a current email one-time code. The code expires, cannot be reused, and is not a substitute for your password.' },
        { text: 'A Property Seeker account is built to require both that email code and a WhatsApp code for the same mobile number. The WhatsApp code is sent only when Meta’s WhatsApp Cloud API is configured. Until that configuration is in place and a real delivery has succeeded, a Property Seeker registration does not finish. Other roles remain email-only. Changing a verified mobile number requires a new code and replaces the earlier verification for that account.' }
      ]
    },
    {
      id: 'your-content',
      heading: 'What you submit',
      blocks: [
        { text: 'You are responsible for community posts, comments, property enquiries, listing details, and any other material you submit. Do not submit information you do not have a right to share, including another person’s phone number or a document you are not allowed to publish.' },
        { text: 'An enquiry consent is separate from account registration. It covers storing that enquiry so it can be processed. It does not purchase lead access, and it does not make a phone number visible to ordinary users.' },
        { text: 'Property information on the site can come from users and from operator-published material. A post or listing is not legal, valuation, or investment advice, and publication is not a representation that a project, broker, or price has been independently certified.' }
      ]
    },
    {
      id: 'moderation',
      heading: 'Moderation, removal, and suspension',
      blocks: [
        { text: 'New community posts are held for approval. A Super Admin can approve, reject, remove, or require another review. Content that is pending, rejected, or suspended is not shown on the public list. Changing an approved post sends it back for review, and the revised text stays off the public pages and anonymous event replay until it is approved again.' },
        { text: 'The operator may suspend an account or remove content that breaks these terms, interferes with the service, or is required to be removed. A RERA number entered in a professional profile does not by itself mark that profile as verified. Verification of a professional profile waits for review by a Super Admin or Developer.' }
      ]
    },
    {
      id: 'roles',
      heading: 'Roles and permissions',
      blocks: [
        { text: 'A Property Seeker uses the service to register, verify contact details, and submit enquiries. A seeker who has not completed the required phone verification cannot submit an enquiry.' },
        { text: 'Landowners, channel partners, resellers, RERA agents, real-estate media, property administrators, and similar professional roles have the tools assigned to that role. They do not gain Super Admin or Developer authority by selecting a role at registration or by sending a role in a request.' },
        { text: 'Super Admin and Developer accounts are operator-controlled. They can review users, moderate content, and, on the authorized account and lead screens, see mobile numbers. Those phone reads are audit-logged.' }
      ]
    },
    {
      id: 'phones',
      heading: 'Phone-number privacy',
      blocks: [
        { text: 'Ordinary users do not receive an unrestricted Property Seeker mobile number. Masked values are not a grant of the full number. You must not try to reconstruct, scrape, or request a full number through another endpoint, export, or replay of events.' },
        { text: 'You may see your own number while signed in. Super Admin and Developer access is limited to the authorized screens described in the Privacy Policy.' }
      ]
    },
    {
      id: 'payments',
      heading: 'Payments are not available in this release',
      blocks: [
        { text: 'Checkout, wallet charges for a new paid lead unlock, and payment-based reveal of phone numbers are not enabled. If payment settings are absent, a new paid unlock returns an unavailable response and does not create a charge or reveal a phone number.' },
        { text: 'This draft does not set a price, a refund rule, or a payment guarantee. Any future paid access would need its own terms before it is offered. Amounts or credit labels that remain visible in the interface are not an offer to sell access in this release.' }
      ]
    },
    {
      id: 'ip',
      heading: 'Intellectual property and third-party services',
      blocks: [
        { text: 'The Property Studio name, branding, layout, and the bundled avatar illustrations are provided as part of the service. You may select an avatar. You may not upload a gallery photo, camera image, external image address, or base64 image as your profile picture in this release.' },
        { text: 'You keep responsibility for material you submit. You grant the operator permission to host, display, and moderate that material for operating the service. This draft does not transfer an unrelated intellectual-property portfolio to you, and it does not claim a registered trademark beyond the names already used on the site.' },
        { text: 'Email delivery, WhatsApp delivery, database hosting, and application hosting are provided by third parties when the operator configures them. Those providers have their own terms. Links to WhatsApp, YouTube, Instagram, LinkedIn, Facebook, and X leave this website.' }
      ]
    },
    {
      id: 'liability',
      heading: 'Availability, liability, and disputes',
      blocks: [
        { text: 'The service may be interrupted for maintenance, provider outages, or configuration gaps. Verification messages are not guaranteed to arrive. The operator does not promise a particular property transaction, rental, price, or investment result.' },
        { text: 'To the extent the operator can limit liability without inventing a statutory cap, the operator is not taking on responsibility for loss caused by user-submitted content, by a third-party provider, or by a decision you make from material on the site. Nothing in this draft excludes liability that applicable law does not allow to be excluded. The specific law and venue are not stated here until the operator confirms them.' },
        { text: `Send a complaint or question to ${LEGAL_CONTACT_EMAIL} before starting a formal dispute, so the operator can review it. ${lawPlaceholder}` }
      ]
    },
    {
      id: 'ending',
      heading: 'Stopping use',
      blocks: [
        { text: 'You may stop using the service and request deletion or correction through the contact email. Logging out ends that session. The operator may end or suspend access as described above. Ending an account does not, by itself, publish a phone number or activate a payment.' }
      ]
    },
    {
      id: 'contact',
      heading: 'Contact',
      blocks: [
        { text: `Contact ${LEGAL_CONTACT_EMAIL} for questions about these terms. The Privacy Policy is published at /privacy-policy.` },
        { text: `${operatorPlaceholder} ${addressPlaceholder}` }
      ]
    }
  ]
};

export const LEGAL_DOCUMENTS = [PRIVACY_POLICY, TERMS_AND_CONDITIONS] as const;

export type LegalPart =
  | { type: 'text'; value: string }
  | { type: 'link'; href: string; label: string }
  | { type: 'placeholder'; value: string };

const PART_PATTERN = /(\[To be confirmed by the operator:[^\]]+\]|info@propertystudio\.org|\/privacy-policy|\/terms-and-conditions)/g;

export function legalParts(text: string): LegalPart[] {
  const parts: LegalPart[] = [];
  let last = 0;
  for (const match of text.matchAll(PART_PATTERN)) {
    const index = match.index ?? 0;
    if (index > last) parts.push({ type: 'text', value: text.slice(last, index) });
    const token = match[0];
    if (token.startsWith('[')) parts.push({ type: 'placeholder', value: token });
    else if (token.startsWith('info@')) parts.push({ type: 'link', href: `mailto:${token}`, label: token });
    else parts.push({ type: 'link', href: token, label: token === '/privacy-policy' ? 'Privacy Policy' : 'Terms & Conditions' });
    last = index + token.length;
  }
  if (last < text.length) parts.push({ type: 'text', value: text.slice(last) });
  return parts;
}
