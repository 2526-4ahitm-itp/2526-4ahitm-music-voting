package at.htl.service;

import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.Response;
import org.junit.jupiter.api.Test;

import java.net.http.HttpHeaders;
import java.net.http.HttpResponse;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class SpotifyApiErrorsTest {

    @SuppressWarnings("unchecked")
    private HttpResponse<String> httpResponse(int status, String body, Map<String, List<String>> headers) {
        HttpResponse<String> response = mock(HttpResponse.class);
        when(response.statusCode()).thenReturn(status);
        when(response.body()).thenReturn(body);
        when(response.headers()).thenReturn(HttpHeaders.of(headers, (a, b) -> true));
        return response;
    }

    @Test
    void buildResponse_rateLimitedWithRetryAfter_includesRetryInfoAndGermanMessage() {
        HttpResponse<String> response = httpResponse(429, "", Map.of("Retry-After", List.of("65")));

        Response result = SpotifyApiErrors.buildResponse(response, "Das Abspielen");

        assertEquals(429, result.getStatus());
        @SuppressWarnings("unchecked")
        Map<String, Object> payload = (Map<String, Object>) result.getEntity();
        assertEquals(429, payload.get("status"));
        assertEquals(65, payload.get("retryAfterSeconds"));
        assertNotNull(payload.get("retryAt"));
        assertEquals(
                "Das Abspielen ist gerade von Spotify rate-limitiert. Bitte 1 Minute 5 Sekunden warten und danach erneut versuchen.",
                payload.get("error"));
    }

    @Test
    void buildResponse_rateLimitedWithoutRetryAfter_usesGenericMessage() {
        HttpResponse<String> response = httpResponse(429, "", Map.of());

        Response result = SpotifyApiErrors.buildResponse(response, "Das Abspielen");

        @SuppressWarnings("unchecked")
        Map<String, Object> payload = (Map<String, Object>) result.getEntity();
        assertFalse(payload.containsKey("retryAfterSeconds"));
        assertEquals(
                "Das Abspielen ist gerade von Spotify rate-limitiert. Bitte kurz warten und erneut versuchen.",
                payload.get("error"));
    }

    @Test
    void buildResponse_withSpotifyErrorObjectMessage_includesSpotifyMessage() {
        String body = "{\"error\": {\"status\": 404, \"message\": \"Device not found\"}}";
        HttpResponse<String> response = httpResponse(404, body, Map.of());

        Response result = SpotifyApiErrors.buildResponse(response, "Das Abspielen");

        @SuppressWarnings("unchecked")
        Map<String, Object> payload = (Map<String, Object>) result.getEntity();
        assertEquals("Device not found", payload.get("spotifyMessage"));
        assertEquals("Das Abspielen ist fehlgeschlagen: Device not found", payload.get("error"));
    }

    @Test
    void buildResponse_withPlainErrorString_includesSpotifyMessage() {
        String body = "{\"error\": \"invalid_grant\"}";
        HttpResponse<String> response = httpResponse(400, body, Map.of());

        Response result = SpotifyApiErrors.buildResponse(response, "Die Spotify-Anmeldung");

        @SuppressWarnings("unchecked")
        Map<String, Object> payload = (Map<String, Object>) result.getEntity();
        assertEquals("invalid_grant", payload.get("spotifyMessage"));
        assertEquals("Die Spotify-Anmeldung ist fehlgeschlagen: invalid_grant", payload.get("error"));
    }

    @Test
    void buildResponse_withTopLevelMessage_includesSpotifyMessage() {
        String body = "{\"message\": \"Something went wrong\"}";
        HttpResponse<String> response = httpResponse(500, body, Map.of());

        Response result = SpotifyApiErrors.buildResponse(response, "Das Laden");

        @SuppressWarnings("unchecked")
        Map<String, Object> payload = (Map<String, Object>) result.getEntity();
        assertEquals("Something went wrong", payload.get("spotifyMessage"));
        assertEquals("Das Laden ist fehlgeschlagen: Something went wrong", payload.get("error"));
    }

    @Test
    void buildResponse_withNonJsonBody_usesSanitizedBodyAsMessage() {
        String body = "  Internal\nServer   Error  ";
        HttpResponse<String> response = httpResponse(500, body, Map.of());

        Response result = SpotifyApiErrors.buildResponse(response, "Das Laden");

        @SuppressWarnings("unchecked")
        Map<String, Object> payload = (Map<String, Object>) result.getEntity();
        assertEquals("Internal Server Error", payload.get("spotifyMessage"));
        assertEquals("Das Laden ist fehlgeschlagen: Internal Server Error", payload.get("error"));
    }

    @Test
    void buildResponse_withEmptyBody_usesGenericHttpStatusMessage() {
        HttpResponse<String> response = httpResponse(503, "", Map.of());

        Response result = SpotifyApiErrors.buildResponse(response, "Das Laden");

        @SuppressWarnings("unchecked")
        Map<String, Object> payload = (Map<String, Object>) result.getEntity();
        assertFalse(payload.containsKey("spotifyMessage"));
        assertEquals("Das Laden ist mit HTTP 503 fehlgeschlagen.", payload.get("error"));
    }

    @Test
    void asException_wrapsBuiltResponseInWebApplicationException() {
        HttpResponse<String> response = httpResponse(404, "", Map.of());

        WebApplicationException exception = SpotifyApiErrors.asException(response, "Das Laden");

        assertEquals(404, exception.getResponse().getStatus());
    }

    @Test
    void unexpectedError_withExceptionMessage_includesDetails() {
        Response result = SpotifyApiErrors.unexpectedError("Das Abspielen", new RuntimeException("boom"));

        assertEquals(500, result.getStatus());
        @SuppressWarnings("unchecked")
        Map<String, Object> payload = (Map<String, Object>) result.getEntity();
        assertEquals("Das Abspielen ist fehlgeschlagen.", payload.get("error"));
        assertEquals("boom", payload.get("details"));
    }

    @Test
    void unexpectedError_withoutException_omitsDetails() {
        Response result = SpotifyApiErrors.unexpectedError("Das Abspielen", null);

        @SuppressWarnings("unchecked")
        Map<String, Object> payload = (Map<String, Object>) result.getEntity();
        assertEquals("Das Abspielen ist fehlgeschlagen.", payload.get("error"));
        assertFalse(payload.containsKey("details"));
    }
}
