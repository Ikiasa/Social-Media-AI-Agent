import { EnvAIKeyProvider } from '../packages/ai/src/keyProvider';

const provider = new EnvAIKeyProvider();

export const geminiApiKeys: string[] = new Proxy([], {
  get(_target, prop) {
    if (prop === 'length') return 1;
    if (typeof prop === 'string' && !isNaN(Number(prop))) {
      let key = '';
      provider.getKey().then(k => { key = k; }).catch(() => {});
      return key || process.env.GEMINI_API_KEY || '';
    }
    return (provider as any)[prop];
  }
});
