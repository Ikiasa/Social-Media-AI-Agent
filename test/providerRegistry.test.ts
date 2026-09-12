import { describe, it, expect, beforeEach } from 'vitest';
import { PublisherRegistry } from '../packages/social/src/PublisherRegistry';
import { InstagramPublisher } from '../platforms/instagram/src/InstagramPublisher';
import { ValidationError } from '../packages/core/src/errors';

describe('PublisherRegistry & Platform Resolution Safety', () => {
  let registry: PublisherRegistry;

  beforeEach(() => {
    registry = new PublisherRegistry();
  });

  it('should register and resolve InstagramPublisher cleanly', () => {
    const igPublisher = new InstagramPublisher();
    registry.register(igPublisher);

    expect(registry.has('instagram')).toBe(true);
    expect(registry.get('instagram')).toBe(igPublisher);
  });

  it('should list all registered social platforms', () => {
    registry.register(new InstagramPublisher());
    expect(registry.listPlatforms()).toEqual(['instagram']);
  });

  it('should throw ValidationError when requesting an unregistered or unknown platform', () => {
    registry.register(new InstagramPublisher());

    expect(() => registry.get('linkedin')).toThrow(ValidationError);
    expect(() => registry.get('x')).toThrow(ValidationError);
    expect(() => registry.get('unsupported_platform')).toThrow(ValidationError);
  });

  it('should throw ValidationError when attempting to register an invalid publisher', () => {
    expect(() => registry.register({} as any)).toThrow(ValidationError);
  });
});
