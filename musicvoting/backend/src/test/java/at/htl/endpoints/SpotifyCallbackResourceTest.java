package at.htl.endpoints;

import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.ws.rs.core.Response;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CopyOnWriteArrayList;

import static org.junit.jupiter.api.Assertions.*;

@QuarkusTest
class SpotifyCallbackResourceTest {

    @Inject
    SpotifyCallbackResource resource;

    @Inject
    LoginEventBus loginEventBus;

    @Test
    void callback_withoutState_returnsBadRequest() {
        Response response = resource.callback("some-code", null);

        assertEquals(400, response.getStatus());
        @SuppressWarnings("unchecked")
        Map<String, Object> body = (Map<String, Object>) response.getEntity();
        assertEquals("Missing or invalid state parameter", body.get("error"));
    }

    @Test
    void callback_withInvalidStateFormat_returnsBadRequest() {
        Response response = resource.callback("some-code", "not-a-valid-state");

        assertEquals(400, response.getStatus());
        @SuppressWarnings("unchecked")
        Map<String, Object> body = (Map<String, Object>) response.getEntity();
        assertEquals("Missing or invalid state parameter", body.get("error"));
    }

    @Test
    void callback_withUnknownParty_returnsNotFound() {
        Response response = resource.callback("some-code", "web:" + UUID.randomUUID());

        assertEquals(404, response.getStatus());
    }

    @Test
    void iosCallback_withoutCode_returnsBadRequest() {
        Response response = resource.iosCallback(null, "ios::" + UUID.randomUUID(), null);

        assertEquals(400, response.getStatus());
        @SuppressWarnings("unchecked")
        Map<String, Object> body = (Map<String, Object>) response.getEntity();
        assertEquals("Missing code", body.get("error"));
    }

    @Test
    void iosCallback_withoutPartyIdInState_returnsBadRequest() {
        Response response = resource.iosCallback("some-code", "ios:install-1", null);

        assertEquals(400, response.getStatus());
        @SuppressWarnings("unchecked")
        Map<String, Object> body = (Map<String, Object>) response.getEntity();
        assertEquals("Missing party ID in state", body.get("error"));
    }

    @Test
    void iosCallback_withMismatchedInstallId_returnsBadRequest() {
        Response response = resource.iosCallback(
                "some-code", "ios:install-1:" + UUID.randomUUID(), "install-2");

        assertEquals(400, response.getStatus());
        @SuppressWarnings("unchecked")
        Map<String, Object> body = (Map<String, Object>) response.getEntity();
        assertEquals("Installation ID mismatch", body.get("error"));
    }

    @Test
    void iosCallback_withUnknownParty_returnsNotFound() {
        Response response = resource.iosCallback(
                "some-code", "ios:install-1:" + UUID.randomUUID(), "install-1");

        assertEquals(404, response.getStatus());
    }

    @Test
    void events_web_receivesLoginSuccessForWebSourceOnly() {
        var stream = resource.events("web", null, null);
        List<LoginEvent> received = new CopyOnWriteArrayList<>();
        var subscription = stream.subscribe().with(received::add);

        try {
            loginEventBus.emit(new LoginEvent("login-success", Instant.now(), Map.of("source", "web")));
            loginEventBus.emit(new LoginEvent("login-success", Instant.now(), Map.of("source", "ios")));

            assertTrue(received.stream().anyMatch(e -> "login-success".equals(e.type())
                    && "web".equals(e.payload().get("source"))));
            assertFalse(received.stream().anyMatch(e -> "login-success".equals(e.type())
                    && "ios".equals(e.payload().get("source"))));
        } finally {
            subscription.cancel();
        }
    }

    @Test
    void events_web_receivesQueueUpdatedOnlyForMatchingPartyId() {
        var stream = resource.events("web", null, "party-a");
        List<LoginEvent> received = new CopyOnWriteArrayList<>();
        var subscription = stream.subscribe().with(received::add);

        try {
            loginEventBus.emit(new LoginEvent("queue-updated", Instant.now(), Map.of("partyId", "party-a")));
            loginEventBus.emit(new LoginEvent("queue-updated", Instant.now(), Map.of("partyId", "party-b")));

            assertTrue(received.stream().anyMatch(e -> "queue-updated".equals(e.type())
                    && "party-a".equals(e.payload().get("partyId"))));
            assertFalse(received.stream().anyMatch(e -> "queue-updated".equals(e.type())
                    && "party-b".equals(e.payload().get("partyId"))));
        } finally {
            subscription.cancel();
        }
    }

    @Test
    void events_web_receivesPartyEndedForMatchingPartyIdOrWhenUnfiltered() {
        var stream = resource.events("web", null, "party-a");
        List<LoginEvent> received = new CopyOnWriteArrayList<>();
        var subscription = stream.subscribe().with(received::add);

        try {
            loginEventBus.emit(new LoginEvent("party-ended", Instant.now(), Map.of("partyId", "party-a")));
            loginEventBus.emit(new LoginEvent("party-ended", Instant.now(), Map.of("partyId", "party-b")));

            assertTrue(received.stream().anyMatch(e -> "party-ended".equals(e.type())
                    && "party-a".equals(e.payload().get("partyId"))));
            assertFalse(received.stream().anyMatch(e -> "party-ended".equals(e.type())
                    && "party-b".equals(e.payload().get("partyId"))));
        } finally {
            subscription.cancel();
        }
    }

    @Test
    void events_ios_receivesEventsMatchingInstallationIdOrPartyId() {
        var stream = resource.events("ios", "install-1", "party-a");
        List<LoginEvent> received = new CopyOnWriteArrayList<>();
        var subscription = stream.subscribe().with(received::add);

        try {
            loginEventBus.emit(new LoginEvent("login-success", Instant.now(),
                    Map.of("source", "ios", "installationId", "install-1")));
            loginEventBus.emit(new LoginEvent("login-success", Instant.now(),
                    Map.of("source", "ios", "installationId", "install-2")));
            loginEventBus.emit(new LoginEvent("track-changed", Instant.now(), Map.of("partyId", "party-a")));
            loginEventBus.emit(new LoginEvent("track-changed", Instant.now(), Map.of("partyId", "party-b")));

            assertTrue(received.stream().anyMatch(e -> "install-1".equals(e.payload().get("installationId"))));
            assertFalse(received.stream().anyMatch(e -> "install-2".equals(e.payload().get("installationId"))));
            assertTrue(received.stream().anyMatch(e -> "track-changed".equals(e.type())
                    && "party-a".equals(e.payload().get("partyId"))));
            assertFalse(received.stream().anyMatch(e -> "track-changed".equals(e.type())
                    && "party-b".equals(e.payload().get("partyId"))));
        } finally {
            subscription.cancel();
        }
    }

    @Test
    void events_unknownSource_returnsUnfilteredStream() {
        var stream = resource.events("other", null, null);
        List<LoginEvent> received = new CopyOnWriteArrayList<>();
        var subscription = stream.subscribe().with(received::add);

        try {
            loginEventBus.emit(new LoginEvent("queue-updated", Instant.now(), Map.of("partyId", "anything")));

            assertTrue(received.stream().anyMatch(e -> "queue-updated".equals(e.type())));
        } finally {
            subscription.cancel();
        }
    }
}
