import { HttpInterceptorFn } from '@angular/common/http';

export const hostAuthInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem('mv_party_host_pin');
  if (token) {
    return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
  }
  return next(req);
};
