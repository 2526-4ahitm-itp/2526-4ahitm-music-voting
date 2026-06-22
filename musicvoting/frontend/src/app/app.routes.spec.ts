import { routes } from './app.routes';
import { hostGuard } from './host.guard';
import { Home } from './pages/home/home';
import { CodeInput } from './pages/code-input/code-input';
import { Startpage } from './pages/startpage/startpage';
import { HostDashboard } from './pages/host-dashboard/host-dashboard';

describe('app.routes', () => {
  it('routes the empty path to the Home component', () => {
    const route = routes.find((r) => r.path === '');

    expect(route?.component).toBe(Home);
  });

  it('protects the startpage and dashboard routes with the host guard', () => {
    const startpage = routes.find((r) => r.path === 'startpage');
    const dashboard = routes.find((r) => r.path === 'dashboard');

    expect(startpage?.component).toBe(Startpage);
    expect(startpage?.canActivate).toEqual([hostGuard]);
    expect(dashboard?.component).toBe(HostDashboard);
    expect(dashboard?.canActivate).toEqual([hostGuard]);
  });

  it('routes join/:pin to the CodeInput component', () => {
    const route = routes.find((r) => r.path === 'join/:pin');

    expect(route?.component).toBe(CodeInput);
  });

  it('redirects unknown paths to the root route', () => {
    const route = routes.find((r) => r.path === '**');

    expect(route?.redirectTo).toBe('');
  });
});
