import { describe, expect, it } from 'vitest';
import {
  SUPABASE_FUNCTIONS_REGION,
  SUPABASE_REGION_HEADER,
  SUPABASE_REGION_PARAM,
  withFunctionRegion,
} from '../region';

describe('Supabase Edge Function region pinning', () => {
  it('pins to the database region', () => {
    expect(SUPABASE_FUNCTIONS_REGION).toBe('eu-west-1');
    expect(SUPABASE_REGION_HEADER).toBe('x-region');
    expect(SUPABASE_REGION_PARAM).toBe('forceFunctionRegion');
  });

  it('appends the region parameter to a bare function URL', () => {
    expect(withFunctionRegion('https://example.supabase.co/functions/v1/search-streamers')).toBe(
      'https://example.supabase.co/functions/v1/search-streamers?forceFunctionRegion=eu-west-1',
    );
  });

  it('keeps an existing query string and replaces a stale region value', () => {
    expect(
      withFunctionRegion('https://example.supabase.co/functions/v1/x?a=1&forceFunctionRegion=us-east-1'),
    ).toBe('https://example.supabase.co/functions/v1/x?a=1&forceFunctionRegion=eu-west-1');
  });

  it('accepts an explicit region', () => {
    expect(withFunctionRegion('https://h/functions/v1/x', 'eu-central-1')).toContain(
      'forceFunctionRegion=eu-central-1',
    );
  });
});
