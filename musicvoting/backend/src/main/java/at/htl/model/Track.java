package at.htl.model;

import java.util.Arrays;

public class Track {

    public String name;
    public String[] artist;
    public String duration_ms;
    public String image;
    public String release_date;
    public Boolean is_playable;
    public String type;
    public String uri;

    public Track(String name, String[] artist, String duration_ms, String image, String release_date, Boolean is_playable, String type, String uri) {
        this.name = name;
        this.artist = artist;
        this.duration_ms = duration_ms;
        this.image = image;
        this.release_date = release_date;
        this.is_playable = is_playable;
        this.type = type;
        this.uri = uri;
    }

    public Track() {
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String[] getArtist() {
        return artist;
    }

    public void setArtist(String[] artist) {
        this.artist = artist;
    }

    public String getDuration_ms() {
        return duration_ms;
    }

    public void setDuration_ms(String duration_ms) {
        this.duration_ms = duration_ms;
    }

    public String getImage() {
        return image;
    }

    public void setImage(String image) {
        this.image = image;
    }

    public String getRelease_date() {
        return release_date;
    }

    public void setRelease_date(String release_date) {
        this.release_date = release_date;
    }

    public Boolean getIs_playable() {
        return is_playable;
    }

    public void setIs_playable(Boolean is_playable) {
        this.is_playable = is_playable;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getUri() {
        return uri;
    }

    public void setUri(String uri) {
        this.uri = uri;
    }

    @Override
    public String toString() {
        return "Track{" +
                "name='" + name + '\'' +
                ", artist=" + Arrays.toString(artist) +
                ", duration_ms='" + duration_ms + '\'' +
                ", image='" + image + '\'' +
                ", release_date='" + release_date + '\'' +
                ", is_playable=" + is_playable +
                ", type='" + type + '\'' +
                ", uri='" + uri + '\'' +
                '}';
    }
}
