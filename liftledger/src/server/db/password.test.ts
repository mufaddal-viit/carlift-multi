import { describe, expect, it } from 'vitest';
import { DUMMY_HASH, hashPassword, verifyPassword } from './password';

describe('password hashing', () => {
  it('verifies the right password and refuses a wrong one', async () => {
    const hash = await hashPassword('demo1234');
    expect(hash).toMatch(/^scrypt\$[\w-]+\$[\w-]+$/);
    expect(await verifyPassword('demo1234', hash)).toBe(true);
    expect(await verifyPassword('demo12345', hash)).toBe(false);
  });
  it('salts every hash', async () => expect(await hashPassword('x')).not.toBe(await hashPassword('x')));
  it('never matches the dummy hash or a malformed one', async () => {
    expect(await verifyPassword('', DUMMY_HASH)).toBe(false);
    expect(await verifyPassword('demo1234', 'plain-text')).toBe(false);
  });
});
