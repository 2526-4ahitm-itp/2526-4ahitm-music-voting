package at.htl.endpoints;

import io.smallrye.mutiny.Multi;
import io.smallrye.mutiny.subscription.MultiEmitter;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

@ApplicationScoped
public class LoginEventBus {

    private final List<MultiEmitter<? super LoginEvent>> emitters = new CopyOnWriteArrayList<>();

    public void emit(LoginEvent event) {
        for (var emitter : emitters) {
            try {
                emitter.emit(event);
            } catch (Exception ignored) {
            }
        }
    }

    public Multi<LoginEvent> stream() {
        return Multi.createFrom().emitter(emitter -> {
            emitters.add(emitter);
            emitter.onTermination(() -> emitters.remove(emitter));
        });
    }
}
