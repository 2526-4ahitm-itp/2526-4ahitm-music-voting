import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const hostGuard: CanActivateFn = () => {
  const token = localStorage.getItem('mv_party_host_pin');
  if (token) {
    return true;
  }
  inject(Router).navigate(['/']);
  return false;
};
