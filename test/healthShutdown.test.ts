import { describe, it, expect, vi } from 'vitest';
import { HealthService } from '../services/api/src/services/healthService';

describe('HealthService Liveness & Readiness Tests', () => {
  const healthService = new HealthService();

  it('should return HTTP 200 ok for liveness check', () => {
    const res: any = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    healthService.getLiveness({} as any, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'ok',
        service: 'riona-api',
      })
    );
  });

  it('should return HTTP 200 ready for readiness check in test environment', () => {
    const res: any = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    healthService.getReadiness({} as any, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'ready',
        dependencies: expect.objectContaining({ mongodb: 'connected' }),
      })
    );
  });
});
