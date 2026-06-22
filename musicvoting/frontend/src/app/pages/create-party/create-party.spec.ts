import { throwError } from 'rxjs';
import { CreateParty } from './create-party';

describe('CreateParty', () => {
  let partyService: { createParty: jasmine.Spy };
  let router: { navigate: jasmine.Spy };
  let comp: CreateParty;

  beforeEach(() => {
    partyService = { createParty: jasmine.createSpy('createParty') };
    router = { navigate: jasmine.createSpy('navigate') };
    comp = new CreateParty(partyService as any, router as any);
  });

  it('starts with isLoading false and no error', () => {
    expect(comp.isLoading).toBe(false);
    expect(comp.error).toBeNull();
  });

  it('sets an error message and stops loading when party creation fails', () => {
    partyService.createParty.and.returnValue(throwError(() => new Error('boom')));

    comp.create();

    expect(partyService.createParty).toHaveBeenCalledWith('spotify');
    expect(comp.isLoading).toBe(false);
    expect(comp.error).toBe('Party konnte nicht erstellt werden. Bitte versuche es erneut.');
  });

  it('goBack navigates to home', () => {
    comp.goBack();

    expect(router.navigate).toHaveBeenCalledWith(['/']);
  });
});
