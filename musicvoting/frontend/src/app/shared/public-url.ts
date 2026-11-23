/**
 * Public address of MusicVoting (LeoCloud). Used where the app tells people to open it on
 * another device ("Player auf anderem Gerät öffnen"): the current address would show
 * "localhost" during development and on the host's own machine (team decision 2026-11-23).
 * Change it here if the app moves to another domain.
 */
export const PUBLIC_APP_URL = 'https://it220241.cloud.htl-leonding.ac.at/';

/** The same address without protocol and trailing slash, short enough for a phone. */
export const PUBLIC_APP_HOST = new URL(PUBLIC_APP_URL).host;
