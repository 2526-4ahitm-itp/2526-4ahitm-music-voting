import { Home } from './home';

describe('Home', () => {
  let router: { navigate: jasmine.Spy };
  let comp: Home;

  beforeEach(() => {
    router = { navigate: jasmine.createSpy('navigate') };
    comp = new Home(router as any);
  });

  it('gotohostpage navigates to /host-options', () => {
    comp.gotohostpage();

    expect(router.navigate).toHaveBeenCalledWith(['/host-options']);
  });

  it('gotoguestpage navigates to code', () => {
    comp.gotoguestpage();

    expect(router.navigate).toHaveBeenCalledWith(['code']);
  });
});
