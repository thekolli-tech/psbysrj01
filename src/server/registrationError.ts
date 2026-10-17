/** Safe registration failure. The message is shown to the client and contains no secrets. */
export class RegistrationRejected extends Error {
  readonly statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = 'RegistrationRejected';
    this.statusCode = statusCode;
  }
}

function errorText(error: unknown): string {
  const candidate = error as { code?: string; message?: string; constraint?: string };
  return `${candidate?.code || ''} ${candidate?.constraint || ''} ${candidate?.message || ''}`;
}

export function isUniqueEmailError(error: unknown): boolean {
  return /users\.email|idx_users_lower_email|users_email_key/i.test(errorText(error));
}

export function isUniquePhoneError(error: unknown): boolean {
  return /uq_users_phone_nonempty|users\.phone/i.test(errorText(error));
}
