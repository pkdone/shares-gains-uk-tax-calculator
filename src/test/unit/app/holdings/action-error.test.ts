jest.mock('@/shared/app-logger', () => ({
  logInfo: jest.fn(),
  logWarn: jest.fn(),
  logError: jest.fn(),
  logScriptEnd: jest.fn(),
}));

import { toFormActionError } from '@/app/holdings/action-error';
import { DomainError } from '@/domain/errors/domain-error';
import { logError } from '@/shared/app-logger';
import { PersistenceError, ValidationError } from '@/shared/errors/app-error';

const mockedLogError = logError as jest.MockedFunction<typeof logError>;

describe('toFormActionError', () => {
  const fallback = 'Something went wrong';

  beforeEach(() => {
    mockedLogError.mockClear();
  });

  it('returns DomainError message', () => {
    expect(toFormActionError(new DomainError('Not allowed'), fallback)).toEqual({
      error: 'Not allowed',
    });
    expect(mockedLogError).not.toHaveBeenCalled();
  });

  it('returns AppError message for PersistenceError', () => {
    expect(toFormActionError(new PersistenceError('Failed to load holding'), fallback)).toEqual({
      error: 'Failed to load holding',
    });
    expect(mockedLogError).not.toHaveBeenCalled();
  });

  it('returns AppError message for ValidationError', () => {
    expect(toFormActionError(new ValidationError('Bad input'), fallback)).toEqual({
      error: 'Bad input',
    });
    expect(mockedLogError).not.toHaveBeenCalled();
  });

  it('returns fallback and logs for generic Error', () => {
    const err = new Error('ENOENT: secret path /var/app/config');
    expect(toFormActionError(err, fallback)).toEqual({ error: fallback });
    expect(mockedLogError).toHaveBeenCalled();
  });

  it('returns fallback and logs for non-Error throwables', () => {
    expect(toFormActionError('string throw', fallback)).toEqual({ error: fallback });
    expect(mockedLogError).toHaveBeenCalled();
  });
});
