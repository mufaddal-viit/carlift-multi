import { describe, expect, it } from 'vitest';
import { databaseUrl } from './url';

describe('databaseUrl', () => {
  it('adds the database name that Vercel Storage leaves out', () =>
    expect(databaseUrl({ MONGODB_URI: 'mongodb+srv://u:p@cluster.example.net/?retryWrites=true&w=majority' })).toBe(
      'mongodb+srv://u:p@cluster.example.net/liftledger?retryWrites=true&w=majority',
    ));
  it('keeps a database name that is already there', () =>
    expect(databaseUrl({ MONGODB_URI: 'mongodb+srv://u:p@cluster.example.net/other?w=majority' })).toContain('/other?'));
  it('honours MONGODB_DB', () =>
    expect(databaseUrl({ MONGODB_URI: 'mongodb://localhost:27017', MONGODB_DB: 'staging' })).toBe('mongodb://localhost:27017/staging'));
  it('prefers an explicit DATABASE_URL', () => expect(databaseUrl({ DATABASE_URL: 'mongodb://x/y', MONGODB_URI: 'mongodb://z' })).toBe('mongodb://x/y'));
  it('explains what is missing', () => expect(() => databaseUrl({})).toThrow('MONGODB_URI'));
});
