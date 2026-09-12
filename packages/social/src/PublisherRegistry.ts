import { SocialPublisher, SocialPlatform } from './publisher';
import { ValidationError } from '../../core/src/errors';
import { InstagramPublisher } from '../../../platforms/instagram/src/InstagramPublisher';
import { LinkedInPublisher } from '../../../platforms/linkedin/src/LinkedInPublisher';
import { XPublisher } from '../../../platforms/x/src/XPublisher';

export class PublisherRegistry {
  private publishers: Map<string, SocialPublisher> = new Map();

  constructor(registerDefaults = false) {
    if (registerDefaults) {
      this.register(new InstagramPublisher());
      this.register(new LinkedInPublisher());
      this.register(new XPublisher());
    }
  }

  register(publisher: SocialPublisher): void {
    if (!publisher || !publisher.platform) {
      throw new ValidationError('Invalid publisher: missing platform identifier.');
    }
    this.publishers.set(publisher.platform, publisher);
  }

  get(platform: string): SocialPublisher {
    const publisher = this.publishers.get(platform);
    if (!publisher) {
      throw new ValidationError(`No social publisher registered for unsupported or unknown platform '${platform}'`);
    }
    return publisher;
  }

  has(platform: string): boolean {
    return this.publishers.has(platform);
  }

  listPlatforms(): SocialPlatform[] {
    return Array.from(this.publishers.keys()) as SocialPlatform[];
  }

  clear(): void {
    this.publishers.clear();
  }
}

export const defaultPublisherRegistry = new PublisherRegistry(true);
