package at.htl.control;

import at.htl.model.BlacklistItem;
import at.htl.model.Song;
import io.quarkus.hibernate.orm.panache.PanacheRepository;

import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;

@ApplicationScoped
public class BlacklistRepository implements PanacheRepository<BlacklistItem> {

    public boolean checkSong(Song song) {
        List<BlacklistItem> items = this.listAll();

        for (BlacklistItem item :
                items) {

            //NormalizedLevenshtein l = new NormalizedLevenshtein();

//            System.out.println("String Ähnlichkeit: "+l.distance(song.getSongName().toUpperCase(), item.getPhrase().toUpperCase())+
//                    " von "+song.getSongName()+" und "+item.getPhrase());
//            double similarity = l.distance(song.getSongName().toUpperCase(), item.getPhrase().toUpperCase());
            if (song.getSongName().contains(item.getPhrase())) {
                return true;
            }
        }

        return false;
    }

}
