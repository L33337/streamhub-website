import { describe, expect, it } from 'vitest';
import { pickReasoning, stripConfidenceLeadIn } from '../slot-copy';

describe('stripConfidenceLeadIn', () => {
  it.each([
    [
      'Medium confidence: streamed on 3 Fridays in the last 4 weeks, typically starting between 16:24 and 16:44.',
      'Streamed on 3 Fridays in the last 4 weeks, typically starting between 16:24 and 16:44.',
    ],
    [
      'Low confidence: streams most Saturdays (4× in the last 4 weeks), but at widely varying times.',
      'Streams most Saturdays (4× in the last 4 weeks), but at widely varying times.',
    ],
    ['High confidence: announced on stream for Friday 20:00.', 'Announced on stream for Friday 20:00.'],
  ])('strips the template lead-in: %s', (input, expected) => {
    expect(stripConfidenceLeadIn(input)).toBe(expected);
  });

  it('leaves content-bearing prefixes alone', () => {
    const cancelled = 'No stream expected: X usually streams Fridays, but announced a break.';
    const fresh = 'Newly added: no history yet, based on the announced schedule.';
    expect(stripConfidenceLeadIn(cancelled)).toBe(cancelled);
    expect(stripConfidenceLeadIn(fresh)).toBe(fresh);
  });

  it('only matches at the very start and with the exact template casing', () => {
    const mid = 'Streams Fridays. Medium confidence: not a lead-in.';
    expect(stripConfidenceLeadIn(mid)).toBe(mid);
    expect(stripConfidenceLeadIn('medium confidence: lower case stays')).toBe(
      'medium confidence: lower case stays',
    );
    // Idempotent: a backend that already dropped the lead-in is a no-op.
    expect(stripConfidenceLeadIn('Streamed on 3 Fridays.')).toBe('Streamed on 3 Fridays.');
  });
});

describe('pickReasoning', () => {
  const generic = 'Medium confidence: streamed on 3 Fridays in the last 4 weeks.';

  it('strips the lead-in from the generic fallback', () => {
    const picked = pickReasoning(
      { reasoning: 'Viernes de League, como siempre.', copy_language: 'es', generic_reasoning: generic },
      'de',
    );
    expect(picked).toEqual({
      text: 'Streamed on 3 Fridays in the last 4 weeks.',
      isGeneric: true,
      lang: 'en',
    });
  });

  it('never touches the copywriter reasoning', () => {
    const reasoning = 'Medium confidence: this sentence belongs to the copywriter.';
    expect(pickReasoning({ reasoning, copy_language: 'en', generic_reasoning: generic }, 'de'))
      .toEqual({ text: reasoning, isGeneric: false, lang: 'en' });
  });

  it('falls back to the stripped generic text when there is no copy', () => {
    expect(pickReasoning({ generic_reasoning: generic }, 'en')?.text).toBe(
      'Streamed on 3 Fridays in the last 4 weeks.',
    );
  });

  it('returns null when a generic text is nothing but the lead-in', () => {
    expect(pickReasoning({ generic_reasoning: 'Low confidence: ' }, 'en')).toBeNull();
  });
});
