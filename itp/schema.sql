DROP TABLE IF EXISTS zaehlpunkte;
DROP TABLE IF EXISTS zaehlwerte;

CREATE TABLE zaehlpunkte
(
    zaehler_id    TEXT    not null,
    kunde_name    TEXT    not null,
    kunde_vorname TEXT    not null,
    plz           INTEGER not null,
    ort           TEXT    not null
);

CREATE TABLE zaehlwerte
(
    datum_zeit DATETIME not null,
    zaehler_id TEXT     not null,
    obis_180   REAL default 0.0,
    obis_170   REAL default 0.0,
    obis_280   REAL default 0.0,
    obis_270   REAL default 0.0
);

-- Add index to speed up querying
CREATE INDEX idx_zahler_datum ON zaehlwerte (datum_zeit, zaehler_id);
