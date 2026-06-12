package at.htl.endpoints;

import at.htl.domain.Party;
import at.htl.domain.PartyId;
import at.htl.domain.PartyRegistry;
import at.htl.domain.ProviderKind;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.ws.rs.core.MultivaluedHashMap;
import jakarta.ws.rs.core.MultivaluedMap;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.container.ContainerRequestContext;
import jakarta.ws.rs.core.UriInfo;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@QuarkusTest
class HostAuthFilterTest {

    @Inject
    PartyRegistry partyRegistry;

    @Inject
    HostAuthFilter filter;

    private PartyId partyId;

    @AfterEach
    void cleanup() {
        if (partyId != null) {
            partyRegistry.remove(partyId);
        }
    }

    private Party registerParty() {
        partyId = PartyId.of(UUID.randomUUID().toString());
        Party party = new Party(partyId, ProviderKind.SPOTIFY, "12345", "67890");
        partyRegistry.register(party);
        return party;
    }

    private ContainerRequestContext mockContext(MultivaluedMap<String, String> pathParams, String authHeader) {
        ContainerRequestContext ctx = mock(ContainerRequestContext.class);
        UriInfo uriInfo = mock(UriInfo.class);
        when(uriInfo.getPathParameters()).thenReturn(pathParams);
        when(ctx.getUriInfo()).thenReturn(uriInfo);
        when(ctx.getHeaderString("Authorization")).thenReturn(authHeader);
        return ctx;
    }

    @Test
    void filter_withoutPartyIdOrIdPathParam_abortsWithBadRequest() {
        ContainerRequestContext ctx = mockContext(new MultivaluedHashMap<>(), null);

        filter.filter(ctx);

        verify(ctx).abortWith(argThat(r -> r.getStatus() == Response.Status.BAD_REQUEST.getStatusCode()));
    }

    @Test
    void filter_withUnknownParty_abortsWithNotFound() {
        MultivaluedMap<String, String> pathParams = new MultivaluedHashMap<>();
        pathParams.putSingle("id", UUID.randomUUID().toString());
        ContainerRequestContext ctx = mockContext(pathParams, null);

        filter.filter(ctx);

        verify(ctx).abortWith(argThat(r -> r.getStatus() == Response.Status.NOT_FOUND.getStatusCode()));
    }

    @Test
    void filter_withoutAuthorizationHeader_abortsWithUnauthorized() {
        registerParty();
        MultivaluedMap<String, String> pathParams = new MultivaluedHashMap<>();
        pathParams.putSingle("id", partyId.value());
        ContainerRequestContext ctx = mockContext(pathParams, null);

        filter.filter(ctx);

        verify(ctx).abortWith(argThat(r -> r.getStatus() == Response.Status.UNAUTHORIZED.getStatusCode()));
    }

    @Test
    void filter_withNonBearerAuthorizationHeader_abortsWithUnauthorized() {
        registerParty();
        MultivaluedMap<String, String> pathParams = new MultivaluedHashMap<>();
        pathParams.putSingle("id", partyId.value());
        ContainerRequestContext ctx = mockContext(pathParams, "Basic dXNlcjpwYXNz");

        filter.filter(ctx);

        verify(ctx).abortWith(argThat(r -> r.getStatus() == Response.Status.UNAUTHORIZED.getStatusCode()));
    }

    @Test
    void filter_withWrongHostPin_abortsWithForbidden() {
        registerParty();
        MultivaluedMap<String, String> pathParams = new MultivaluedHashMap<>();
        pathParams.putSingle("id", partyId.value());
        ContainerRequestContext ctx = mockContext(pathParams, "Bearer wrong-pin");

        filter.filter(ctx);

        verify(ctx).abortWith(argThat(r -> r.getStatus() == Response.Status.FORBIDDEN.getStatusCode()));
    }

    @Test
    void filter_withCorrectHostPinUsingPartyIdParam_doesNotAbort() {
        Party party = registerParty();
        MultivaluedMap<String, String> pathParams = new MultivaluedHashMap<>();
        pathParams.putSingle("partyId", partyId.value());
        ContainerRequestContext ctx = mockContext(pathParams, "Bearer " + party.hostPin());

        filter.filter(ctx);

        verify(ctx, never()).abortWith(any());
    }

    @Test
    void filter_withCorrectHostPinAndExtraWhitespace_doesNotAbort() {
        Party party = registerParty();
        MultivaluedMap<String, String> pathParams = new MultivaluedHashMap<>();
        pathParams.putSingle("id", partyId.value());
        ContainerRequestContext ctx = mockContext(pathParams, "Bearer  " + party.hostPin() + " ");

        filter.filter(ctx);

        verify(ctx, never()).abortWith(any());
    }
}
