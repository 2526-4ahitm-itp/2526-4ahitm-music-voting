package at.htl.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.net.http.HttpHeaders;
import java.net.http.HttpResponse;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

public final class SpotifyApiErrors {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    /** Spotify's {@code error.reason} when a player command needs a Premium account. */
    public static final String PREMIUM_REQUIRED_REASON = "PREMIUM_REQUIRED";

    /**
     * Shown instead of Spotify's English "Player command failed: Premium required"
     * (provider spec "Spotify Provider Requires Premium Host Account").
     */
    public static final String PREMIUM_REQUIRED_MESSAGE = "Du brauchst Spotify Premium, um Musik abzuspielen.";

    private SpotifyApiErrors() {
    }

    public static Response buildResponse(HttpResponse<String> response, String actionLabel) {
        int status = response.statusCode();
        Integer retryAfterSeconds = extractRetryAfterSeconds(response.headers());
        String spotifyMessage = extractSpotifyMessage(response.body());

        Map<String, Object> payload = new HashMap<>();
        payload.put("status", status);
        String spotifyReason = extractSpotifyReason(response.body());
        if (status == 403 && PREMIUM_REQUIRED_REASON.equals(spotifyReason)) {
            payload.put("error", PREMIUM_REQUIRED_MESSAGE);
            payload.put("reason", PREMIUM_REQUIRED_REASON);
        } else {
            payload.put("error", buildUserMessage(status, actionLabel, retryAfterSeconds, spotifyMessage));
        }

        if (spotifyMessage != null && !spotifyMessage.isBlank()) {
            payload.put("spotifyMessage", spotifyMessage);
        }
        if (retryAfterSeconds != null) {
            payload.put("retryAfterSeconds", retryAfterSeconds);
            payload.put("retryAt", Instant.now().plusSeconds(retryAfterSeconds).toString());
        }

        return Response.status(status)
                .type(MediaType.APPLICATION_JSON)
                .entity(payload)
                .build();
    }

    public static WebApplicationException asException(HttpResponse<String> response, String actionLabel) {
        return new WebApplicationException(buildResponse(response, actionLabel));
    }

    public static Response unexpectedError(String actionLabel, Exception exception) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("status", Response.Status.INTERNAL_SERVER_ERROR.getStatusCode());
        payload.put("error", actionLabel + " ist fehlgeschlagen.");

        String details = sanitize(exception == null ? null : exception.getMessage());
        if (details != null && !details.isBlank()) {
            payload.put("details", details);
        }

        return Response.serverError()
                .type(MediaType.APPLICATION_JSON)
                .entity(payload)
                .build();
    }

    private static String buildUserMessage(
            int status,
            String actionLabel,
            Integer retryAfterSeconds,
            String spotifyMessage
    ) {
        if (status == 429) {
            if (retryAfterSeconds != null) {
                return actionLabel + " ist gerade von Spotify rate-limitiert. Bitte "
                        + formatDuration(retryAfterSeconds)
                        + " warten und danach erneut versuchen.";
            }
            return actionLabel + " ist gerade von Spotify rate-limitiert. Bitte kurz warten und erneut versuchen.";
        }

        if (spotifyMessage != null && !spotifyMessage.isBlank()) {
            return actionLabel + " ist fehlgeschlagen: " + spotifyMessage;
        }

        return actionLabel + " ist mit HTTP " + status + " fehlgeschlagen.";
    }

    private static Integer extractRetryAfterSeconds(HttpHeaders headers) {
        Optional<String> retryAfter = headers.firstValue("Retry-After");
        if (retryAfter.isEmpty()) {
            return null;
        }

        try {
            int seconds = Integer.parseInt(retryAfter.get().trim());
            return Math.max(seconds, 0);
        } catch (NumberFormatException ignored) {
            return null;
        }
    }

    /** Reads {@code error.reason} from a Spotify error body (e.g. "PREMIUM_REQUIRED"); null if absent. */
    private static String extractSpotifyReason(String body) {
        if (body == null || body.isBlank()) {
            return null;
        }
        try {
            Object error = MAPPER.readValue(body, Map.class).get("error");
            if (error instanceof Map<?, ?> errorMap && errorMap.get("reason") instanceof String reason) {
                return reason;
            }
        } catch (Exception ignored) {
            // Non-JSON bodies have no reason.
        }
        return null;
    }

    private static String extractSpotifyMessage(String body) {
        String sanitized = sanitize(body);
        if (sanitized == null || sanitized.isBlank()) {
            return null;
        }

        try {
            Map<?, ?> parsed = MAPPER.readValue(sanitized, Map.class);
            Object error = parsed.get("error");
            if (error instanceof Map<?, ?> errorMap) {
                Object message = errorMap.get("message");
                if (message instanceof String text && !text.isBlank()) {
                    return sanitize(text);
                }
            }
            if (error instanceof String text && !text.isBlank()) {
                return sanitize(text);
            }
            Object message = parsed.get("message");
            if (message instanceof String text && !text.isBlank()) {
                return sanitize(text);
            }
        } catch (Exception ignored) {
            // Non-JSON bodies should still be passed through as plain text.
        }

        return sanitized;
    }

    private static String formatDuration(int seconds) {
        int minutes = seconds / 60;
        int remainingSeconds = seconds % 60;

        if (minutes == 0) {
            return remainingSeconds + (remainingSeconds == 1 ? " Sekunde" : " Sekunden");
        }
        if (remainingSeconds == 0) {
            return minutes + (minutes == 1 ? " Minute" : " Minuten");
        }

        return minutes
                + (minutes == 1 ? " Minute" : " Minuten")
                + " "
                + remainingSeconds
                + (remainingSeconds == 1 ? " Sekunde" : " Sekunden");
    }

    private static String sanitize(String text) {
        if (text == null) {
            return null;
        }

        String compact = text
                .replace('\r', ' ')
                .replace('\n', ' ')
                .replace('\t', ' ')
                .trim()
                .replaceAll("\\s{2,}", " ");

        return compact.isBlank() ? null : compact;
    }
}
