package at.htl.endpoints;

import java.time.Instant;
import java.util.Map;

public record LoginEvent(String type, Instant timestamp, Map<String, String> payload) {
}
