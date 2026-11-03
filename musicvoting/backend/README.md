# backend

This project uses Quarkus, the Supersonic Subatomic Java Framework.

If you want to learn more about Quarkus, please visit its website: <https://quarkus.io/>.

## Running the application in dev mode

You can run your application in dev mode that enables live coding using:

```shell script
./mvnw quarkus:dev
```

> **_NOTE:_**  Quarkus now ships with a Dev UI, which is available in dev mode only at <http://localhost:8080/q/dev/>.

## Database schema

The schema lives in `setup.sql` and is applied by PostgreSQL only on the **first** start of
an empty volume (`cd musicvoting && docker compose up -d`). Hibernate does not create or
update tables (`database.generation=none`).

After a schema change, either recreate the dev DB (deletes all local data):

```shell script
cd musicvoting && docker compose down -v && docker compose up -d
```

or apply the new statements by hand. For the party blacklist (`add-party-blacklist`):

```shell script
docker exec -i musicvoting-db-1 psql -U musicvoting -d musicvoting <<'SQL'
CREATE TABLE IF NOT EXISTS blacklist_entry (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    party_id    VARCHAR     NOT NULL REFERENCES party(id) ON DELETE CASCADE,
    kind        VARCHAR     NOT NULL,
    value       VARCHAR     NOT NULL,
    label       VARCHAR,
    image_url   TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (party_id, kind, value)
);
SQL
```

## Party blacklist

The host can block words, artists and songs per party (`BlacklistResource`, all `@HostOnly`):

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/party/{partyId}/blacklist` | list entries |
| `POST` | `/api/party/{partyId}/blacklist` | add `{kind: WORD\|ARTIST\|TRACK, value, label?, imageUrl?}` (201 new, 200 duplicate, 400 invalid) |
| `DELETE` | `/api/party/{partyId}/blacklist/{entryId}` | remove an entry (204 / 404) |
| `GET` | `/api/party/{partyId}/blacklist/artists?q=` | Spotify artist search for the setup page |

All matching lives in `BlacklistService.Blacklist#isBlocked` (words match as whole words,
case-insensitive; artists by Spotify ID; songs by track URI). It is applied when a song is
added (`403 "Nicht erlaubt."`), during the auto-refill, and as a `blocked` flag on search
results. Full API reference: `hugo/content/dev/api-reference.md`.

## Packaging and running the application

The application can be packaged using:

```shell script
./mvnw package
```

It produces the `quarkus-run.jar` file in the `target/quarkus-app/` directory.
Be aware that it’s not an _über-jar_ as the dependencies are copied into the `target/quarkus-app/lib/` directory.

The application is now runnable using `java -jar target/quarkus-app/quarkus-run.jar`.

If you want to build an _über-jar_, execute the following command:

```shell script
./mvnw package -Dquarkus.package.jar.type=uber-jar
```

The application, packaged as an _über-jar_, is now runnable using `java -jar target/*-runner.jar`.

## Creating a native executable

You can create a native executable using:

```shell script
./mvnw package -Dnative
```

Or, if you don't have GraalVM installed, you can run the native executable build in a container using:

```shell script
./mvnw package -Dnative -Dquarkus.native.container-build=true
```

You can then execute your native executable with: `./target/backend-1.0.0-SNAPSHOT-runner`

If you want to learn more about building native executables, please consult <https://quarkus.io/guides/maven-tooling>.

## Related Guides

- REST ([guide](https://quarkus.io/guides/rest)): A Jakarta REST implementation utilizing build time processing and Vert.x. This extension is not compatible with the quarkus-resteasy extension, or any of the extensions that depend on it.
- Hibernate ORM ([guide](https://quarkus.io/guides/hibernate-orm)): Define your persistent model with Hibernate ORM and Jakarta Persistence
- REST Jackson ([guide](https://quarkus.io/guides/rest#json-serialisation)): Jackson serialization support for Quarkus REST. This extension is not compatible with the quarkus-resteasy extension, or any of the extensions that depend on it
- Hibernate ORM with Panache ([guide](https://quarkus.io/guides/hibernate-orm-panache)): Simplify your persistence code for Hibernate ORM via the active record or the repository pattern
- JDBC Driver - PostgreSQL ([guide](https://quarkus.io/guides/datasource)): Connect to the PostgreSQL database via JDBC

## Provided Code

### Hibernate ORM

Create your first JPA entity

[Related guide section...](https://quarkus.io/guides/hibernate-orm)

[Related Hibernate with Panache section...](https://quarkus.io/guides/hibernate-orm-panache)


### REST

Easily start your REST Web Services

[Related guide section...](https://quarkus.io/guides/getting-started-reactive#reactive-jax-rs-resources)
