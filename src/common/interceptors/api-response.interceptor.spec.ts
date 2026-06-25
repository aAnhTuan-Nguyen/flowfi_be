/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment */
import { of } from 'rxjs';
import { ApiResponseInterceptor } from './api-response.interceptor';

describe('ApiResponseInterceptor', () => {
  it('wraps successful responses in the Flutter API envelope', (done) => {
    const interceptor = new ApiResponseInterceptor();
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({ requestId: 'req_test' }),
      }),
    } as any;

    interceptor
      .intercept(context, { handle: () => of({ id: 'wallet_1' }) })
      .subscribe((result) => {
        expect(result).toEqual({
          success: true,
          data: { id: 'wallet_1' },
          error: null,
          meta: {
            requestId: 'req_test',
            timestamp: expect.any(String),
          },
        });
        done();
      });
  });
});
