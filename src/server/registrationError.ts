/** Safe registration failure. The message is shown to the client and contains no secrets. */
export class RegistrationRejected extends Error {
  readonly statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = 'RegistrationRejected';
    this.statusCode = statusCode;
  }
}

export function isUniqueEmailError(error: unknown): boolean {
  const candidate = error as { code?: string; message?: string };
  if (candidate?.code === '23505' || candidate?.code === 'SQLITE_CONSTRAINT_UNIQUE') return true;
  return /unique constraint failed: users\.email|duplicate key value violates unique constraint/i.test(String(candidate?.message || ''));
}
