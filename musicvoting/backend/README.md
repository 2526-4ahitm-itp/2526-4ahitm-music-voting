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
an empty volume (`cd musicvoting && docker compose up -d`). In production Hibernate does not
create or update tables. In dev mode (`quarkus:dev`) it runs with `database.generation=update`
and silently creates missing tables, so run a rename migration **before** starting a new
backend, or you end up with an empty second table.

The dev DB runs PostgreSQL 19 in the volume `db_data_pg19` (mounted at `/var/lib/postgresql`,
the layout of the 18+ images). The previous volume `musicvoting_db_data` holds PostgreSQL 16 files
that 19 cannot open; it is no longer used and can be removed once you no longer need it as a
backup: `docker volume rm musicvoting_db_data`. To move data from 16 to 19, dump it with
`pg_dump --data-only --disable-triggers` from a 16 container and load it into the new database.

After a schema change, either recreate the dev DB (deletes all local data):

```shell script
cd musicvoting && docker compose down -v && docker compose up -d
```

or apply the new statements by hand.

**Rename `blacklist_entry` → `blocklist_entry`** (change `rename-blacklist-to-blocklist`,
2026-11-24). Needed once for every database that has a volume (local Docker,
`deployment/compose`, `deployment/server`); LeoCloud is rebuilt from the init script on
every start:

```shell script
docker exec -i musicvoting-db-1 psql -U musicvoting -d musicvoting \
  -c 'ALTER TABLE blacklist_entry RENAME TO blocklist_entry;'
```

## Party blocklist

The host can block words, artists and songs per party (`BlocklistResource`, all `@HostOnly`):

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/party/{partyId}/blocklist` | list entries |
| `POST` | `/api/party/{partyId}/blocklist` | add `{kind: WORD\|ARTIST\|TRACK, value, label?, imageUrl?}` (201 new, 200 duplicate, 400 invalid) |
| `DELETE` | `/api/party/{partyId}/blocklist/{entryId}` | remove an entry (204 / 404) |
| `GET` | `/api/party/{partyId}/blocklist/artists?q=` | Spotify artist search for the setup page |

All matching lives in `BlocklistService.Blocklist#isBlocked` (words match as whole words,
case-insensitive; artists by Spotify ID; songs by track URI). It is applied when a song is
added (`403 "Nicht erlaubt."`), during the auto-refill, and as a `blocked` flag on search
results.

The web guest search calls `GET /api/party/{partyId}/track/search?q=…&audience=guest`. In
that mode songs by a banned artist are removed from the results instead of flagged, and the
response gets `hiddenHint`: `ARTIST` (the query is a banned artist's name), `SOME` (other
songs were removed) or `null`. Without `audience=guest` (host search, iOS app) the response is
unchanged. Full API reference: `hugo/content/dev/api-reference.md`.

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
