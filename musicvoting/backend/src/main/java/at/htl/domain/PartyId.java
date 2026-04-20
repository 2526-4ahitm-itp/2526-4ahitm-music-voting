package at.htl.domain;

import java.util.Objects;
import java.util.UUID;

public final class PartyId {

    private final String value;

    private PartyId(String value) {
        this.value = Objects.requireNonNull(value, "PartyId value must not be null");
    }

    public static PartyId of(String value) {
        return new PartyId(value);
    }

    public static PartyId newRandom() {
        return new PartyId(UUID.randomUUID().toString());
    }

    public String value() {
        return value;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof PartyId other)) return false;
        return value.equals(other.value);
    }

    @Override
    public int hashCode() {
        return value.hashCode();
    }

    @Override
    public String toString() {
        return value;
    }
}
